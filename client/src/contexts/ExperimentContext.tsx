import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { getVisitorSessionId } from "@/components/SessionTracker";
import type { VariantConfig } from "../../../drizzle/schema";

type Assignment = {
  slug: string;
  experimentId: number;
  variant: {
    id: number;
    name: string;
    label: string;
    config: VariantConfig;
  };
};

type ExperimentContextValue = {
  assignments: Record<string, Assignment>;
  isLoading: boolean;
  track: (event: string, meta?: Record<string, unknown>) => void;
};

const ExperimentContext = createContext<ExperimentContextValue>({
  assignments: {},
  isLoading: true,
  track: () => {},
});

export function ExperimentProvider({ children }: { children: React.ReactNode }) {
  const sessionId = useMemo(() => getVisitorSessionId(), []);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [isLoading, setIsLoading] = useState(true);

  const { data } = trpc.experiments.getAssignments.useQuery(
    { sessionId },
    {
      enabled: Boolean(sessionId),
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 30,
    },
  );

  const eventBuffer = useRef<{
    sessionId: string;
    experimentId: number;
    variantId: number;
    event: string;
    page?: string | null;
    meta?: Record<string, unknown> | null;
  }[]>([]);
  const flushTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackEvents = trpc.experiments.trackEvents.useMutation();

  const flush = useCallback(() => {
    if (!eventBuffer.current.length) return;
    const batch = eventBuffer.current.splice(0);
    trackEvents.mutate(batch);
  }, [trackEvents]);

  useEffect(() => {
    if (!data) return;
    const map: Record<string, Assignment> = {};
    for (const a of data as unknown as Assignment[]) {
      map[a.slug] = a;
    }
    setAssignments(map);
    setIsLoading(false);
  }, [data]);

  useEffect(() => {
    flushTimer.current = setInterval(flush, 5000);
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (flushTimer.current) clearInterval(flushTimer.current);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, [flush]);

  const track = useCallback((event: string, meta?: Record<string, unknown>) => {
    const asgns = Object.values(assignments);
    if (!asgns.length) return;

    for (const a of asgns) {
      eventBuffer.current.push({
        sessionId,
        experimentId: a.experimentId,
        variantId: a.variant.id,
        event,
        page: typeof window !== "undefined" ? window.location.pathname : null,
        meta: meta ?? null,
      });
    }
  }, [assignments, sessionId]);

  const value = useMemo(() => ({ assignments, isLoading, track }), [assignments, isLoading, track]);

  return (
    <ExperimentContext.Provider value={value}>
      {children}
    </ExperimentContext.Provider>
  );
}

export function useVariant(slug: string): Assignment | null {
  const ctx = useContext(ExperimentContext);
  return ctx.assignments[slug] ?? null;
}

export function useExperimentEvent() {
  const ctx = useContext(ExperimentContext);
  return ctx.track;
}

export default ExperimentContext;
