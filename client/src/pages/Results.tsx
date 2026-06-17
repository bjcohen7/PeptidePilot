import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import NewResultsPage from "@/pages/NewResultsPage";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { useExperimentEvent } from "@/contexts/ExperimentContext";
import { trpc } from "@/lib/trpc";

export default function Results() {
  const [, navigate] = useLocation();
  const trackExp = useExperimentEvent();
  const [leadId, setLeadId] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [hasData, setHasData] = useState(false);
  const hasBootstrappedLeadRef = useRef(false);
  const sessionId = getVisitorSessionId();

  const submitQuiz = trpc.quiz.submitQuiz.useMutation({
    onSuccess: (data) => {
      setLeadId(data.leadId);
      setRevealed(true);
      trackExp("results_view");
      setHasData(true);
    },
    onError: (error) => {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    },
  });

  useEffect(() => {
    const raw = sessionStorage.getItem("pp_quiz_answers");
    if (!raw) { navigate("/quiz/flow"); return; }

    if (hasBootstrappedLeadRef.current || submitQuiz.isPending) return;
    hasBootstrappedLeadRef.current = true;

    const allAnswers = JSON.parse(raw) as unknown[];
    const email = sessionStorage.getItem("pp_quiz_email") || "";

    // Strip non-numeric answers (e.g. the name/email tuple) before sending
    const numericAnswers = allAnswers.filter((a): a is number | number[] =>
      typeof a === "number" || (Array.isArray(a) && a.every((v) => typeof v === "number")),
    );

    submitQuiz.mutate({
      email: email || null,
      consentGiven: Boolean(email),
      answers: numericAnswers,
      sessionId,
      meta: { sourceUrl: typeof window !== "undefined" ? window.location.href : undefined },
    });
  }, [sessionId, submitQuiz, navigate]);

  if (revealed || hasData) {
    return <NewResultsPage leadId={leadId} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center" style={{ background: "var(--background)", color: "var(--muted)" }}>
      Preparing your results...
    </div>
  );
}
