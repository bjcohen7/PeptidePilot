import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import ResultsCommercePage from "@/components/results/ResultsCommercePage";
import Glp1BridgePage from "@/components/bridge/Glp1BridgePage";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { useQuiz } from "@/contexts/QuizContext";
import { useReturningSession } from "@/contexts/UserSessionContext";
import { trpc } from "@/lib/trpc";
import {
  calculateMatches,
  libraryBackedPeptideProfileIds,
  toReturningMatchSummary,
  type ReturningMatchSummary,
} from "../../../shared/scoring";

const LIBRARY_BACKED_PROFILE_IDS = new Set<string>(libraryBackedPeptideProfileIds);

const GLP1_PROFILE_IDS = new Set<string>(["semaglutide"]);

function getLibraryBackedMatches(answers: (number | number[])[]) {
  return calculateMatches(answers).filter((result) =>
    LIBRARY_BACKED_PROFILE_IDS.has(result.peptide.id),
  );
}

export default function Results() {
  const [, navigate] = useLocation();
  const { state, reset } = useQuiz();
  const {
    session,
    isLoading: isReturningSessionLoading,
    sessionStatus,
    seedReturningSession,
  } =
    useReturningSession();
  const hasBootstrappedLeadRef = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [matches, setMatches] = useState<ReturningMatchSummary[]>([]);
  const [selectedPeptideId, setSelectedPeptideId] = useState("");

  const sessionId = getVisitorSessionId();
  const submitQuiz = trpc.quiz.submitQuiz.useMutation({
    onSuccess: (data) => {
      setLeadId(data.leadId);
      setMatches(data.returningResults);
      setRevealed(true);

      if (data.returningToken) {
        seedReturningSession({
          token: data.returningToken,
          leadId: data.leadId,
          createdAt: new Date(),
          topMatches: data.returningResults,
          justCompletedQuiz: true,
        });
      }
    },
    onError: (error) => {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    },
  });

  const hasFreshQuizState = state.isComplete || state.answers.some((answer) => answer !== null);
  const previewMatches = useMemo(
    () =>
      getLibraryBackedMatches(state.answers.map((answer) => answer ?? -1) as (number | number[])[]).map(
        toReturningMatchSummary,
      ),
    [state.answers],
  );
  const restoredMatches = session?.topMatches ?? [];
  const activeMatches =
    revealed && matches.length > 0
      ? matches
      : restoredMatches.length > 0
        ? restoredMatches
        : previewMatches;
  const activeLeadId = leadId || session?.leadId || "";

  const availablePeptideIds = trpc.affiliates.availablePeptideIds.useQuery(
    { peptideIds: activeMatches.map((match) => match.peptideId) },
    {
      enabled: activeMatches.length > 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (hasFreshQuizState) return;
    if (sessionStatus === "pending") return;
    if (sessionStatus === "restored") return;

    navigate("/quiz");
  }, [hasFreshQuizState, navigate, sessionStatus]);

  useEffect(() => {
    if (
      hasBootstrappedLeadRef.current ||
      submitQuiz.isPending ||
      !hasFreshQuizState ||
      sessionStatus === "pending" ||
      sessionStatus === "restored" ||
      previewMatches.length === 0
    ) {
      return;
    }

    hasBootstrappedLeadRef.current = true;
    submitQuiz.mutate({
      email: null,
      consentGiven: false,
      answers: state.answers.map((answer) => answer ?? -1) as (number | number[])[],
      sessionId,
      meta: {
        sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
      },
    });
  }, [
    hasFreshQuizState,
    previewMatches.length,
    sessionId,
    sessionStatus,
    state.answers,
    submitQuiz,
  ]);

  const displayMatches = useMemo(() => {
    if (!activeMatches.length) return [];
    if (!availablePeptideIds.data) return activeMatches;

    const coveredIds = new Set(availablePeptideIds.data);
    const coveredMatches = activeMatches.filter((match) => coveredIds.has(match.peptideId));

    return coveredMatches.length > 0 ? coveredMatches : activeMatches;
  }, [activeMatches, availablePeptideIds.data]);

  useEffect(() => {
    if (!displayMatches.length) return;

    setSelectedPeptideId((current) => {
      if (current && displayMatches.some((match) => match.peptideId === current)) {
        return current;
      }
      return displayMatches[0]!.peptideId;
    });
  }, [displayMatches]);

  const selectedMatch =
    displayMatches.find((match) => match.peptideId === selectedPeptideId) ?? displayMatches[0] ?? null;

  const [userDismissedBridge, setUserDismissedBridge] = useState(false);
  const isGlp1Match = selectedMatch !== null && GLP1_PROFILE_IDS.has(selectedMatch.peptideId);
  const showBridge = isGlp1Match && !userDismissedBridge;

  const handleRetake = () => {
    reset();
    navigate("/quiz");
  };

  if (!hasFreshQuizState && isReturningSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-6 text-center text-[#4a5b58]">
        Loading your saved results…
      </div>
    );
  }

  if (selectedMatch && displayMatches.length > 0) {
    if (showBridge) {
      return (
        <Glp1BridgePage
          matchName={selectedMatch.name}
          matchPercent={selectedMatch.matchPercent}
          onSkipToProviders={() => setUserDismissedBridge(true)}
        />
      );
    }

    return (
      <ResultsCommercePage
        matches={displayMatches}
        selectedMatch={selectedMatch}
        onRetake={handleRetake}
        onSelectMatch={setSelectedPeptideId}
        leadId={activeLeadId}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-6 text-center text-[#4a5b58]">
      Preparing your results…
    </div>
  );
}
