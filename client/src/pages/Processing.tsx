import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { trackMetaCustomEvent } from "@/lib/metaPixel";

const QUIZ_STORAGE_KEY = "peptidepilot_quiz_state_v1";
const BMI_STORAGE_KEY = "peptidepilot_quiz_bmi_v1";

// Raw BMI-calculator inputs stashed by QuizFlow — attached to the submit meta so
// they're stored on the lead (never displayed back). Null/absent when skipped.
function readBmiInputs(): { heightIn?: number; weightLbs?: number } {
  try {
    const raw = sessionStorage.getItem(BMI_STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return typeof p?.heightIn === "number" && typeof p?.weightLbs === "number"
      ? { heightIn: p.heightIn, weightLbs: p.weightLbs }
      : {};
  } catch {
    return {};
  }
}

function sendFunnelEvent(event: string, data?: Record<string, unknown>) {
  const sessionId = getVisitorSessionId();
  const body = JSON.stringify({ sessionId, event, data: data ?? null });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/funnel-event", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/analytics/funnel-event", {
    method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true,
  }).catch(() => {});
}

export default function Processing() {
  const [, navigate] = useLocation();
  const [failsafe, setFailsafe] = useState(false);
  const publicIdRef = useRef<string | null>(null);
  const startedAt = useRef(Date.now());
  const calledRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationEndRef = useRef(false);

  const submitQuiz = trpc.quiz.submitQuiz.useMutation({
    onSuccess: (data) => {
      publicIdRef.current = data.publicId;
      sessionStorage.setItem("peptidepilot_last_public_id", data.publicId);
      sessionStorage.removeItem(QUIZ_STORAGE_KEY);

      const elapsed = Date.now() - startedAt.current;
      const remaining = Math.max(0, 2500 - elapsed);
      setTimeout(() => navigate(`/results/${data.publicId}`), remaining);

      sendFunnelEvent("ProcessingComplete", { leadId: data.leadId, publicId: data.publicId });
      trackMetaCustomEvent("ProcessingComplete", { leadId: data.leadId, publicId: data.publicId });
    },
    onError: () => {
      setMutationFailed(true);
      setFailsafe(true);
    },
  });

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const raw = sessionStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) {
      navigate("/quiz/flow");
      return;
    }
    let answers: (number | null)[];
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.isComplete || !Array.isArray(parsed.answers) || parsed.answers.every((a: number | null) => a === null)) {
        navigate("/quiz/flow");
        return;
      }
      answers = parsed.answers;
    } catch {
      navigate("/quiz/flow");
      return;
    }

    sendFunnelEvent("ProcessingStarted");
    trackMetaCustomEvent("ProcessingStarted", {});
    submitQuiz.mutate({
      answers: answers.map((a) => a ?? -1),
      sessionId: getVisitorSessionId(),
      meta: readBmiInputs(),
    });
  }, [navigate]);

  // 2.5s animation cap → 4s navigation watchdog → button at 6.5s total
  useEffect(() => {
    const animTimer = setTimeout(() => {
      animationEndRef.current = true;
      watchdogRef.current = setTimeout(() => {
        // 6.5s elapsed: if navigation hasn't happened, show failsafe
        setFailsafe(true);
      }, 4000);
    }, 2500);
    return () => {
      clearTimeout(animTimer);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  const handleManualProceed = () => {
    if (publicIdRef.current) {
      navigate(`/results/${publicIdRef.current}`);
      return;
    }
    const raw = sessionStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) {
      // No quiz state and no publicId — route to recovery path
      navigate("/results");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const answers = parsed.answers.map((a: number | null) => a ?? -1);
      submitQuiz.mutate({ answers, sessionId: getVisitorSessionId(), meta: readBmiInputs() });
    } catch {
      navigate("/results");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 relative" style={{ background: "var(--grad-hero)" }}>
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--sky-deep)" }} />
      <p style={{ color: "var(--muted)", fontSize: 13 }}>Preparing your match...</p>
      {failsafe && !submitQuiz.isPending && (
        <button
          onClick={handleManualProceed}
          style={{
            marginTop: 24,
            padding: "10px 24px",
            borderRadius: 8,
            background: "var(--sky-deep)",
            color: "#fff",
            fontSize: 14,
            border: "none",
            cursor: "pointer",
          }}
        >
          {publicIdRef.current ? "View My Results \u2192" : "Recover My Results"}
        </button>
      )}
    </div>
  );
}
