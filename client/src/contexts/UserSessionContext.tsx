import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { ReturningMatchSummary } from "../../../shared/scoring";

const RETURNING_TOKEN_KEY = "peptidepilot_returning_token";

export type ReturningSession = {
  token: string;
  leadId: string;
  createdAt: Date | string;
  topMatches: ReturningMatchSummary[];
  justCompletedQuiz: boolean;
};

type UserSessionContextValue = {
  session: ReturningSession | null;
  isLoading: boolean;
  seedReturningSession: (session: ReturningSession) => void;
  clearReturningSession: () => void;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

function getTokenFromUrl() {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  return url.searchParams.get("token");
}

function clearTokenFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has("token")) return;

  url.searchParams.delete("token");
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

function isNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { data?: { code?: string }; shape?: { data?: { code?: string } } };
  return candidate.data?.code === "NOT_FOUND" || candidate.shape?.data?.code === "NOT_FOUND";
}

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);
  const [session, setSession] = useState<ReturningSession | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [urlToken, setUrlToken] = useState<string | null>(null);

  const returningResults = trpc.quiz.getReturningResultsByToken.useQuery(
    { token: resolvedToken ?? "" },
    {
      enabled: Boolean(resolvedToken),
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const existingToken = window.localStorage.getItem(RETURNING_TOKEN_KEY);
    const urlToken = getTokenFromUrl();
    const nextToken = urlToken ?? existingToken;

    if (urlToken && existingToken && existingToken !== urlToken) {
      toast.success("Updated your saved results from the latest email link.");
    }

    if (urlToken) {
      window.localStorage.setItem(RETURNING_TOKEN_KEY, urlToken);
    }

    setUrlToken(urlToken);
    setResolvedToken(nextToken);
    setHasInitialized(true);
  }, []);

  useEffect(() => {
    if (!returningResults.data || !resolvedToken) return;

    setSession({
      token: resolvedToken,
      leadId: returningResults.data.leadId,
      createdAt: returningResults.data.createdAt,
      topMatches: returningResults.data.topMatches,
      justCompletedQuiz: false,
    });

    if (urlToken && resolvedToken === urlToken) {
      clearTokenFromUrl();
      setUrlToken(null);
    }
  }, [resolvedToken, returningResults.data, urlToken]);

  useEffect(() => {
    if (!returningResults.error) return;

    if (!isNotFoundError(returningResults.error)) {
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(RETURNING_TOKEN_KEY);
    }

    if (urlToken && resolvedToken === urlToken) {
      clearTokenFromUrl();
      setUrlToken(null);
    }

    setResolvedToken(null);
    setSession(null);
  }, [resolvedToken, returningResults.error, urlToken]);

  const value = useMemo<UserSessionContextValue>(
    () => ({
      session,
      isLoading: !hasInitialized || (Boolean(resolvedToken) && returningResults.isLoading),
      seedReturningSession(nextSession) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(RETURNING_TOKEN_KEY, nextSession.token);
        }

        setResolvedToken(nextSession.token);
        setSession(nextSession);
      },
      clearReturningSession() {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(RETURNING_TOKEN_KEY);
        }

        setResolvedToken(null);
        setUrlToken(null);
        setSession(null);
      },
    }),
    [hasInitialized, resolvedToken, returningResults.isLoading, session],
  );

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
}

export function useReturningSession() {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error("useReturningSession must be used within UserSessionProvider");
  }

  return context;
}
