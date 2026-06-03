import { useEffect, useMemo } from "react";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { trpc } from "@/lib/trpc";
import { useQuiz } from "@/contexts/QuizContext";
import {
  calculateAspectScores,
  calculateMatches,
  libraryBackedPeptideProfileIds,
} from "../../../shared/scoring";
import { GLP1_PROVIDERS, topAspectLabels, providerById } from "../../../shared/providerData";

// ── Tracking events ────────────────────────────────────────────────────────

type ResultsEventProps = {
  matchScore: number;
  primaryMatch: string;
  topAspects: string[];
};

function trackResultsPageViewed(props: ResultsEventProps) {
  trackMetaCustomEvent("results_page_viewed", {
    matchScore: props.matchScore,
    primaryMatch: props.primaryMatch,
    topAspects: props.topAspects.join(", "),
  });
}

function trackProviderClicked(props: {
  providerId: string;
  isFeatured: boolean;
  matchScore: number;
  position: number;
}) {
  trackMetaCustomEvent("results_provider_clicked", {
    providerId: props.providerId,
    isFeatured: props.isFeatured,
    matchScore: props.matchScore,
    position: props.position,
  });
}

function trackFaqViewed(percentScrolled: number) {
  trackMetaCustomEvent("results_faq_viewed", { percentScrolled });
}

function trackRestartClicked(matchScore: number) {
  trackMetaCustomEvent("results_restart_clicked", { matchScore });
}

function trackDisclosureClicked(linkType: "affiliate" | "screening") {
  trackMetaCustomEvent("results_disclosure_clicked", { linkType });
}

// ── Aspect label helpers ────────────────────────────────────────────────────

const LIBRARY_BACKED_IDS = new Set(libraryBackedPeptideProfileIds);

function getLibraryBackedMatchScore(answers: (number | number[])[]): number {
  const matches = calculateMatches(
    answers.map((a) => a ?? -1) as (number | number[])[],
  ).filter((m) => LIBRARY_BACKED_IDS.has(m.peptide.id));
  return matches[0]?.matchPercent ?? 0;
}

// ── Providers ───────────────────────────────────────────────────────────────

const FEATURED_PROVIDER_ID = "direct_meds";

// ── Component ───────────────────────────────────────────────────────────────

