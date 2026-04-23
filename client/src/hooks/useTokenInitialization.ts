import { useEffect, useRef } from "react";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { useUserSession } from "@/contexts/UserSessionContext";
import { trpc } from "@/lib/trpc";

const TOKEN_STORAGE_KEY = "peptidepilot_returning_token";

type TelemetryPayload = {
  event:
    | "token_hydration_attempted"
    | "token_hydration_succeeded"
    | "token_hydration_failed"
    | "token_invalid_or_expired"
    | "token_replaced_by_url";
  token?: string | null;
  tokenSource?: "url" | "localStorage" | null;
  reason?: string | null;
};

function getUrlToken() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("token");
}

function clearUrlToken() {
  if (typeof window === "undefined") return;

  const searchParams = new URLSearchParams(window.location.search);
  if (!searchParams.has("token")) return;

  searchParams.delete("token");
  const nextSearch = searchParams.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    data?: { code?: string };
    shape?: { data?: { code?: string } };
  };

  return candidate.data?.code ?? candidate.shape?.data?.code ?? null;
}

export function useTokenInitialization() {
  const { setSession, resetSession } = useUserSession();
  const hasInitializedRef = useRef(false);
  const hasCandidateToken =
    typeof window !== "undefined" &&
    Boolean(getUrlToken() || window.localStorage.getItem(TOKEN_STORAGE_KEY));
  const flagsQuery = trpc.config.getFeatureFlags.useQuery(undefined, {
    enabled: hasCandidateToken,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const telemetry = trpc.config.logTelemetry.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (!hasCandidateToken) {
      hasInitializedRef.current = true;
      return;
    }

    if (flagsQuery.isLoading) return;

    if (flagsQuery.error || !flagsQuery.data?.ENABLE_RETURNING_USER_RECOGNITION) {
      hasInitializedRef.current = true;
      return;
    }

    hasInitializedRef.current = true;

    const logTelemetry = (input: TelemetryPayload) => {
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
      const urlToken = getUrlToken();
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
          results: {
            ...results,
            token: results.token ?? activeToken,
            createdAt:
              "createdAt" in results && (typeof results.createdAt === "string" || results.createdAt instanceof Date)
                ? results.createdAt
                : new Date().toISOString(),
          },
          justCompletedQuiz: false,
          error: null,
        });

        if (urlToken && activeToken === urlToken) {
          clearUrlToken();
        }

        logTelemetry({
          event: "token_hydration_succeeded",
          token: activeToken,
          tokenSource,
        });
      } catch (error) {
        const isNotFound = getErrorCode(error) === "NOT_FOUND";

        if (isNotFound) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          if (urlToken && activeToken === urlToken) {
            clearUrlToken();
          }
        }

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
  }, [
    flagsQuery.data,
    flagsQuery.error,
    flagsQuery.isLoading,
    hasCandidateToken,
    resetSession,
    setSession,
    telemetry,
    utils,
  ]);
}
