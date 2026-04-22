import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  RETURNING_TOKEN_KEY,
  resolveReturningToken,
  shouldClearReturningToken,
} from "@/lib/returningToken";
import {
  peptideProfiles,
  type ReturningMatchSummary,
} from "../../../shared/scoring";

export type ReturningSession = {
  token: string;
  leadId?: string;
  createdAt?: Date | string;
  topMatches: ReturningMatchSummary[];
  justCompletedQuiz: boolean;
};

export type ReturningSessionStatus = "pending" | "restored" | "empty";

type LegacySessionPatch = Partial<{
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  results: {
    token: string;
    leadId: string;
    createdAt: Date | string;
    topMatches: ReturningMatchSummary[];
  } | null;
  justCompletedQuiz: boolean;
  error: string | null;
}>;

type ReturningLookupMatch =
  | ReturningMatchSummary
  | {
      slug?: string;
      name?: string;
      score?: number;
      matchPercent?: number;
    };

function normalizeReturningMatches(matches: unknown): ReturningMatchSummary[] {
  if (!Array.isArray(matches)) return [];

  return matches.flatMap((match) => {
    if (!match || typeof match !== "object") return [];

    const candidate = match as ReturningLookupMatch;

    if ("peptideId" in candidate && typeof candidate.peptideId === "string") {
      return [
        {
          peptideId: candidate.peptideId,
          name: candidate.name,
          description: candidate.description,
          categories: Array.isArray(candidate.categories) ? candidate.categories : [],
          matchPercent: candidate.matchPercent,
        },
      ];
    }

    const peptideId =
      "slug" in candidate && typeof candidate.slug === "string" ? candidate.slug : null;
    if (!peptideId) return [];

    const profile = peptideProfiles.find((entry) => entry.id === peptideId);

    return [
      {
        peptideId,
        name: candidate.name ?? profile?.name ?? peptideId,
        description: profile?.description ?? "",
        categories: profile?.categories ?? [],
        matchPercent:
          typeof candidate.matchPercent === "number" ? candidate.matchPercent : 0,
      },
    ];
  });
}

type UserSessionContextValue = {
  session: ReturningSession | null;
  isLoading: boolean;
  hasSettledHydration: boolean;
  sessionStatus: ReturningSessionStatus;
  isAuthenticated: boolean;
  token: string | null;
  results: {
    token: string;
    leadId: string;
    createdAt: Date | string;
    topMatches: ReturningMatchSummary[];
  } | null;
  justCompletedQuiz: boolean;
  error: string | null;
  seedReturningSession: (session: ReturningSession) => void;
  clearReturningSession: () => void;
  setSession: (patch: LegacySessionPatch) => void;
  resetSession: () => void;
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

export function UserSessionProvider({ children }: { children: React.ReactNode }) {
  const [resolvedToken, setResolvedToken] = useState<string | null>(null);
  const [session, setSession] = useState<ReturningSession | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasSettledHydration, setHasSettledHydration] = useState(false);
  const [urlToken, setUrlToken] = useState<string | null>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);

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
    const nextToken = resolveReturningToken(urlToken, existingToken);

    if (nextToken.shouldToastReplacement) {
      toast.success("Updated your saved results from the latest email link.");
    }

    if (nextToken.shouldPersistUrlToken && urlToken) {
      window.localStorage.setItem(RETURNING_TOKEN_KEY, urlToken);
    }

    setUrlToken(urlToken);
    setResolvedToken(nextToken.activeToken);
    setHasInitialized(true);
    setHasSettledHydration(!nextToken.activeToken);
  }, []);

  useEffect(() => {
    if (!returningResults.data || !resolvedToken) return;

    const normalizedMatches = normalizeReturningMatches(returningResults.data.topMatches);

    setSession({
      token: resolvedToken,
      leadId:
        "leadId" in returningResults.data &&
        typeof returningResults.data.leadId === "string"
          ? returningResults.data.leadId
          : undefined,
      createdAt:
        "createdAt" in returningResults.data
          ? (returningResults.data.createdAt as Date | string | undefined)
          : undefined,
      topMatches: normalizedMatches,
      justCompletedQuiz: false,
    });
    setLegacyError(null);

    if (urlToken && resolvedToken === urlToken) {
      clearTokenFromUrl();
      setUrlToken(null);
    }

    setHasSettledHydration(true);
  }, [resolvedToken, returningResults.data, urlToken]);

  useEffect(() => {
    if (!returningResults.error) return;

    if (!shouldClearReturningToken(returningResults.error)) {
      setLegacyError("Hydration failed");
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
    setHasSettledHydration(true);
    setLegacyError(null);
  }, [resolvedToken, returningResults.error, urlToken]);

  const value = useMemo<UserSessionContextValue>(
    () => ({
      session,
      isLoading: !hasInitialized || (Boolean(resolvedToken) && !hasSettledHydration),
      hasSettledHydration,
      sessionStatus: !hasInitialized || (Boolean(resolvedToken) && !hasSettledHydration)
        ? "pending"
        : session
          ? "restored"
          : "empty",
      isAuthenticated: Boolean(session),
      token: session?.token ?? resolvedToken,
      results: session
        ? {
            token: session.token,
            leadId: session.leadId ?? "",
            createdAt: session.createdAt ?? "",
            topMatches: session.topMatches,
          }
        : null,
      justCompletedQuiz: Boolean(session?.justCompletedQuiz),
      error: legacyError,
      seedReturningSession(nextSession) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(RETURNING_TOKEN_KEY, nextSession.token);
        }

        setResolvedToken(nextSession.token);
        setSession(nextSession);
        setHasSettledHydration(true);
        setLegacyError(null);
      },
      clearReturningSession() {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(RETURNING_TOKEN_KEY);
        }

        setResolvedToken(null);
        setUrlToken(null);
        setSession(null);
        setHasSettledHydration(true);
        setLegacyError(null);
      },
      setSession(patch) {
        if (patch.error !== undefined) {
          setLegacyError(patch.error);
        }

        if (patch.isLoading === false) {
          setHasInitialized(true);
        }

        if (patch.token !== undefined) {
          setResolvedToken(patch.token);
          if (typeof window !== "undefined") {
            if (patch.token) {
              window.localStorage.setItem(RETURNING_TOKEN_KEY, patch.token);
            } else {
              window.localStorage.removeItem(RETURNING_TOKEN_KEY);
            }
          }
        }

        if (patch.results !== undefined) {
          if (patch.results) {
            setSession({
              token: patch.results.token,
              leadId: patch.results.leadId,
              createdAt: patch.results.createdAt,
              topMatches: patch.results.topMatches,
              justCompletedQuiz: patch.justCompletedQuiz ?? false,
            });
            setHasSettledHydration(true);
          } else {
            setSession(null);
          }
        }
      },
      resetSession() {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(RETURNING_TOKEN_KEY);
        }

        setResolvedToken(null);
        setUrlToken(null);
        setSession(null);
        setHasSettledHydration(true);
        setLegacyError(null);
      },
    }),
    [hasInitialized, hasSettledHydration, legacyError, resolvedToken, session],
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

export const useUserSession = useReturningSession;