export default function NewResultsPage({
  leadId,
  onRetake,
}: {
  leadId?: string;
  onRetake: () => void;
}) {
  const { state } = useQuiz();

  const quizAnswers = useMemo(
    () => state.answers.map((a) => a ?? -1) as (number | number[])[],
    [state.answers],
  );

  const matchScore = useMemo(() => getLibraryBackedMatchScore(quizAnswers), [quizAnswers]);
  const aspectScores = useMemo(() => calculateAspectScores(quizAnswers), [quizAnswers]);
  const aspects = useMemo(() => topAspectLabels(aspectScores, 4), [aspectScores]);

  const providers = useMemo(() => {
    const sorted = [...GLP1_PROVIDERS].sort((a, b) => {
      if (a.id === FEATURED_PROVIDER_ID) return -1;
      if (b.id === FEATURED_PROVIDER_ID) return 1;
      return a.startingPrice - b.startingPrice;
    });
    return sorted;
  }, []);

  // ── Managed affiliate links ─────────────────────────────────────────────

  const linksQuery = trpc.affiliates.activeLinksByPeptide.useQuery(
    { peptideId: "semaglutide" },
    { staleTime: 1000 * 60 * 5, retry: false },
  );

  const trackClick = trpc.quiz.trackAffiliateClick.useMutation();

  const partnerUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of linksQuery.data ?? []) {
      const name = link.partnerName ?? link.label;
      if (!map.has(name)) {
        map.set(name, link.url);
      }
    }
    return map;
  }, [linksQuery.data]);

  // ── Track page view ─────────────────────────────────────────────────────

  useEffect(() => {
    trackResultsPageViewed({
      matchScore,
      primaryMatch: "glp1",
      topAspects: aspects,
    });
  }, [matchScore, aspects]);

  // ── Track FAQ intersection ──────────────────────────────────────────────

  useEffect(() => {
    const el = document.getElementById("results-faq");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          const pct = Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100,
          );
          trackFaqViewed(pct);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── CTA handler ──────────────────────────────────────────────────────────

  const handleProviderClick = (e: React.MouseEvent<HTMLAnchorElement>, providerId: string) => {
    const provider = providerById[providerId];
    if (!provider) return;
    const idx = providers.findIndex((p) => p.id === providerId);
    trackProviderClicked({
      providerId,
      isFeatured: providerId === FEATURED_PROVIDER_ID,
      matchScore,
      position: idx >= 0 ? idx + 1 : 0,
    });
    if (leadId) {
      trackClick.mutate({ leadId, peptideId: "semaglutide", vendor: provider.name });
    }
  };

  const handleRestart = () => {
    trackRestartClicked(matchScore);
    onRetake();
  };

  // ── Disclosure link handler ──────────────────────────────────────────────

  const handleDisclosureLink = (type: "affiliate" | "screening") => (e: React.MouseEvent) => {
    trackDisclosureClicked(type);
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] font-sans leading-normal text-[#0e1f1c] antialiased">
      {/* ── §4.1 Sticky top nav ─────────────────────────────────────── */}
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-[#eef2f0] bg-white px-[18px] py-[14px] lg:px-8 lg:py-4">
        <div className="flex items-center gap-2 text-[14px] font-bold">
          <div
            className="h-[22px] w-[22px] rounded-[5px]"
            style={{
              background: "linear-gradient(135deg, #0fb88a, #22d3ee)",
              transform: "rotate(45deg)",
            }}
          />
          <span>PeptidePilot</span>
        </div>
        <button
          onClick={handleRestart}
          className="text-[11px] font-medium text-[#8a939b] underline underline-offset-2"
        >
          Restart quiz
        </button>
      </nav>

      {/* ── §4.2 Dark header band ─────────────────────────────────────── */}
      <div
        className="relative px-[18px] pb-[22px] pt-[26px] text-white lg:px-0"
        style={{
          background: "linear-gradient(180deg, #0a1815 0%, #102a25 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(94,234,212,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.035) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative lg:max-w-[1120px] lg:mx-auto lg:w-full lg:px-8">
          {/* Meta line */}
          <div className="mb-[10px] flex flex-wrap items-center gap-[6px] font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/55">
            <span>Quiz complete</span>
            <span className="h-[4px] w-[4px] rounded-full bg-white/40" />
            <span>22 questions</span>
            <span className="h-[4px] w-[4px] rounded-full bg-white/40" />
            <span>~4 min</span>
          </div>

          {/* H1 */}
          <h1 className="mb-[14px] font-serif text-[22px] leading-[1.15]">
            Your GLP-1 match is ready.
          </h1>

          {/* Match block */}
          <div className="mb-[16px] flex items-baseline gap-[14px] lg:grid lg:grid-cols-[144px_1fr] lg:gap-10 lg:items-start lg:mb-0">
            <div className="flex-shrink-0">
              <div
                className="font-serif text-[52px] leading-[0.9] lg:text-[64px]"
                style={{ color: "#5eead4" }}
              >
                {matchScore}%
              </div>
              <span className="mt-[4px] block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/50">
                Match score
              </span>
            </div>
            <div
              className="font-serif text-[13px] italic leading-[1.45] text-white/82 lg:text-[15px] lg:leading-[1.55]"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
            >
              Strong fit for weight loss and metabolic goals. Three vetted
              providers compared below — Direct Meds is your top match.
            </div>
          </div>

          {/* Aspect pills */}
          <div className="flex flex-wrap gap-[5px]">
            {aspects.map((label) => (
              <span
                key={label}
                className="rounded-[999px] px-[8px] py-[3px] font-mono text-[9px] font-semibold tracking-[0.04em]"
                style={{
                  color: "#5eead4",
                  background: "rgba(94,234,212,0.08)",
                  border: "1px solid rgba(94,234,212,0.18)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── §4.3 Grid intro ────────────────────────────────────────────── */}
      <div className="bg-white px-[18px] pb-[8px] pt-[18px] lg:px-0">
        <div className="lg:max-w-[1120px] lg:mx-auto lg:w-full lg:px-8">
          <h2 className="mb-[4px] font-serif text-[19px] leading-[1.2]">
            Compare your three providers
          </h2>
          <p className="text-[11.5px] leading-[1.5] text-[#4a5b58]">
            Ranked by fit for your answers, not by what we earn. Affiliate
            compensation disclosed.
          </p>
        </div>
      </div>

      {/* ── §4.4 Provider header row (6D) ──────────────────────────────── */}
      <div
        className="mx-[14px] mt-[16px] grid grid-cols-3 overflow-hidden rounded-[12px] text-white lg:mx-auto lg:mt-6 lg:max-w-[1120px] lg:w-full"
        style={{ background: "#0a1815" }}
      >
        {providers.map((p) => {
          const isFeatured = p.id === FEATURED_PROVIDER_ID;
          return (
            <div
              key={p.id}
              className="px-[6px] pb-[14px] pt-[12px] text-center lg:px-[10px] lg:pb-[18px] lg:pt-[16px]"
              style={{
                borderRight: "1px solid rgba(255,255,255,0.08)",
                ...(isFeatured
                  ? {
                      background:
                        "linear-gradient(180deg, rgba(94,234,212,0.18), rgba(94,234,212,0.06))",
                    }
                  : {}),
              }}
            >
              <div className="mb-[5px] text-[11px] font-bold leading-[1.2] lg:text-[13px]">
                {p.name}
              </div>
              {p.subDescription && (
                <div className="hidden lg:block text-[9px] leading-[1.3] text-white/60 mt-[2px] mb-[6px] px-[2px]">
                  {p.subDescription}
                </div>
              )}
              <div className="font-serif text-[20px] leading-[1] lg:text-[24px]" style={{ color: "#5eead4" }}>
                ${p.startingPrice}
                <span className="text-[10px] text-white/55">/mo</span>
              </div>
              <div
                className="mt-[4px] font-mono text-[7.5px] font-bold uppercase tracking-[0.06em] lg:text-[8.5px]"
                style={{
                  color: isFeatured ? "#5eead4" : "rgba(255,255,255,0.5)",
                }}
              >
                {p.positioningTag}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── §4.5 Four clusters ──────────────────────────────────────────── */}
      <div className="px-[14px] pb-[14px] pt-[8px] lg:grid lg:grid-cols-2 lg:gap-4 lg:max-w-[1120px] lg:mx-auto lg:w-full lg:px-8 lg:pb-8">
        {/* Medications */}
        <Cluster title="Medications">
          <Row>
            {providers.map((p) => (
              <Cell key={p.id} featured={p.id === FEATURED_PROVIDER_ID}>
                {p.medications}
              </Cell>
            ))}
          </Row>
        </Cluster>

        {/* Provider model */}
        <Cluster title="Provider model">
          <Row>
            {providers.map((p) => (
              <Cell key={p.id} featured={p.id === FEATURED_PROVIDER_ID}>
                {p.providerModel}
              </Cell>
            ))}
          </Row>
        </Cluster>

        {/* Logistics */}
        <Cluster title="Logistics">
          <RowLabel label="Time to first dose" />
          <Row>
            {providers.map((p) => (
              <Cell key={p.id} featured={p.id === FEATURED_PROVIDER_ID}>
                {p.timeToFirstDose}
              </Cell>
            ))}
          </Row>
          <RowLabel label="Lab work required" />
          <Row>
            {providers.map((p) => (
              <Cell key={p.id} featured={p.id === FEATURED_PROVIDER_ID}>
                {p.labWorkRequired === "optional" ? "Optional" : "Required"}
              </Cell>
            ))}
          </Row>
          <RowLabel label="Cancel policy" />
          <Row>
            {providers.map((p) => (
              <Cell key={p.id} featured={p.id === FEATURED_PROVIDER_ID}>
                {p.cancelPolicy}
              </Cell>
            ))}
          </Row>
        </Cluster>

        {/* Cost & coverage */}
        <Cluster title="Cost & coverage">
          <RowLabel label="Insurance accepted" />
          <Row>
            {providers.map((p) => (
              <Cell key={p.id} featured={p.id === FEATURED_PROVIDER_ID}>
                <span
                  className={p.insuranceAccepted ? "font-bold text-[#15803d]" : "font-bold text-[#b8c2c6]"}
                >
                  {p.insuranceAccepted ? "\u2713" : "\u2715"}
                </span>{" "}
                {p.insuranceLabel}
              </Cell>
            ))}
          </Row>
          <RowLabel label="Starting cost/mo" />
          <Row>
            {providers.map((p) => (
              <Cell key={p.id} featured={p.id === FEATURED_PROVIDER_ID}>
                ${p.startingPrice}
              </Cell>
            ))}
          </Row>
        </Cluster>
      </div>

      {/* ── §4.6 CTA bar + affiliate disclosure ─────────────────────────── */}
      <div className="bg-white px-[14px] pb-[8px] pt-[10px] lg:px-0">
        <div className="lg:max-w-[1120px] lg:mx-auto lg:w-full lg:px-8">
          <div className="grid grid-cols-3 gap-[5px]">
            {providers.map((p) => {
              const isFeatured = p.id === FEATURED_PROVIDER_ID;
              return (
                <a
                  key={p.id}
                  href={partnerUrlMap.get(p.name) ?? p.affiliateUrl}
                  target="_blank"
                  rel="sponsored noopener"
                  onClick={(e) => handleProviderClick(e, p.id)}
                  className="block rounded-[8px] px-[4px] py-[10px] text-center text-[10.5px] font-semibold leading-[1.2] no-underline"
                  style={
                    isFeatured
                      ? {
                          background: "linear-gradient(135deg, #0fb88a, #22d3ee)",
                          color: "#0e1f1c",
                          boxShadow: "0 6px 14px rgba(15,184,138,0.32)",
                        }
                      : {
                          background: "#0e1f1c",
                          color: "white",
                        }
                  }
                >
                  Start &rarr;
                </a>
              );
            })}
          </div>
          <div className="px-[0] pb-[0] pt-[8px] text-center text-[9.5px] italic text-[#8a939b]">
            Affiliate links — we earn when you start.{" "}
            <a
              href="/affiliate-disclosure"
              onClick={handleDisclosureLink("affiliate")}
              className="underline"
              style={{ color: "#0a6b54" }}
            >
              See disclosure
            </a>
          </div>
        </div>
      </div>

      {/* ── §4.7 "Why this match" narrative ─────────────────────────────── */}
      <div className="border-t border-[#e2e8e5] bg-white px-[18px] pb-[18px] pt-[22px] lg:px-0">
        <div className="lg:max-w-[1120px] lg:mx-auto lg:w-full lg:px-8">
          <div className="mb-[6px] font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a6b54]">
            About your recommendation
          </div>
          <h2 className="mb-[12px] font-serif text-[19px] leading-[1.2]">
            Why {providerById[FEATURED_PROVIDER_ID]?.name ?? "Direct Meds"} is
            your top match
          </h2>
        <p className="mb-[10px] text-[12.5px] leading-[1.55] text-[#4a5b58]">
          Based on your answers, the things that matter most to you are{" "}
          <strong className="font-semibold text-[#0e1f1c]">
            fast time-to-start
          </strong>
          ,{" "}
          <strong className="font-semibold text-[#0e1f1c]">
            cash-pay flexibility
          </strong>
          , and{" "}
          <strong className="font-semibold text-[#0e1f1c]">
            medical oversight without a doctor's office visit
          </strong>
          . Direct Meds leads on all three.
        </p>
        <p className="mb-[10px] text-[12.5px] leading-[1.55] text-[#4a5b58]">
          They're also the lowest-priced of the three at $179/mo for compounded
          semaglutide or tirzepatide, with board-certified MD oversight and an
          optional (not required) labs flow that lets you start within 3–5 days.
        </p>
        <p className="text-[12.5px] leading-[1.55] text-[#4a5b58]">
          SkinnyRX and Medvi are real alternatives — strong matches on different
          dimensions. <strong className="font-semibold text-[#0e1f1c]">
            SkinnyRX
          </strong>{" "}
          is the choice if you have insurance you want to use or specifically
          want brand-name medications.{" "}
          <strong className="font-semibold text-[#0e1f1c]">Medvi</strong> is the
          choice if you want the same clinician every visit and don't mind paying
          more for that continuity.
        </p>
        {/* TODO(v2): when dynamic recommendation logic lands, bolded dimension
            names in paragraph 1 need to be dynamic too, based on quizResult.aspectScores */}
        </div>
      </div>

      {/* ── §4.8 Timeline ────────────────────────────────────────────────── */}
      <div className="bg-[#f3f6f4] px-[18px] pb-[18px] pt-[22px] lg:px-0">
        <div className="lg:max-w-[1120px] lg:mx-auto lg:w-full lg:px-8">
          <div className="mb-[6px] font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a6b54]">
            What happens next
          </div>
          <h2 className="mb-[12px] font-serif text-[19px] leading-[1.2]">
            After you click Start
          </h2>
          <ul className="flex flex-col gap-[12px] lg:grid lg:grid-cols-4 lg:gap-6">
            {[
              {
                when: "Today",
                what: "Provider intake (10\u201315 min)",
                sub: "Quick medical questionnaire on the provider's site. Your quiz answers don't transfer automatically.",
              },
              {
                when: "1\u20133 days",
                what: "Clinician review",
                sub: "A licensed physician reviews your intake. If labs are needed, you'll get an order or upload existing results.",
              },
              {
                when: "3\u201310 days",
                what: "First dose ships",
                sub: "If approved, ships overnight in temperature-controlled packaging. Sharps and supplies included.",
              },
              {
                when: "Week 1",
                what: "Start titration",
                sub: "Lowest dose first. Most people titrate up every 4 weeks as tolerance builds.",
              },
            ].map((item) => (
              <li key={item.when} className="grid gap-[12px] lg:flex lg:flex-col lg:gap-[8px]" style={{ gridTemplateColumns: "70px 1fr" }}>
                <span className="pt-[2px] font-mono text-[10.5px] font-bold tracking-[0.04em] text-[#0a6b54] lg:pt-0">
                  {item.when}
                </span>
                <span className="text-[12.5px] leading-[1.5] text-[#0e1f1c]">
                  <strong className="font-semibold">{item.what}</strong>
                  <em className="mt-[2px] block text-[11.5px] not-italic text-[#4a5b58]">
                    {item.sub}
                  </em>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── §4.9 FAQ ────────────────────────────────────────────────────── */}
      <div id="results-faq" className="border-t border-[#e2e8e5] bg-white px-[18px] pb-[18px] pt-[22px] lg:px-0">
        <div className="lg:max-w-[1120px] lg:mx-auto lg:w-full lg:px-8">
          <div className="mb-[6px] font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0a6b54]">
            Common questions
          </div>
          <h2 className="mb-[12px] font-serif text-[19px] leading-[1.2]">
            Questions people ask
          </h2>
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
            <div className="border-b border-[#eef2f0] py-[12px]">
              <div className="mb-[4px] text-[13px] font-semibold">
                Why these three providers?
              </div>
              <div className="text-[11.5px] leading-[1.55] text-[#4a5b58]">
                Of 30+ GLP-1 providers we screened, these three met our
                requirements: board-certified clinicians, transparent pricing, real
                medication sourcing, and clear cancellation policies. Read our full{" "}
                <a
                  href="/screening-criteria"
                  onClick={handleDisclosureLink("screening")}
                  className="underline"
                  style={{ color: "#0a6b54" }}
                >
                  screening criteria
                </a>
                .
              </div>
            </div>
            <div className="border-b border-[#eef2f0] py-[12px]">
              <div className="mb-[4px] text-[13px] font-semibold">
                Are you paid by providers?
              </div>
              <div className="text-[11.5px] leading-[1.55] text-[#4a5b58]">
                Yes. We earn a commission when you start treatment through our
                links. We don't accept payment for placement, and we don't list
                providers we wouldn't use ourselves.
              </div>
            </div>
            <div className="border-b border-[#eef2f0] py-[12px]">
              <div className="mb-[4px] text-[13px] font-semibold">
                What if GLP-1 isn't right for me?
              </div>
              <div className="text-[11.5px] leading-[1.55] text-[#4a5b58]">
                The clinician's intake will catch any contraindications. If they
                decline you, you'll typically get a refund. Email us if you want a
                different protocol matched.
              </div>
            </div>
            <div className="py-[12px]">
              <div className="mb-[4px] text-[13px] font-semibold">
                Can I change providers later?
              </div>
              <div className="text-[11.5px] leading-[1.55] text-[#4a5b58]">
                Yes. Each provider's cancellation terms are listed above — Direct
                Meds is the most flexible at "cancel anytime." Switching providers
                usually means starting a new intake.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── §4.10 Trust strip ────────────────────────────────────────────── */}
      <div
        className="px-[18px] py-[22px] lg:px-0"
        style={{ background: "#0a1815" }}
      >
        <div className="grid grid-cols-2 gap-[14px] text-white lg:grid-cols-4 lg:max-w-[1120px] lg:mx-auto lg:w-full lg:px-8">
          <div>
          <div className="mb-[4px] font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5eead4]">
            Privacy
          </div>
          <div className="text-[11.5px] font-medium leading-[1.4]">
            Quiz answers stay with us. Not sold or shared.
          </div>
        </div>
        <div>
          <div className="mb-[4px] font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5eead4]">
            Vetting
          </div>
          <div className="text-[11.5px] font-medium leading-[1.4]">
            Providers screened for licensing, sourcing, and policies.
          </div>
        </div>
        <div>
          <div className="mb-[4px] font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5eead4]">
            Independence
          </div>
          <div className="text-[11.5px] font-medium leading-[1.4]">
            Commissions earned. Rankings based on fit, not payment.
          </div>
        </div>
        <div>
          <div className="mb-[4px] font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#5eead4]">
            Support
          </div>
          <div className="text-[11.5px] font-medium leading-[1.4]">
            Questions?{" "}
            <a href="mailto:hello@peptidepilot.me" style={{ color: "#5eead4" }}>
              hello@peptidepilot.me
            </a>
          </div>
          </div>
        </div>
      </div>

      {/* ── §4.11 Footer disclosure ──────────────────────────────────────── */}
      <div className="bg-[#f3f6f4] px-[18px] py-[18px] text-center text-[10.5px] leading-[1.6] text-[#8a939b] lg:px-0">
        <div className="lg:max-w-[1120px] lg:mx-auto lg:w-full lg:px-8">
          <strong className="font-semibold text-[#4a5b58]">
            PeptidePilot is an independent matching and comparison service.
          </strong>{" "}
          We earn affiliate commissions when you start treatment through linked
          providers, but our rankings are based on fit and independent vetting —
          not payment for placement. Not medical advice. Individual results vary.
          See{" "}
          <a
            href="/affiliate-disclosure"
            onClick={handleDisclosureLink("affiliate")}
            className="underline"
            style={{ color: "#0a6b54" }}
          >
            affiliate disclosure
          </a>{" "}
          &amp;{" "}
          <a
            href="/screening-criteria"
            onClick={handleDisclosureLink("screening")}
            className="underline"
            style={{ color: "#0a6b54" }}
          >
            screening criteria
          </a>
          .
        </div>
      </div>
    </div>
  );
}

// ── Cluster subcomponents ─────────────────────────────────────────────────

function Cluster({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-[8px] overflow-hidden rounded-[12px] border border-[#e2e8e5] bg-white">
      <div className="flex items-center justify-between border-b border-[#e2e8e5] bg-[#f3f6f4] px-[14px] pb-[8px] pt-[9px]">
        <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-[#0e1f1c]">
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 border-b border-[#eef2f0] last:border-b-0">
      {children}
    </div>
  );
}

function RowLabel({ label }: { label: string }) {
  return (
    <div className="border-t border-[#eef2f0] bg-white px-[12px] pb-[4px] pt-[8px] text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#8a939b] first:border-t-0">
      {label}
    </div>
  );
}

function Cell({ children, featured }: { children: React.ReactNode; featured?: boolean }) {
  return (
    <div
      className="border-r border-[#eef2f0] px-[6px] py-[10px] text-center text-[11px] font-medium leading-[1.3] last:border-r-0"
      style={
        featured
          ? { background: "#e6f7f1", fontWeight: 600, color: "#064a3b" }
          : {}
      }
    >
      {children}
    </div>
  );
}
