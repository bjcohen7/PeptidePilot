import { useEffect, useMemo, useRef, useState } from "react";
import { matchPercentFromFitScore, shouldDisplayMatchPercent } from "@shared/matchDisplay";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { SiteDisclosure } from "@/components/SiteDisclosure";

/**
 * Protocol-Briefing results page (RESULTS_PAGE_MODE=briefing, default).
 * Visuals follow Ben's pixel-perfect spec (2026-08-04): 680px column on warm
 * off-white #f9f9f7, serif-400 headings, mono chapter labels, mint stat cells,
 * teal/rust comparison bars (IO scroll-in), 3-tier spacing rhythm with chapter
 * dividers, dark near-black CTAs, sticky footer CTA that slides up past the
 * metrics table. Scoped under .pbx.
 *
 * Honest-machine substitutions (binding, unchanged):
 *  - Sticky/CTA match % is the REAL computed percent (floor-gated) — never the
 *    spec's example "88%". Promo code renders ONLY from providers.promo_code
 *    (+ GALA_PROMO_TERMS); unset = hidden. PILOT30 was never issued.
 *  - "Intake code" theater → real publicId short-ref + permanence line.
 *  - Tesamorelin out; combination therapy lives in the consult questions.
 *  - Phase targets labeled "Typical range (clinical trials):", computed from
 *    the lead's real weight vs STEP/SURMOUNT (4–6% wk8, 10–14% wk28, 13–20% 12mo).
 *  - Stat strip renders only provided answers; stale-price whyMatch rows
 *    filtered; two-path bars labeled illustrative — the only printed number is
 *    the cited 25–40% lean-mass range.
 */

type ProviderMatch = { slug: string; displayName: string; fitScore: number; whyMatch: string[] };
type ProviderDetail = {
  slug: string;
  displayName: string;
  priceFromCents: number | null;
  promoCode: string | null;
  shipDaysEstimate: number | null;
  complianceNote: string | null;
};

