import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ShieldCheck, FlaskConical, BadgeCheck, ArrowRight } from "lucide-react";
import Seo from "@/components/Seo";
import { SiteDisclosure } from "@/components/SiteDisclosure";
import { preloadQuizExperience } from "@/lib/preloadQuiz";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { QUIZ_MINUTES } from "@shared/quizConfig";
import { resolveBridgeHeadline, DEFAULT_BRIDGE_HEADLINE } from "@/lib/bridgeHeadlines";

const SITE_URL = "https://www.peptidepilot.me";

// Proof points — peptide→GLP-1 framing, trial-attributed (no outcome promises),
// licensed-provider reassurance.
const PROOF_POINTS = [
  {
    icon: FlaskConical,
    text: "Semaglutide and tirzepatide are peptides — the ones with large-scale clinical trials behind them, not hype.",
  },
  {
    icon: BadgeCheck,
    text: "In major published trials, GLP-1 therapy produced substantial average weight loss over time. Individual results depend on you and your provider.",
  },
  {
    icon: ShieldCheck,
    text: "Licensed US providers. No insurance needed. You choose whether to start.",
  },
];

export default function Match() {
  // UTM-aware hero. SSR/prerender uses the default; on the client we resolve
  // from the URL. Initialized in useState so the client's first paint already
  // has the right variant (createRoot re-renders — no hydration mismatch).
  const [headline, setHeadline] = useState(DEFAULT_BRIDGE_HEADLINE);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const resolved = resolveBridgeHeadline(params.get("utm_content"), params.get("utm_campaign"));
    setHeadline(resolved);
    setSearch(window.location.search || "");
    // Bridge view event (pixel PageView is fired app-wide by SessionTracker).
    trackMetaCustomEvent("bridge_view", {
      headline_variant: resolved.token,
      utm_content: params.get("utm_content"),
      utm_campaign: params.get("utm_campaign"),
    });
    preloadQuizExperience();
  }, []);

  // Carry UTMs through to the quiz so the lead/session keep attribution.
  const quizHref = useMemo(() => (search ? `/quiz${search}` : "/quiz"), [search]);

  const onCtaClick = () => {
    trackMetaCustomEvent("bridge_cta_click", { headline_variant: headline.token });
  };

  const Cta = ({ id }: { id: string }) => (
    <Link
      href={quizHref}
      id={id}
      onClick={onCtaClick}
      onMouseEnter={() => preloadQuizExperience()}
      onTouchStart={() => preloadQuizExperience()}
      className="block w-full rounded-2xl text-center font-bold text-white no-underline"
      style={{ background: "var(--accent)", padding: "16px 24px", fontSize: "1.05rem" }}
    >
      See if you match — free {QUIZ_MINUTES}-minute quiz
      <ArrowRight className="inline-block ml-2 w-4 h-4" style={{ verticalAlign: "-2px" }} />
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <Seo
        title="Peptides for Weight Loss — Start With the One That's Clinically Proven"
        description="Semaglutide and tirzepatide are the peptides with large-scale clinical trials behind them. Take a free 4-minute quiz and see which licensed GLP-1 provider fits your body and budget."
        path="/match"
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Peptides for Weight Loss | PeptidePilot",
          url: `${SITE_URL}/match`,
        }}
      />

      {/* Single focused viewport — hero + subline + 3 checks + CTA fit at 375px */}
      <main className="flex-1 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-[560px] px-5 py-8 sm:py-12">
          {/* Brand mark (no site nav) */}
          <div className="mb-6 text-center">
            <span className="text-sm font-bold tracking-tight" style={{ color: "var(--ink)" }}>PeptidePilot</span>
          </div>

          <h1
            className="text-center font-normal leading-tight mb-3"
            style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.9rem", color: "var(--ink)" }}
          >
            {headline.headline}
          </h1>

          <p className="text-center text-[0.98rem] leading-relaxed mb-6" style={{ color: "var(--muted-foreground)" }}>
            {headline.subline}
          </p>

          <ul className="space-y-3 mb-7">
            {PROOF_POINTS.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded-full"
                  style={{ width: 28, height: 28, background: "color-mix(in oklab, var(--accent) 14%, transparent)" }}
                >
                  <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
                </span>
                <span className="text-[0.92rem] leading-snug" style={{ color: "var(--ink)" }}>{text}</span>
              </li>
            ))}
          </ul>

          <Cta id="bridge-cta-primary" />
          <p className="text-center text-xs mt-2.5" style={{ color: "var(--muted-foreground)" }}>
            About {QUIZ_MINUTES} minutes · no insurance · licensed US providers
          </p>

          {/* Second CTA (repeated once, per spec) */}
          <div className="mt-8">
            <Cta id="bridge-cta-secondary" />
          </div>
        </div>
      </main>

      <footer className="px-5 py-6" style={{ borderTop: "1px solid var(--line)" }}>
        <SiteDisclosure className="max-w-[560px] mx-auto text-center text-[11px] leading-relaxed" style={{ color: "var(--muted-foreground)" }} />
      </footer>
    </div>
  );
}
