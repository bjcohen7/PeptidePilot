import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuiz } from "@/contexts/QuizContext";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";

export default function Processing() {
  const [, navigate] = useLocation();
  const { state } = useQuiz();

  useEffect(() => {
    const hasAnswers = state.answers.some((a) => a !== null);
    if (!hasAnswers) {
      navigate("/quiz");
      return;
    }
    const timer = setTimeout(() => navigate("/results"), 1500);
    return () => clearTimeout(timer);
  }, [state.answers, navigate]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}
    >
      <div className="relative z-10 flex items-center justify-center px-4 pt-5 pb-4">
        <PeptidePilotLogo height={28} variant="light" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: "#38bdf8" }}
        />
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
          Processing your profile...
        </p>
      </div>
    </div>
  );
}
