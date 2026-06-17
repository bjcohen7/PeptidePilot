import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import { useExperimentEvent } from "@/contexts/ExperimentContext";
import { preloadProcessing, preloadResults } from "@/lib/preloadQuiz";

const STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

type Step = {
  type: "single" | "multi" | "select" | "inter" | "email";
  question?: string;
  subtitle?: string;
  options?: string[];
  interTitle?: string;
  interBody?: string;
  interIcon?: string;
  interIconBg?: string;
  interIconColor?: string;
};

const STEPS: Step[] = [
  { type: "single", question: "Which medication are you considering?", options: ["Semaglutide", "Tirzepatide", "Ozempic", "Wegovy", "Mounjaro", "Zepbound", "Not sure yet"], subtitle: "Not sure is fine — we'll help you compare." },
  { type: "single", question: "What's your main goal?", options: ["Lose 10–25 lb", "Lose 25–50 lb", "Lose 50+ lb", "Maintain / metabolic health"] },
  { type: "inter", interIcon: "✓", interIconBg: "var(--tint-mint)", interIconColor: "#138A5E", interTitle: "Nice — that helps", interBody: "Now let's find your best price. A few quick preferences and we'll line up vetted providers side by side. No medical forms — your provider handles that part." },
  { type: "single", question: "Have you taken a GLP-1 before?", options: ["No, I'm new to this", "Yes, I'm currently on one", "I took one previously"] },
  { type: "select", question: "Where will you receive your medication?", subtitle: "We detect your state from your location — confirm or change it. Providers are licensed by state, so we only show ones that serve you." },
  { type: "multi", question: "What matters most to you?", subtitle: "Select all that apply.", options: ["Lowest price", "Fast shipping", "Lots of support & check-ins", "Brand-name medication"] },
  { type: "multi", question: "How do you want to connect with a provider?", subtitle: "Select all that apply.", options: ["Messaging", "Video visits", "Phone"] },
  { type: "single", question: "How would you like to pay?", options: ["Lowest-cost compounded (cash-pay)", "Brand-name through insurance", "Not sure — show me both"] },
  { type: "inter", interIcon: "★", interIconBg: "var(--tint-lav)", interIconColor: "#6B4FD0", interTitle: "All set", interBody: "Your match is ready. We found vetted providers ready to see you this week." },
  { type: "email", question: "Where should we send your match?", subtitle: "Optional — we'll send your results & price-drop alerts." },
];

let qCount = 0;
for (const s of STEPS) { if (s.type !== "inter") qCount++; }

function StepIcon({ step }: { step: Step }) {
  if (step.type === "inter") {
    return <span className="ico" style={{ background: step.interIconBg, color: step.interIconColor }}>{step.interIcon}</span>;
  }
  return null;
}