const PBX_CSS = `
body:has(.pbx) { background:#f9f9f7; }
.pbx {
  --bg:#f9f9f7; --card:#ffffff; --mint:#edf3f0; --mint-line:#dbe7e1;
  --ink:#0b0b0b; --body:#333333; --muted:#666666; --soft:#555555;
  --line:#e0e0dc; --line-soft:#ececea; --card-line:#e8e8e4;
  --teal:#5b9e8f; --rust:#c06a45; --code-bg:#f0f0ec; --dark:#2a2a2a; --cta-green:#0F7466;
  --serif:Georgia,"Freight Text Pro","Iowan Old Style",serif;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
  --mono:ui-monospace,"SF Mono","Cascadia Mono",Menlo,Consolas,monospace;
  background:var(--bg); color:var(--body); font-family:var(--sans);
  font-size:1.0625rem; line-height:1.6; -webkit-font-smoothing:antialiased;
  min-height:100vh; padding-bottom:7rem;
}
.pbx * { box-sizing:border-box; }
.pbx .wrap { max-width:680px; margin:0 auto; padding:0 1.5rem; }

/* type */
.pbx h1, .pbx h2 { font-family:var(--serif); font-weight:400; color:var(--ink); letter-spacing:normal; text-wrap:balance; margin:0; }
.pbx h1 { font-size:clamp(2.1rem,6.5vw,2.625rem); line-height:1.15; }
.pbx h2 { font-size:clamp(1.75rem,5vw,2.125rem); line-height:1.2; }
.pbx h3 { font-family:var(--sans); font-weight:600; font-size:1.1875rem; line-height:1.35; color:var(--ink); margin:0; }
.pbx p { margin:0; }
.pbx strong { font-weight:650; color:inherit; }
.pbx .label { font-family:var(--mono); font-size:.71875rem; font-weight:400; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); margin:0 0 .625rem; }
.pbx .lede { font-size:1.125rem; line-height:1.6; color:var(--body); }
.pbx .small { font-size:.9375rem; line-height:1.5; color:var(--body); }
.pbx .fine { font-size:.75rem; line-height:1.5; color:var(--muted); }
.pbx .snippet { font-family:var(--mono); font-size:.8125rem; background:var(--code-bg); color:var(--soft); padding:.5rem .75rem; border-radius:4px; display:inline-block; max-width:100%; }

/* 3-tier rhythm: tier-1 = 1.125rem within groups, tier-2 = 2.25rem between
   sub-sections, tier-3 = 4.5rem chapter gap with the divider centered */
.pbx .chapter { padding:2.25rem 0; border-top:1px solid var(--line); display:flex; flex-direction:column; gap:2.25rem; }
.pbx .chapter.hero { border-top:none; padding-top:3rem; }
.pbx .group { display:flex; flex-direction:column; gap:1.125rem; }
.pbx .chapter-head { display:flex; flex-direction:column; gap:0; }

/* masthead */
.pbx .masthead { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; padding:1.25rem 0 1rem; font-family:var(--mono); font-size:.6875rem; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); border-bottom:1px solid var(--line); }
.pbx .masthead b { color:var(--ink); font-weight:600; }

/* stat strip */
.pbx .readout { display:grid; grid-template-columns:repeat(auto-fit,minmax(7.5rem,1fr)); gap:1px; background:var(--mint-line); border:1px solid var(--mint-line); border-radius:7px; overflow:hidden; }
.pbx .readout > div { background:var(--mint); padding:1rem; display:flex; flex-direction:column; gap:.25rem; }
.pbx .readout dt { font-family:var(--mono); font-size:.65625rem; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
.pbx .readout dd { margin:0; font-size:1.875rem; font-weight:600; line-height:1.1; color:var(--ink); font-variant-numeric:tabular-nums; }
.pbx .readout dd span { font-size:.875rem; font-weight:400; color:var(--muted); }
.pbx .readout dd.txt { font-size:.9375rem; font-weight:500; line-height:1.35; padding-top:.2rem; }

/* checks */
.pbx .checks { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.625rem; }
.pbx .checks li { display:flex; gap:.6rem; font-size:.9375rem; line-height:1.5; }
.pbx .checks li::before { content:""; width:.4rem; height:.4rem; border-radius:50%; background:var(--teal); flex-shrink:0; margin-top:.5rem; }

/* two-paths card */
.pbx .chart { background:var(--card); border:1px solid var(--card-line); border-radius:8px; padding:1.75rem; display:flex; flex-direction:column; gap:1.5rem; }
.pbx .path { display:flex; flex-direction:column; gap:.5rem; }
.pbx .path-head b { font-family:var(--mono); font-size:.6875rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; }
.pbx .bar { display:flex; height:1.875rem; border-radius:4px; overflow:hidden; background:var(--code-bg); }
.pbx .seg { display:flex; align-items:center; padding-left:.6rem; font-family:var(--mono); font-size:.6875rem; letter-spacing:.06em; text-transform:uppercase; color:#fff; white-space:nowrap; overflow:hidden; width:0; transition:width 800ms ease-out; }
.pbx .is-shown .seg { width:var(--w); }
.pbx .seg-lean { background:var(--teal); }
.pbx .seg-fat { background:var(--rust); }
.pbx .path-note { font-size:.90625rem; line-height:1.5; color:var(--body); }
.pbx .chart-key { display:flex; flex-wrap:wrap; gap:1rem; padding-top:.5rem; border-top:1px solid var(--line-soft); font-family:var(--mono); font-size:.65625rem; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
.pbx .chart-key span { display:inline-flex; align-items:center; gap:.4rem; }
.pbx .swatch { width:.7rem; height:.7rem; border-radius:2px; }

/* pull-quote */
.pbx .pull { font-family:var(--serif); font-weight:400; font-size:clamp(1.6rem,4.6vw,1.9375rem); line-height:1.28; color:var(--ink); border-left:4px solid #333; padding-left:1.5rem; margin:3rem 0; }

/* phase cards */
.pbx .phases { display:flex; flex-direction:column; gap:1.125rem; }
.pbx .phase { display:grid; grid-template-columns:2.5rem 1fr; gap:0 .75rem; align-items:start; }
.pbx .phase-n { font-family:var(--mono); font-size:.75rem; color:var(--muted); padding-top:1.6rem; }
.pbx .phase-card { background:var(--card); border:1px solid var(--card-line); border-left:3px solid var(--teal); border-radius:6px; padding:1.5rem 1.75rem; display:flex; flex-direction:column; gap:.625rem; min-width:0; }
.pbx .phase-when { font-family:var(--mono); font-size:.6875rem; letter-spacing:.07em; text-transform:uppercase; color:var(--teal); }
.pbx .phase-title { font-family:var(--sans); font-size:1.1875rem; font-weight:600; color:var(--ink); line-height:1.3; }
@media (max-width:30rem) { .pbx .phase { grid-template-columns:1fr; } .pbx .phase-n { padding-top:0; } }

/* component (agent) cards */
.pbx .agent { background:var(--card); border:1px solid var(--card-line); border-radius:8px; padding:1.5rem 1.75rem; display:flex; flex-direction:column; gap:.75rem; }
.pbx .agent-role { font-family:var(--mono); font-size:.65625rem; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
.pbx .agent h3 span { font-family:var(--mono); font-size:.75rem; font-weight:400; color:var(--muted); letter-spacing:0; }
.pbx .agent dl { margin:0; display:grid; grid-template-columns:6rem 1fr; gap:.5rem .75rem; font-size:.9375rem; line-height:1.5; }
.pbx .agent dt { font-family:var(--mono); font-size:.65625rem; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); padding-top:.2rem; }
.pbx .agent dd { margin:0; color:var(--body); }
.pbx .agent .go { font-family:var(--mono); font-size:.84375rem; color:var(--teal); }
@media (max-width:30rem) { .pbx .agent dl { grid-template-columns:1fr; gap:.15rem; } .pbx .agent dd { margin-bottom:.4rem; } }

/* failure cards */
.pbx .mistakes { display:flex; flex-direction:column; gap:1rem; }
.pbx .mistake { background:var(--card); border:1px solid var(--card-line); border-radius:6px; padding:1.375rem 1.5rem; display:flex; flex-direction:column; gap:.4rem; }
.pbx .mistake b { font-size:1.0625rem; font-weight:600; color:var(--ink); }
.pbx .mistake span { font-size:.9375rem; line-height:1.5; color:var(--body); }
.pbx .mistake .go { font-family:var(--mono); font-size:.84375rem; color:var(--teal); margin-top:.2rem; }

/* metrics table */
.pbx .table-scroll { overflow-x:auto; }
.pbx table { border-collapse:collapse; width:100%; min-width:30rem; }
@media (max-width:480px) {
  .pbx table { min-width:0; }
  .pbx th, .pbx td { padding:.55rem .5rem; font-size:.8125rem; }
  .pbx td.n { font-size:.71875rem; }
  .pbx .pill { display:block; width:max-content; margin:.25rem 0 0; }
}
.pbx th, .pbx td { text-align:left; padding:.9375rem 1.125rem; border-bottom:1px solid #eee; font-size:1rem; }
.pbx th { font-family:var(--mono); font-size:.6875rem; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); font-weight:400; background:none; }
.pbx td { background:var(--card); }
.pbx td:first-child { font-weight:600; color:var(--ink); }
.pbx td.n { font-family:var(--mono); font-size:.875rem; color:var(--soft); }
.pbx .primary-row td { background:var(--mint); }
.pbx .pill { display:inline-block; font-family:var(--mono); font-size:.625rem; letter-spacing:.06em; background:var(--teal); color:#fff; border-radius:999px; padding:.15rem .5rem; margin-left:.5rem; vertical-align:.12em; }

/* steps / CTA */
.pbx .step { background:var(--card); border:1px solid var(--card-line); border-radius:8px; padding:1.75rem; display:flex; flex-direction:column; gap:1rem; }
.pbx .step-1 { border-color:var(--teal); }
.pbx .step-label { font-family:var(--mono); font-size:.6875rem; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
.pbx .step-label b { color:var(--teal); font-weight:600; }
.pbx .price-line { display:flex; align-items:baseline; justify-content:space-between; gap:.75rem; flex-wrap:wrap; padding:.75rem 0; border-top:1px solid var(--line-soft); border-bottom:1px solid var(--line-soft); }
.pbx .price-line .amt { font-family:var(--serif); font-size:1.875rem; line-height:1; color:var(--ink); font-variant-numeric:tabular-nums; }
.pbx .price-line .amt sub { font-family:var(--sans); font-size:.8125rem; color:var(--muted); vertical-align:baseline; }
.pbx .cta { display:block; text-align:center; text-decoration:none; background:var(--cta-green); color:#fff; font-family:var(--sans); font-weight:500; font-size:1rem; padding:.9375rem 1.75rem; border-radius:7px; margin-top:1rem; transition:filter 140ms ease, transform 80ms ease; }
.pbx .cta:hover { filter:brightness(1.1); }
.pbx .cta:active { transform:scale(.995); }
.pbx .code-chip { display:flex; align-items:center; justify-content:space-between; gap:.75rem; background:var(--code-bg); border:1px dashed var(--line); border-radius:6px; padding:.8rem .9rem; font-family:var(--mono); }
.pbx .code-chip .val { font-size:1.0625rem; font-weight:700; letter-spacing:.06em; color:var(--ink); }
.pbx .code-chip .lbl { font-size:.625rem; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
.pbx a:focus-visible, .pbx button:focus-visible { outline:2px solid var(--teal); outline-offset:3px; }

/* heading fade-in */
.pbx .fade { opacity:0; transform:translateY(12px); transition:opacity 400ms ease, transform 400ms ease; }
.pbx .fade.is-in { opacity:1; transform:translateY(0); }

/* sticky footer CTA */
.pbx .sticky { position:fixed; left:0; right:0; bottom:0; background:#fff; border-top:1px solid var(--line); box-shadow:0 -2px 12px rgba(11,11,11,.05); padding:.75rem 1.5rem calc(.75rem + env(safe-area-inset-bottom)); transform:translateY(100%); transition:transform 300ms ease; z-index:20; }
.pbx .sticky.is-up { transform:translateY(0); }
.pbx .sticky-inner { max-width:680px; margin:0 auto; display:flex; align-items:center; gap:1rem; }
.pbx .sticky-inner .txt { flex:1; min-width:0; }
.pbx .sticky-inner .txt b { display:block; font-size:.875rem; line-height:1.3; color:var(--ink); font-weight:600; }
.pbx .sticky-inner .txt span { font-family:var(--mono); font-size:.65625rem; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); }
.pbx .sticky .cta { margin-top:0; flex-shrink:0; padding:.875rem 1.75rem; }

/* footer */
.pbx footer { border-top:1px solid var(--line); padding:2.5rem 0 1rem; display:flex; flex-direction:column; gap:.875rem; }
.pbx footer a { color:var(--teal); }

@media (prefers-reduced-motion: reduce) {
  .pbx * { transition:none !important; animation:none !important; }
  .pbx .seg { width:var(--w); }
  .pbx .fade { opacity:1; transform:none; }
  .pbx .sticky { transition:none; }
}
`;

