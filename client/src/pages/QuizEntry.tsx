import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, ShieldCheck, Zap } from "lucide-react";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import { QUIZ_QUESTIONS, peptideProfiles } from "../../../shared/scoring";

const STEPS = [
  { number: "01", label: `Answer ${QUIZ_QUESTIONS.length} targeted questions`, sub: "Across 8 biological domains" },
  { number: "02", label: "We analyze your biology", sub: `Matched against ${peptideProfiles.length} peptide profiles` },
  { number: "03", label: "Receive your personalized protocol", sub: "Ranked by compatibility with your goals" },
];

export default function QuizEntry() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}
    >
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 500, height: 500, top: "-15%", left: "-10%",
            background: "radial-gradient(circle, #38bdf81a, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 400, height: 400, bottom: "-10%", right: "-5%",
            background: "radial-gradient(circle, #0d94881a, transparent 70%)",
          }}
        />
      </div>

      {/* Minimal header */}
      <header className="relative z-10 flex items-center justify-center px-4 pt-5 pb-4">
        <Link href="/">
          <PeptidePilotLogo height={30} variant="light" />
        </Link>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-8 sm:py-12 px-4">
        <div className="w-full max-w-lg text-center">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-widest uppercase mb-7"
            style={{ background: "rgba(56,189,248,0.12)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.25)" }}
          >
            <Zap className="w-3.5 h-3.5" />
            Free · 5 Minutes · Science-Backed
          </div>

          <h1
            className="text-white mb-4 leading-snug"
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontFamily: "'DM Serif Display', Georgia, serif",
              letterSpacing: "-0.02em",
            }}
          >
            Discover your peptide match.
          </h1>

          <p
            className="mb-10 mx-auto leading-relaxed"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: "clamp(0.95rem, 2.5vw, 1.1rem)",
              maxWidth: 440,
              lineHeight: 1.75,
            }}
          >
            20 questions. 8 biological domains. A personalized protocol built around your unique biology, goals, and lifestyle.
          </p>

          {/* Steps */}
          <div className="mb-10 space-y-3 text-left max-w-sm mx-auto">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex items-center gap-4 rounded-xl px-4 py-3.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span
                  className="font-bold text-sm flex-shrink-0 w-8 text-center"
                  style={{ color: "#38bdf8", fontFamily: "'DM Serif Display', serif" }}
                >
                  {step.number}
                </span>
                <div>
                  <p className="text-white text-sm font-semibold leading-snug">{step.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{step.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link href="/quiz/flow">
            <Button
              size="lg"
              className="w-full sm:w-auto font-semibold text-base px-12 rounded-xl border-0 text-white hover:opacity-90 active:scale-[0.99] transition-all shadow-lg"
              style={{
                height: "54px",
                background: "linear-gradient(135deg, #38bdf8, #0d9488)",
                boxShadow: "0 8px 32px rgba(56,189,248,0.25)",
              }}
            >
              Begin My Assessment
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>

          {/* Trust micro-copy */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Takes ~5 minutes
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Private &amp; secure
            </div>
          </div>

          <p className="text-xs mt-4 max-w-xs mx-auto leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>
            Your responses are private and used solely to generate your personalized peptide recommendations.
          </p>
        </div>
      </main>
    </div>
  );
}