export default function QuizFlow() {
  const [, navigate] = useLocation();
  const trackExp = useExperimentEvent();
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | number[] | string)[]>(STEPS.map(() => null));
  const [stateVal, setStateVal] = useState("New York");
  const [nameVal, setNameVal] = useState("");
  const [emailVal, setEmailVal] = useState("");
  const [animClass, setAnimClass] = useState("quiz-slide-enter-forward");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const dirRef = useRef<"forward" | "backward">("forward");
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) { startedRef.current = true; trackExp("quiz_start"); }
  }, [trackExp]);

  useEffect(() => {
    if (stepIdx > 0) trackExp("quiz_question", { question: stepIdx + 1 });
  }, [stepIdx, trackExp]);

  useEffect(() => { void preloadProcessing(); void preloadResults(); }, []);

  const advance = useCallback(() => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(i => i + 1);
    } else {
      trackExp("quiz_complete");
      const finalAnswers = [...answers];
      finalAnswers[STEPS.findIndex(s => s.type === "select")] = stateVal;
      const nameIdx = STEPS.findIndex(s => s.type === "email");
      if (nameVal || emailVal) {
        finalAnswers[nameIdx] = [nameVal || "", emailVal || ""];
      }
      sessionStorage.setItem("pp_quiz_answers", JSON.stringify(finalAnswers));
      sessionStorage.setItem("pp_quiz_email", emailVal || "");
      sessionStorage.setItem("pp_quiz_name", nameVal || "");
      navigate("/processing");
    }
  }, [stepIdx, answers, stateVal, nameVal, emailVal, navigate, trackExp]);

  const goBack = useCallback(() => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  }, [stepIdx]);

  const triggerAdvance = useCallback((dir: "forward" | "backward", fn: () => void) => {
    if (isTransitioning) return;
    dirRef.current = dir;
    setIsTransitioning(true);
    setAnimClass(dir === "forward" ? "quiz-slide-exit-forward" : "quiz-slide-exit-backward");
    setTimeout(() => { fn(); setIsTransitioning(false); setAnimClass(dir === "forward" ? "quiz-slide-enter-forward" : "quiz-slide-enter-backward"); }, 220);
  }, [isTransitioning]);

  const handleSingle = useCallback((idx: number) => {
    if (isTransitioning || answers[stepIdx] !== null) return;
    const next = [...answers]; next[stepIdx] = idx; setAnswers(next);
    setTimeout(() => triggerAdvance("forward", advance), 320);
  }, [isTransitioning, answers, stepIdx, triggerAdvance, advance]);

  const handleMultiToggle = useCallback((idx: number) => {
    if (isTransitioning) return;
    const current = (Array.isArray(answers[stepIdx]) ? answers[stepIdx] : []) as number[];
    const next = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
    const a = [...answers]; a[stepIdx] = next; setAnswers(a);
  }, [isTransitioning, answers, stepIdx]);

  const handleMultiContinue = useCallback(() => {
    const current = answers[stepIdx];
    if (!Array.isArray(current) || current.length === 0 || isTransitioning) return;
    triggerAdvance("forward", advance);
  }, [answers, stepIdx, isTransitioning, triggerAdvance, advance]);

  const skipToResults = useCallback(() => {
    trackExp("quiz_complete");
    const finalAnswers = [...answers];
    finalAnswers[STEPS.findIndex(s => s.type === "select")] = stateVal;
    sessionStorage.setItem("pp_quiz_answers", JSON.stringify(finalAnswers));
    navigate("/processing");
  }, [answers, stateVal, navigate, trackExp]);

  const step = STEPS[stepIdx];
  const qSoFar = STEPS.slice(0, stepIdx + 1).filter(s => s.type !== "inter").length;
  const multiSelection = Array.isArray(answers[stepIdx]) ? answers[stepIdx] as number[] : [];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <header className="border-b sticky top-0 z-40" style={{ borderColor: "var(--line)", background: "rgba(251,252,254,.95)", backdropFilter: "blur(12px)" }}>
        <div className="container">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center no-underline">
              <PeptidePilotLogo height={30} variant="dark" />
            </Link>
            {step.type !== "inter" && (
              <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>
                Question {qSoFar} of {qCount}
              </span>
            )}
          </div>
          {step.type !== "inter" && (
            <div className="h-1.5 -mx-[22px] sm:-mx-[22px]" style={{ background: "var(--secondary)" }}>
              <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${Math.round((qSoFar / qCount) * 100)}%`, background: "var(--grad-cta)" }} />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col py-8 sm:py-12 px-4 overflow-hidden" style={{ maxWidth: 600, margin: "30px auto", width: "100%" }}>
        <div key={stepIdx} className={`w-full ${animClass}`} style={{ animation: animClass.startsWith("quiz-slide-enter") ? animClass.replace("quiz-slide-", "") : "none" }}>

          {step.type === "inter" && (
            <div className="inter">
              <StepIcon step={step} />
              <span className="pp-eyebrow" style={{ justifyContent: "center", marginBottom: 18 }}>{step.interTitle}</span>
              <h2 style={{ fontSize: "1.6rem", marginBottom: 8 }}>{step.interTitle}</h2>
              <p style={{ color: "var(--ink-soft)", maxWidth: 400, margin: "0 auto 6px" }}>{step.interBody}</p>
              <div style={{ marginTop: 20 }}>
                <button className="pp-btn pp-btn-primary pp-btn-lg" onClick={() => triggerAdvance("forward", advance)}>Continue →</button>
              </div>
              <div style={{ marginTop: 10 }}>
                <button className="linkbtn" onClick={goBack} style={{ background: "none", border: "none", color: "var(--muted)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>← Back</button>
              </div>
            </div>
          )}

          {step.type === "single" && (
            <>
              <h2 style={{ fontSize: "1.7rem", marginBottom: 6 }}>{step.question}</h2>
              {step.subtitle && <p style={{ color: "var(--muted)", marginBottom: 18 }}>{step.subtitle}</p>}
              <div className="flex flex-col gap-[10px]" style={{ marginTop: 18 }}>
                {step.options.map((opt, i) => {
                  const sel = answers[stepIdx] === i;
                  return (
                    <div key={i} className={`qopt ${sel ? "sel" : ""}`} onClick={() => handleSingle(i)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && handleSingle(i)}>
                      {opt}
                      <span className="ck">✓</span>
                    </div>
                  );
                })}
              </div>
              {stepIdx > 0 && (
                <div style={{ marginTop: 22 }}>
                  <button className="linkbtn" onClick={goBack} style={{ background: "none", border: "none", color: "var(--muted)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>← Back</button>
                </div>
              )}
            </>
          )}

          {step.type === "multi" && (
            <>
              <h2 style={{ fontSize: "1.7rem", marginBottom: 6 }}>{step.question}</h2>
              {step.subtitle && <p style={{ color: "var(--muted)", marginBottom: 18 }}>{step.subtitle}</p>}
              <div className="flex flex-col gap-[10px]" style={{ marginTop: 18 }}>
                {step.options.map((opt, i) => (
                  <div key={i} className={`qopt ${multiSelection.includes(i) ? "sel" : ""}`} onClick={() => handleMultiToggle(i)} role="button" tabIndex={0} onKeyDown={e => e.key === "Enter" && handleMultiToggle(i)}>
                    {opt}
                    <span className="ck">✓</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 22 }} className="flex items-center justify-between">
                <button className="linkbtn" onClick={goBack} style={{ background: "none", border: "none", color: "var(--muted)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>← Back</button>
                <button
                  className="pp-btn pp-btn-primary"
                  onClick={handleMultiContinue}
                  disabled={multiSelection.length === 0 || isTransitioning}
                  style={{ opacity: multiSelection.length === 0 || isTransitioning ? 0.5 : 1 }}
                >
                  Continue →
                </button>
              </div>
            </>
          )}

          {step.type === "select" && (
            <>
              <h2 style={{ fontSize: "1.7rem", marginBottom: 6 }}>{step.question}</h2>
              {step.subtitle && <p style={{ color: "var(--muted)", marginBottom: 18 }}>{step.subtitle}</p>}
              <select
                value={stateVal}
                onChange={e => setStateVal(e.target.value)}
                className="qsel"
                style={{ width: "100%", padding: "14px 16px", border: "1.5px solid var(--line)", borderRadius: 14, font: "inherit", marginTop: 18 }}
              >
                <option value="">Select your state…</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="small" style={{ color: "var(--sky-deep)", marginTop: 10, fontSize: ".85rem" }}>📍 Detected from your location — change it anytime above.</p>
              <div style={{ marginTop: 22 }} className="flex items-center justify-between">
                <button className="linkbtn" onClick={goBack} style={{ background: "none", border: "none", color: "var(--muted)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>← Back</button>
                <button className="pp-btn pp-btn-primary" onClick={() => triggerAdvance("forward", advance)}>Continue</button>
              </div>
            </>
          )}

          {step.type === "email" && (
            <>
              <h2 style={{ fontSize: "1.7rem", marginBottom: 6 }}>{step.question} <span style={{ color: "var(--muted)", fontSize: "1rem", fontWeight: 400 }}>(optional)</span></h2>
              {step.subtitle && <p style={{ color: "var(--muted)", marginBottom: 18 }}>{step.subtitle}</p>}
              <div className="flex flex-col gap-[10px]" style={{ marginTop: 18 }}>
                <input
                  value={nameVal} onChange={e => setNameVal(e.target.value)}
                  placeholder="First name"
                  style={{ width: "100%", padding: "14px 16px", border: "1.5px solid var(--line)", borderRadius: 14, font: "inherit" }}
                />
                <input
                  value={emailVal} onChange={e => setEmailVal(e.target.value)}
                  type="email" placeholder="you@email.com"
                  style={{ width: "100%", padding: "14px 16px", border: "1.5px solid var(--line)", borderRadius: 14, font: "inherit", marginTop: 10 }}
                />
              </div>
              <div style={{ marginTop: 22 }} className="flex items-center justify-between">
                <button className="linkbtn" onClick={skipToResults} style={{ background: "none", border: "none", color: "var(--muted)", textDecoration: "underline", cursor: "pointer", font: "inherit" }}>Skip — show results</button>
                <button className="pp-btn pp-btn-primary pp-btn-lg" onClick={() => triggerAdvance("forward", advance)}>See my match →</button>
              </div>
            </>
          )}

        </div>
      </main>

      <footer className="border-t" style={{ borderColor: "var(--line)", background: "rgba(251,252,254,.95)" }}>
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <button onClick={goBack} disabled={stepIdx === 0 || isTransitioning} className="linkbtn" style={{ background: "none", border: "none", color: "var(--muted)", textDecoration: "underline", cursor: stepIdx === 0 ? "default" : "pointer", font: "inherit", opacity: stepIdx === 0 ? 0.3 : 1 }}>
              ← Back
            </button>

            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                if (s.type === "inter") return null;
                const answered = answers[i] !== null || (i === STEPS.findIndex(x => x.type === "select") && stateVal) || (i === STEPS.findIndex(x => x.type === "email"));
                const isActive = i === stepIdx;
                const qIdx = STEPS.slice(0, i + 1).filter(x => x.type !== "inter").length;
                return (
                  <div key={i}
                    className="rounded-full transition-all"
                    style={{
                      width: isActive ? 16 : 8,
                      height: 8,
                      background: isActive ? "var(--sky-deep)" : answered ? "var(--sky)" : "var(--line)"
                    }}
                  />
                );
              })}
            </div>

            <div style={{ width: 80 }} />
          </div>
        </div>
      </footer>
    </div>
  );
}
