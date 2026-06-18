import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, BadgeCheck, Star, CheckCircle2 } from "lucide-react";
import Seo from "@/components/Seo";
import { preloadQuizExperience } from "@/lib/preloadQuiz";

const SITE_URL = "https://www.peptidepilot.me";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Independent & unbiased" },
  { icon: BadgeCheck, label: "Licensed US providers" },
  { icon: Star, label: "Free, no email to start" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Take the quiz",
    description: "Answer 8 quick questions about what you're looking for — no medical history, no symptom log. Takes about 90 seconds.",
  },
  {
    step: "02",
    title: "Get your match",
    description: "We surface vetted GLP-1 providers ranked by your preferences — price, shipping, support style, and more.",
  },
  {
    step: "03",
    title: "Compare & choose",
    description: "See side-by-side pricing, plans, and real patient notes. Pick the provider that fits you, no commitment required.",
  },
];

export default function Home() {
  useEffect(() => {
    const preload = () => { preloadQuizExperience(); };
    if (typeof window === "undefined") return;
    if ("requestIdleCallback" in window) {
      const idleHandle = window.requestIdleCallback(preload, { timeout: 1200 });
      return () => { window.cancelIdleCallback(idleHandle); };
    }
    const timeoutHandle = setTimeout(preload, 350);
    return () => clearTimeout(timeoutHandle);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--ink)" }}>
      <Seo
        title="PeptidePilot — Compare GLP-1 providers. Find your best price."
        description="Compare vetted GLP-1 providers side by side. Answer 8 quick questions, see real prices, and start with a licensed provider — all from your couch."
        path="/"
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PeptidePilot",
          description: "Compare vetted GLP-1 providers side by side. Answer 8 quick questions, see real prices, and start with a licensed provider.",
          url: `${SITE_URL}/`,
        }}
      />

      {/* Hero */}
      <section className="pp-hero">
        <div className="container relative py-16 sm:py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ background: "var(--tint-mint)", border: "1px solid var(--mint)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--mint-deep)" }} />
            Compare vetted GLP-1 providers — not medical advice
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight mb-5 max-w-3xl mx-auto" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.02em" }}>
            Find your best-price GLP-1 provider in minutes
          </h1>

          <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2" style={{ color: "var(--ink-soft)" }}>
            Answer 8 quick preference questions. We&rsquo;ll match you with vetted licensed providers and show real prices side by side. No medical forms, no email required.
          </p>

          <Link href="/quiz/flow">
            <button
              className="pp-btn pp-btn-primary pp-btn-lg"
              onMouseEnter={() => preloadQuizExperience()}
              onFocus={() => preloadQuizExperience()}
              onTouchStart={() => preloadQuizExperience()}
            >
              Start the quiz
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8">
            {TRUST_BADGES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--sky-deep)" }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof banner */}
      <section className="py-4 sm:py-5" style={{ background: "var(--secondary)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-10 text-sm" style={{ color: "var(--muted)" }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--mint-deep)" }} />
              <span><strong style={{ color: "var(--ink)" }}>8 questions</strong>, not a medical intake</span>
            </div>
            <div className="hidden sm:block w-px h-4" style={{ background: "var(--line)" }} />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--mint-deep)" }} />
              <span>Compare <strong style={{ color: "var(--ink)" }}>real prices</strong> side by side</span>
            </div>
            <div className="hidden sm:block w-px h-4" style={{ background: "var(--line)" }} />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--mint-deep)" }} />
              <span>Connected to <strong style={{ color: "var(--ink)" }}>licensed providers</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 sm:py-20" style={{ background: "var(--background)" }}>
        <div className="container">
          <div className="text-center mb-10 sm:mb-14">
            <span className="pp-eyebrow" style={{ justifyContent: "center", margin: "0 auto 16px" }}>How it works</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.02em" }}>
              Your match in 3 steps
            </h2>
            <p className="max-w-xl mx-auto text-sm sm:text-base px-2" style={{ color: "var(--muted)" }}>
              No guesswork. No paid placements. A short quiz, an honest match, and a path to a real licensed provider.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {HOW_IT_WORKS.map(({ step, title, description }, i) => (
              <div key={step} className="relative text-center group">
                <div className="hidden sm:block absolute top-8 left-1/2 w-full h-px -z-0" style={{ background: "var(--line)" }} />
                <div className="relative z-10">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-lg group-hover:scale-105 transition-transform" style={{ background: "var(--grad-cta)" }}>
                    <span className="text-lg sm:text-xl font-bold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>{step}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-2" style={{ color: "var(--ink)" }}>{title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{description}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="sm:hidden flex justify-center mt-4 mb-2">
                    <ArrowRight className="w-5 h-5 rotate-90" style={{ color: "var(--muted)", opacity: 0.4 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10 sm:mt-12">
            <Link href="/quiz/flow">
              <button className="pp-btn pp-btn-primary pp-btn-lg" onMouseEnter={() => preloadQuizExperience()} onFocus={() => preloadQuizExperience()} onTouchStart={() => preloadQuizExperience()}>
                Start the quiz
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why PeptidePilot */}
      <section className="py-14 sm:py-20" style={{ background: "var(--secondary)" }}>
        <div className="container max-w-3xl text-center">
          <span className="pp-eyebrow" style={{ justifyContent: "center", margin: "0 auto 16px" }}>Why PeptidePilot</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-5" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.02em" }}>
            We don&rsquo;t sell anything
          </h2>
          <p className="text-base sm:text-lg leading-relaxed mb-8 px-2" style={{ color: "var(--ink-soft)" }}>
            Unlike many platforms that funnel you toward their own products, PeptidePilot is an independent comparison service. We don&rsquo;t manufacture, prescribe, or sell medication. We just help you find the right provider.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-left">
            {[
              { title: "Independent", body: "We don't take payments for placement. Rankings are based on your preferences, not kickbacks." },
              { title: "Transparent pricing", body: "Every price you see is real. No hidden fees, no surprise markups." },
              { title: "Licensed only", body: "Every provider we list requires board-certified clinicians and licensed US pharmacies." },
            ].map(({ title, body }) => (
              <div key={title} className="pp-card pp-card-pad">
                <CheckCircle2 className="w-5 h-5 mb-3" style={{ color: "var(--mint-deep)" }} />
                <h4 className="font-semibold text-sm mb-1.5" style={{ color: "var(--ink)" }}>{title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-14 sm:py-20" style={{ background: "var(--ink)" }}>
        <div className="container text-center" style={{ color: "#E8EDF5" }}>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: "-0.02em", color: "#fff" }}>
            Ready to find your match?
          </h2>
          <p className="text-base sm:text-lg mb-7 sm:mb-8 max-w-lg mx-auto px-2" style={{ color: "#B6C2D6" }}>
            Take 90 seconds. Compare vetted GLP-1 providers side by side. Completely free.
          </p>
          <Link href="/quiz/flow">
            <button
              className="pp-btn pp-btn-primary pp-btn-lg"
              onMouseEnter={() => preloadQuizExperience()}
              onFocus={() => preloadQuizExperience()}
              onTouchStart={() => preloadQuizExperience()}
            >
              Take the quiz
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
