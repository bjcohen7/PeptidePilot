import { useEffect, useRef } from "react";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { useUserSession } from "@/contexts/UserSessionContext";
import { trpc } from "@/lib/trpc";

const TOKEN_STORAGE_KEY = "peptidepilot_returning_token";

type TelemetryEvent = Parameters<typeof trpc.config.logTelemetry.useMutation>[0];

export function useTokenInitialization() {
  const { setSession, resetSession } = useUserSession();
  const hasInitializedRef = useRef(false);
  const flagsQuery = trpc.config.getFeatureFlags.useQuery(undefined, {
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const telemetry = trpc.config.logTelemetry.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (flagsQuery.isLoading) return;

    if (flagsQuery.error || !flagsQuery.data?.ENABLE_RETURNING_USER_RECOGNITION) {
      hasInitializedRef.current = true;
      return;
    }

    hasInitializedRef.current = true;

    const logTelemetry = (input: {
      event: "token_hydration_attempted" | "token_hydration_succeeded" | "token_hydration_failed" | "token_invalid_or_expired" | "token_replaced_by_url";
      token?: string | null;
      tokenSource?: "url" | "localStorage" | null;
      reason?: string | null;
    }) => {
      telemetry.mutate(
        {
          event: input.event,
          token: input.token ?? null,
          tokenSource: input.tokenSource ?? null,
          reason: input.reason ?? null,
          path: typeof window !== "undefined" ? window.location.pathname : null,
          sessionId: typeof window !== "undefined" ? getVisitorSessionId() : null,
        },
        {
          onError: () => {
            // Phase 1 telemetry is best-effort only.
          },
        },
      );
    };

    const initialize = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const urlToken = searchParams.get("token");
      const localToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

      let activeToken = localToken;
      let tokenSource: "url" | "localStorage" | null = localToken ? "localStorage" : null;

      if (urlToken) {
        if (urlToken !== localToken) {
          window.localStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
          logTelemetry({
            event: "token_replaced_by_url",
            token: urlToken,
            tokenSource: "url",
          });
        }

        activeToken = urlToken;
        tokenSource = "url";
        searchParams.delete("token");
        const nextSearch = searchParams.toString();
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
        window.history.replaceState({}, "", nextUrl);
      }

      if (!activeToken) {
        return;
      }

      setSession({ isLoading: true, error: null });
      logTelemetry({
        event: "token_hydration_attempted",
        token: activeToken,
        tokenSource,
      });

      try {
        const results = await utils.quiz.getReturningResultsByToken.fetch({ token: activeToken });

        setSession({
          isAuthenticated: true,
          isLoading: false,
          token: activeToken,
          results,
          justCompletedQuiz: false,
          error: null,
        });

        logTelemetry({
          event: "token_hydration_succeeded",
          token: activeToken,
          tokenSource,
        });
      } catch (error) {
        const isNotFound =
          typeof error === "object" &&
          error !== null &&
          "data" in error &&
          typeof (error as { data?: { code?: string } }).data?.code === "string" &&
          (error as { data?: { code?: string } }).data?.code === "NOT_FOUND";

        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        resetSession();

        logTelemetry({
          event: isNotFound ? "token_invalid_or_expired" : "token_hydration_failed",
          token: activeToken,
          tokenSource,
          reason: error instanceof Error ? error.message : "unknown",
        });
      }
    };

    void initialize();
  }, [flagsQuery.data, flagsQuery.error, flagsQuery.isLoading, resetSession, setSession, telemetry, utils]);
}
