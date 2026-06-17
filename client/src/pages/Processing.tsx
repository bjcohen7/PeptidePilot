import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Processing() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const answers = sessionStorage.getItem("pp_quiz_answers");
    if (!answers) {
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