export default function ProtocolBriefing({
  publicId,
  providerMatches,
  providerDetails,
  heightIn,
  weightLbs,
  firstName,
  promoTerms,
  leadQuizData,
  resultsUrl,
}: {
  publicId: string;
  providerMatches: ProviderMatch[];
  providerDetails: ProviderDetail[];
  heightIn: number | null;
  weightLbs: number | null;
  firstName: string | null;
  promoTerms: string | null;
  leadQuizData: { primaryGoal: string | null; budget: string | null; insurance: string | null; bmiIdx?: number; primaryGoalIdx?: number };
  resultsUrl: string;
}) {
  const top = providerMatches[0];
  const detail = providerDetails.find((d) => d.slug === top?.slug);
  const matchPct = top ? matchPercentFromFitScore(top.fitScore) : null;
  const showPct = shouldDisplayMatchPercent(matchPct);
  const price = detail?.priceFromCents ? Math.round(detail.priceFromCents / 100) : null;

  // whyMatch rows are persisted at submit time and can embed the provider price
  // as it was THEN. Never show a row whose price contradicts today's — drop it
  // rather than showing two prices on one page. Only "$N/mo"-shaped tokens are
  // price mentions; bare "$N" figures are the lead's own budget band, not prices.
  const whyRows = (top?.whyMatch ?? []).filter((w) => {
    const priceTokens = w.match(/\$(\d+)\s*\/\s*mo/g);
    if (!priceTokens || price == null) return true;
    return priceTokens.every((t) => parseInt(t.slice(1), 10) === price);
  });

  // Real body metrics only when the lead gave them (BMI calculator). Never invent.
  const bmi = heightIn && weightLbs ? (703 * weightLbs) / (heightIn * heightIn) : null;

  // Trajectory bands from STEP (semaglutide ~5-6% by wk 8; ~10-13% by wk 28;
  // ~13-14% at 52wk) and SURMOUNT (tirzepatide ~19.5-20.9% at 72wk).
  const traj = useMemo(() => {
    const pct = (lo: number, hi: number, suffix = "") =>
      weightLbs
        ? `${Math.round((weightLbs * lo) / 100)}–${Math.round((weightLbs * hi) / 100)} lb down${suffix}`
        : `${lo}–${hi}% of body weight down${suffix}`;
    return {
      p1: pct(4, 6),
      p2: pct(10, 14, " from start"),
      p3: weightLbs
        ? `${Math.round(weightLbs * 0.8)}–${Math.round(weightLbs * 0.87)} lb landing weight (13–20% total)`
        : "13–20% total body-weight reduction",
    };
  }, [weightLbs]);

  const goHref = top ? `/go/${top.slug}/${publicId}?position=results_sp` : null;
  const goHrefSticky = top ? `/go/${top.slug}/${publicId}?position=results_sb` : null;

  // Same-tab nav to /go → 302 → provider: fire on POINTERDOWN, before unload
  // (the DirectFunnelClick lesson). Server-side logging rides the /go route.
  const firePixel = (position: "results_sp" | "results_sb") => {
    try {
      trackMetaCustomEvent("ProviderHandoff", {
        source: "results",
        position,
        content_category: "weight-management",
      });
    } catch { /* no-op */ }
  };

  // Comparison bars animate in when scrolled into view (spec: IO, threshold .3).
  const [chartShown, setChartShown] = useState(false);
  const chartRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { setChartShown(true); io.disconnect(); } },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Sticky footer slides up once the reader scrolls past the metrics table.
  const [stickyUp, setStickyUp] = useState(false);
  const tableRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      setStickyUp(r.bottom < window.innerHeight * 0.6);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Subtle heading fade-in (spec item 3) — one observer for all .fade nodes.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll(".fade"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-in"); }),
      { threshold: 0.2 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const goalShort = leadQuizData.primaryGoal
    ? leadQuizData.primaryGoal.replace("Lose body fat and improve body composition", "Fat loss, muscle kept")
    : null;
  const coverage = leadQuizData.insurance
    ? leadQuizData.insurance === "uninsured" ? "Cash-pay"
      : leadQuizData.insurance === "medicare" ? "Medicare/Medicaid"
      : "Commercial"
    : null;

  const agents = [
    {
      role: "The medication",
      name: "GLP-1 therapy",
      sub: "semaglutide · tirzepatide",
      rows: [
        ["Does", "Regulates appetite and slows gastric emptying. The deficit stops being a willpower problem."],
        ["Chosen by", "Your prescriber. Drug and dose are theirs to call."],
      ] as const,
      go: "→ Side effects cluster around dose jumps. Let the schedule be boring.",
    },
    {
      role: "The muscle signal",
      name: "Resistance training",
      sub: "3× / week, progressive",
      rows: [
        ["Does", "The signal to keep muscle while weight drops."],
        ["Minimum", "3× a week. Twenty minutes counts if the load progresses."],
      ] as const,
      go: "→ The piece most people skip. It separates the two paths above.",
    },
    {
      role: "The raw material",
      name: "Protein + sleep",
      sub: "~0.7 g/lb · 7+ hours",
      rows: [
        ["Does", "Protein feeds the muscle you keep. Sleep makes the training stick."],
        ["Watch", "Suppressed appetite under-eats protein without noticing. Track it the first month."],
      ] as const,
      go: null,
    },
  ];

  const mistakes = [
    { b: "Treating the scale as the scoreboard", s: "Waist dropping, scale flat: it's working. Scale dropping, lifts falling: it isn't.", go: "→ Waist + strength are the scoreboard. Table below." },
    { b: "Skipping the training because you're not hungry", s: "Easy to under-eat and under-train when you're never hungry. That muscle is the hardest thing to get back.", go: "→ 3×/week minimum; 20-minute sessions count." },
    { b: "Rushing the dose", s: "Side effects cluster around dose jumps.", go: "→ Your prescriber drives. No self-adjusting." },
    { b: "Quitting in month four", s: "The cost and the plateau hit together. Twelve affordable months beat three you abandon.", go: "→ Pick the plan you can afford for 12 months, not 3." },
  ];

  const metrics: Array<{ m: string; cad: string; tells: string; primary?: boolean }> = [
    { m: "Waist", cad: "Weekly, same conditions", tells: "Fat loss — the number the scale can't fake", primary: true },
    { m: "Weight, 7-day average", cad: "Daily reading, weekly average", tells: "Trend, not noise" },
    { m: "Protein intake", cad: "Daily, first month", tells: "Whether retained muscle has raw material" },
    { m: "Training sessions", cad: "Weekly count", tells: "Whether the muscle signal is being sent" },
    { m: "Sleep duration", cad: "Nightly", tells: "Recovery — what makes the training stick" },
  ];

  const consultQs = [
    "Which medication and starting dose fit my history?",
    "What does the titration schedule look like for me?",
    "Ask your clinician about combination or adjunct therapies — what's evidence-backed for your case, and what isn't.",
    "What should trigger a check-in before the next scheduled one?",
  ];

  return (
    <div className="pbx" ref={rootRef}>
      <style>{PBX_CSS}</style>
      <div className="wrap">
        <div className="masthead">
          <b>PeptidePilot · Protocol Briefing</b>
          {firstName ? <span>Prepared for {firstName}</span> : <span>Personal edition</span>}
        </div>

        {/* ── Hero ── */}
        <section className="chapter hero">
          <div className="group">
            <h1 className="fade">You don't have a weight problem. You have a ratio problem.</h1>
            <p className="lede">
              Losing weight is the easy half. Losing the <em>right</em> weight — fat, not muscle — decides how this looks in twelve months. Your read, your plan, the traps.
            </p>
          </div>
        </section>

        {/* ── 01 · The read ── */}
        {(weightLbs || heightIn || bmi || goalShort || leadQuizData.budget || coverage) ? (
          <section className="chapter">
            <div className="chapter-head">
              <p className="label">01 — The read</p>
              <h2 className="fade">What your answers add up to</h2>
            </div>
            <div className="group">
              <dl className="readout">
                {weightLbs ? <div><dt>Current weight</dt><dd>{weightLbs} <span>lb</span></dd></div> : null}
                {heightIn ? <div><dt>Height</dt><dd>{Math.floor(heightIn / 12)}'{heightIn % 12}"</dd></div> : null}
                {bmi ? <div><dt>BMI</dt><dd>{bmi.toFixed(1)}</dd></div> : null}
                {goalShort ? <div><dt>Stated goal</dt><dd className="txt">{goalShort}</dd></div> : null}
                {leadQuizData.budget ? <div><dt>Budget</dt><dd className="txt">{leadQuizData.budget}</dd></div> : null}
                {coverage ? <div><dt>Coverage</dt><dd className="txt">{coverage}</dd></div> : null}
              </dl>
              {whyRows.length ? (
                <ul className="checks">
                  {whyRows.slice(0, 3).map((w) => <li key={w}>{w}</li>)}
                </ul>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ── 02 · The finding ── */}
        <section className="chapter">
          <div className="chapter-head">
            <p className="label">02 — The finding</p>
            <h2 className="fade">Two ways to lose the same weight</h2>
          </div>
          <div className="group">
            <p>
              In the major GLP-1 trials, <strong>25–40% of weight lost on medication alone came from lean mass</strong> (Wilding 2021 — STEP 1; Jastreboff 2022 — SURMOUNT-1 sub-studies). Same scale number. Very different body.
            </p>
            <div className={`chart${chartShown ? " is-shown" : ""}`} ref={chartRef}>
              <div className="path">
                <div className="path-head"><b style={{ color: "var(--rust)" }}>GLP-1 alone</b></div>
                <div className="bar">
                  <div className="seg seg-fat" style={{ ["--w" as string]: "62%" }}>fat</div>
                  <div className="seg seg-lean" style={{ ["--w" as string]: "38%" }}>up to 40% muscle</div>
                </div>
                <p className="path-note">Lighter, but weaker. Slower metabolism.</p>
              </div>
              <div className="path">
                <div className="path-head"><b style={{ color: "var(--teal)" }}>Protected path</b></div>
                <div className="bar">
                  <div className="seg seg-fat" style={{ ["--w" as string]: "88%" }}>fat — deficit aimed here</div>
                  <div className="seg seg-lean" style={{ ["--w" as string]: "12%" }}>defended</div>
                </div>
                <p className="path-note">Loss comes overwhelmingly from fat. Strength holds.</p>
              </div>
              <div className="chart-key">
                <span><i className="swatch" style={{ background: "var(--rust)" }} /> fat lost</span>
                <span><i className="swatch" style={{ background: "var(--teal)" }} /> lean mass lost</span>
              </div>
              <p className="fine">Illustrative split. Training and protein decide the ratio; the measured figure is the cited 25–40% lean-mass share on medication alone.</p>
            </div>
          </div>
          <p className="pull">The scale can't tell you which of these you became. That's why the scale is not your primary metric.</p>
        </section>

        {/* ── 03 · The plan ── */}
        <section className="chapter">
          <div className="chapter-head">
            <p className="label">03 — The plan</p>
            <h2 className="fade">Twelve months, three phases</h2>
          </div>
          <div className="phases">
            {[
              { n: "P1", when: "Weeks 1–8 · Foundation", t: "Establish the deficit without losing ground", d: "Medication titrates up. Training starts light. Protein locks in.", e: traj.p1 },
              { n: "P2", when: "Weeks 9–28 · Recomposition", t: "Add the second lever, change the scoreboard", d: "Progressive training while the medication holds appetite down. Visible change outpaces scale change.", e: traj.p2 },
              { n: "P3", when: "Weeks 29–52 · Consolidation", t: "Land it and keep it", d: "Maintenance dose and habits get set with your clinician. This phase decides whether month 13 looks like month 12.", e: traj.p3 },
            ].map((p) => (
              <div className="phase" key={p.n}>
                <div className="phase-n">{p.n}</div>
                <div className="phase-card">
                  <span className="phase-when">{p.when}</span>
                  <span className="phase-title">{p.t}</span>
                  <p className="small">{p.d}</p>
                  <span className="snippet">Typical range (clinical trials): {p.e}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="fine">Ranges reflect clinical-trial averages — individual results vary; your clinician sets expectations for you.</p>
        </section>

        {/* ── 04 · The pieces ── */}
        <section className="chapter">
          <div className="chapter-head">
            <p className="label">04 — The pieces</p>
            <h2 className="fade">What each piece is actually doing</h2>
          </div>
          <div className="group" style={{ gap: "1.125rem" }}>
            {agents.map((a) => (
              <div className="agent" key={a.name}>
                <div>
                  <div className="agent-role">{a.role}</div>
                  <h3>{a.name} <span>{a.sub}</span></h3>
                </div>
                <dl>
                  {a.rows.map(([dt, dd]) => (
                    <FragmentRow key={dt} dt={dt} dd={dd} />
                  ))}
                </dl>
                {a.go ? <div className="go">{a.go}</div> : null}
              </div>
            ))}
          </div>
        </section>

        {/* ── 05 · The traps ── */}
        <section className="chapter">
          <div className="chapter-head">
            <p className="label">05 — The traps</p>
            <h2 className="fade">The four ways this goes wrong</h2>
          </div>
          <div className="mistakes">
            {mistakes.map((m) => (
              <div className="mistake" key={m.b}>
                <b>{m.b}</b>
                <span>{m.s}</span>
                <span className="go">{m.go}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 06 · The scoreboard ── */}
        <section className="chapter" ref={tableRef}>
          <div className="chapter-head">
            <p className="label">06 — The scoreboard</p>
            <h2 className="fade">Track these five. Ignore everything else.</h2>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Metric</th><th>Cadence</th><th>What it tells you</th></tr>
              </thead>
              <tbody>
                {metrics.map((r) => (
                  <tr key={r.m} className={r.primary ? "primary-row" : undefined}>
                    <td>{r.m}{r.primary ? <span className="pill">Primary</span> : null}</td>
                    <td className="n">{r.cad}</td>
                    <td>{r.tells}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 07 · Next steps ── */}
        {top && (
          <section className="chapter">
            <div className="chapter-head">
              <p className="label">07 — Next steps</p>
              <h2 className="fade">None of this happens without a prescriber</h2>
            </div>
            <div className="group" style={{ gap: "1.125rem" }}>
              <div className="step step-1">
                <div className="step-label">
                  <b>Step 1</b> · {top.displayName}{showPct ? ` · ${matchPct}% match to your intake` : ""}
                </div>
                <h3>Start the medical intake at {top.displayName}</h3>
                {price ? (
                  <div className="price-line">
                    <span className="amt">${price}<sub>/mo all-in</sub></span>
                    <span className="small">Typical cash-pay GLP-1 runs $300–$1,000+/mo</span>
                  </div>
                ) : null}
                {whyRows.length ? (
                  <ul className="checks">
                    {whyRows.slice(0, 3).map((w) => <li key={w}>{w}</li>)}
                  </ul>
                ) : null}
                {/* Promo — CONFIG-GATED: renders ONLY when a real code exists on the provider row. */}
                {detail?.promoCode ? (
                  <div className="code-chip">
                    <span className="lbl">Promo · applied at checkout</span>
                    <span className="val">{detail.promoCode}</span>
                  </div>
                ) : null}
                {detail?.promoCode && promoTerms ? <p className="fine">{promoTerms}</p> : null}
                {goHref && (
                  <a className="cta" href={goHref} onPointerDown={() => firePixel("results_sp")}>
                    Start my Phase 1 intake at {top.displayName} →
                  </a>
                )}
                <p className="fine" style={{ textAlign: "center" }}>
                  Licensed US clinicians review every intake. You qualify with them, not with us.
                </p>
              </div>

              <div className="step">
                <div className="step-label"><b>Step 2</b> · The consult</div>
                <h3>What to ask when you get them on the line</h3>
                <ul className="checks">
                  {consultQs.map((q) => <li key={q}>{q}</li>)}
                </ul>
              </div>

              {/* Real reference, not code theater: publicId short-ref + permanence. */}
              <div className="code-chip">
                <span className="lbl">Your results ref</span>
                <span className="val">{publicId.slice(0, 8).toUpperCase()}</span>
              </div>
              <p className="fine">
                This page stays live at <a href={resultsUrl} style={{ color: "var(--teal)" }}>{resultsUrl.replace(/^https?:\/\//, "")}</a> — come back to it anytime.
              </p>
            </div>
          </section>
        )}

        <footer>
          <SiteDisclosure className="fine" />
          {detail?.complianceNote ? <p className="fine">{detail.complianceNote}</p> : null}
        </footer>
      </div>

      {/* Sticky footer CTA — real match %, config-gated code only */}
      {top && goHrefSticky ? (
        <div className={`sticky${stickyUp ? " is-up" : ""}`}>
          <div className="sticky-inner">
            <div className="txt">
              <b>{top.displayName}{price ? ` · $${price}/mo` : ""}</b>
              <span>
                {showPct ? `${matchPct}% match` : "Your match"}
                {detail?.promoCode ? ` · code ${detail.promoCode}` : ""}
              </span>
            </div>
            <a className="cta" href={goHrefSticky} onPointerDown={() => firePixel("results_sb")}>
              Start Phase 1 →
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FragmentRow({ dt, dd }: { dt: string; dd: string }) {
  return (
    <>
      <dt>{dt}</dt>
      <dd>{dd}</dd>
    </>
  );
}
