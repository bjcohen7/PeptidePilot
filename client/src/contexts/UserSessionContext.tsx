import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
export type ReturningUserPayload = RouterOutputs["quiz"]["getReturningResultsByToken"];

export interface UserSessionState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  results: ReturningUserPayload | null;
  justCompletedQuiz: boolean;
  error: string | null;
}

interface UserSessionContextType extends UserSessionState {
  setSession: (partial: Partial<UserSessionState>) => void;
  resetSession: () => void;
}

const defaultState: UserSessionState = {
  isAuthenticated: false,
  isLoading: false,
  token: null,
  results: null,
  justCompletedQuiz: false,
  error: null,
};

const UserSessionContext = createContext<UserSessionContextType | null>(null);

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserSessionState>(defaultState);

  const value = useMemo<UserSessionContextType>(
    () => ({
      ...state,
      setSession: (partial) => setState((current) => ({ ...current, ...partial })),
      resetSession: () => setState(defaultState),
    }),
    [state],
  );

  return <UserSessionContext.Provider value={value}>{children}</UserSessionContext.Provider>;
}

export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error("useUserSession must be used within UserSessionProvider");
  }

  return context;
}
