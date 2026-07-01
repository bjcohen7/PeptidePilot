import { useEffect } from "react";
import { useLocation } from "wouter";

const QUIZ_STORAGE_KEY = "peptidepilot_quiz_state_v1";

export default function Processing() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const raw = sessionStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) {
      navigate("/quiz/flow");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.isComplete || !Array.isArray(parsed.answers) || parsed.answers.every((a: number | null) => a === null)) {
        navigate("/quiz/flow");
        return;
      }
    } catch {
      navigate("/quiz/flow");
      return;
    }
    const timer = setTimeout(() => navigate("/results"), 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--grad-hero)" }}>
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--sky-deep)" }} />
      <p style={{ color: "var(--muted)", fontSize: 13 }}>Preparing your match...</p>
    </div>
  );
}
