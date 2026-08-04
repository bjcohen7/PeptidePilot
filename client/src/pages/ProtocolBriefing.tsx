import { useEffect, useMemo, useRef, useState } from "react";
import { matchPercentFromFitScore, shouldDisplayMatchPercent } from "@shared/matchDisplay";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { SiteDisclosure } from "@/components/SiteDisclosure";

/**
 * Protocol-Briefing results page (RESULTS_PAGE_MODE=briefing, default).
 * Visual system adopted VERBATIM from the partner mock's CSS
 * (reference/partner-mock/partner-mock.html) — palette, type stacks, section
 * rhythm, readout grid, two-path chart, phase stack, agent cards, mistakes
 * stack, tracking table, step cards, sticky CTA bar. All selectors are scoped
 * under .pbx so his rules never fight the global stylesheet.
 *
 * The honest-machine substitutions are unchanged from the first build:
 *  - promo renders ONLY from providers.promo_code (+ GALA_PROMO_TERMS terms);
 *    unset = hidden. No fabricated codes.
 *  - "intake code" theater → the lead's real publicId short-ref + permanence.
 *  - Tesamorelin out; combination therapy lives in the consult questions.
 *  - Phase targets labeled "Typical range (clinical trials):", computed from
 *    the lead's real weight vs STEP/SURMOUNT (4–6% wk8, 10–14% wk28, 13–20% 12mo).
 *  - Real match % (floor-gated); stat readout renders only provided answers;
 *    stale-price whyMatch rows filtered; two-path bars are labeled illustrative
 *    with the only printed number being the cited 25–40% lean-mass range.
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

// Partner mock's stylesheet, scoped under .pbx (values verbatim; only the
// scoping prefix and the removal of page-global body/html rules are ours).
const PBX_CSS = `
body:has(.pbx) { background:#F1F4F2; }
@media (prefers-color-scheme: dark) { body:has(.pbx) { background:#0A1012; } }
.pbx {
  --bg:#F1F4F2; --bg-raised:#FFFFFF; --bg-sunk:#E5EBE7;
  --ink:#0B1315; --ink-2:#485854; --ink-3:#7A8985;
  --rule:#D1DAD6; --rule-soft:#E1E8E5;
  --lean:#0F7466; --lean-tint:#DCEEEA;
  --fat:#A24E36; --fat-tint:#F3E2DC;
  --signal:#8A6612; --signal-tint:#F2EAD3;
  --shadow:0 1px 2px rgba(11,19,21,.05), 0 8px 24px -12px rgba(11,19,21,.12);
  --serif:Georgia,"Iowan Old Style","Times New Roman",serif;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --mono:ui-monospace,"SF Mono","Cascadia Mono","Roboto Mono",Menlo,Consolas,monospace;
  --measure:40rem; --wide:46rem;
  background:var(--bg); color:var(--ink); font-family:var(--sans);
  font-size:1.0625rem; line-height:1.6; -webkit-font-smoothing:antialiased;
  min-height:100vh; padding-bottom:5rem;
}
@media (prefers-color-scheme: dark) {
  .pbx {
    --bg:#0A1012; --bg-raised:#131B1D; --bg-sunk:#060B0C;
    --ink:#E7EDEB; --ink-2:#9AA9A5; --ink-3:#6A7975;
    --rule:#1F2B2D; --rule-soft:#172123;
    --lean:#45C6AB; --lean-tint:#0E2B27;
    --fat:#E08A6A; --fat-tint:#2C1A14;
    --signal:#D9AE55; --signal-tint:#2A2212;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -12px rgba(0,0,0,.7);
  }
  .pbx .seg { color:#07100F; }
  .pbx .cta { color:#06100E; }
}
.pbx * { box-sizing:border-box; }
.pbx .wrap { max-width:var(--wide); margin:0 auto; padding:0 1.25rem; }
.pbx .eyebrow { font-family:var(--mono); font-size:.6875rem; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-3); margin:0; }
.pbx h1, .pbx h2, .pbx h3 { text-wrap:balance; margin:0; }
.pbx h1 { font-family:var(--serif); font-weight:400; font-size:clamp(2rem,7.5vw,3.15rem); line-height:1.05; letter-spacing:-.022em; }
.pbx h2 { font-family:var(--serif); font-weight:400; font-size:clamp(1.55rem,4.6vw,2rem); line-height:1.15; letter-spacing:-.015em; }
.pbx h3 { font-family:var(--sans); font-weight:640; font-size:1.0625rem; line-height:1.35; letter-spacing:-.005em; }
.pbx p { margin:0; max-width:var(--measure); }
.pbx strong { font-weight:650; color:var(--ink); }
.pbx em { font-style:italic; }
.pbx .lede { font-size:1.1875rem; line-height:1.55; color:var(--ink-2); }
.pbx .small { font-size:.875rem; line-height:1.55; color:var(--ink-2); }
.pbx .fine { font-size:.75rem; line-height:1.5; color:var(--ink-3); max-width:var(--measure); }
.pbx .num { font-variant-numeric:tabular-nums; }
.pbx section { display:flex; flex-direction:column; gap:1.5rem; padding:4.25rem 0; border-top:1px solid var(--rule); }
.pbx section > .eyebrow { margin-bottom:-.5rem; }
.pbx .stack-sm { display:flex; flex-direction:column; gap:.625rem; }
.pbx .stack-md { display:flex; flex-direction:column; gap:1.25rem; }
.pbx .masthead { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; padding:1.25rem 0 1rem; font-family:var(--mono); font-size:.6875rem; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-3); border-bottom:1px solid var(--rule); }
.pbx .masthead b { color:var(--ink); font-weight:600; letter-spacing:.12em; }
.pbx .hero { padding-top:3.25rem; border-top:none; }
.pbx .hero-tag { display:inline-flex; align-items:center; gap:.5rem; align-self:flex-start; font-family:var(--mono); font-size:.6875rem; letter-spacing:.12em; text-transform:uppercase; color:var(--lean); background:var(--lean-tint); border:1px solid color-mix(in srgb, var(--lean) 30%, transparent); border-radius:2px; padding:.3rem .55rem; }
.pbx .readout { display:grid; grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr)); gap:1px; background:var(--rule); border:1px solid var(--rule); border-radius:3px; overflow:hidden; }
.pbx .readout > div { background:var(--bg-raised); padding:1rem 1rem 1.125rem; display:flex; flex-direction:column; gap:.2rem; }
.pbx .readout dt { font-family:var(--mono); font-size:.625rem; letter-spacing:.13em; text-transform:uppercase; color:var(--ink-3); }
.pbx .readout dd { margin:0; font-family:var(--serif); font-size:1.5rem; line-height:1.1; font-variant-numeric:tabular-nums; }
.pbx .readout dd span { font-family:var(--sans); font-size:.8125rem; color:var(--ink-2); letter-spacing:0; }
.pbx .readout dd.txt { font-family:var(--sans); font-size:.9rem; line-height:1.35; padding-top:.15rem; }
.pbx .chart { background:var(--bg-raised); border:1px solid var(--rule); border-radius:3px; padding:1.875rem 1.5rem 1.5rem; display:flex; flex-direction:column; gap:1.75rem; box-shadow:var(--shadow); }
.pbx .path { display:flex; flex-direction:column; gap:.5rem; }
.pbx .path-head { display:flex; align-items:baseline; justify-content:space-between; gap:.75rem; }
.pbx .path-head b { font-family:var(--mono); font-size:.6875rem; letter-spacing:.12em; text-transform:uppercase; font-weight:600; }
.pbx .bar { display:flex; height:2rem; border-radius:2px; overflow:hidden; background:var(--bg-sunk); }
.pbx .seg { display:flex; align-items:center; padding-left:.6rem; font-family:var(--mono); font-size:.625rem; letter-spacing:.08em; text-transform:uppercase; color:#fff; white-space:nowrap; overflow:hidden; width:0; transition:width 900ms cubic-bezier(.22,.7,.3,1); }
.pbx .is-shown .seg { width:var(--w); }
.pbx .seg-lean { background:var(--lean); }
.pbx .seg-fat { background:var(--fat); }
.pbx .path-note { font-size:.8125rem; line-height:1.5; color:var(--ink-2); }
.pbx .chart-key { display:flex; flex-wrap:wrap; gap:1rem; padding-top:.25rem; border-top:1px solid var(--rule-soft); font-family:var(--mono); font-size:.625rem; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); }
.pbx .chart-key span { display:inline-flex; align-items:center; gap:.4rem; }
.pbx .swatch { width:.7rem; height:.7rem; border-radius:1px; }
.pbx .pull { font-family:var(--serif); font-size:clamp(1.35rem,4.4vw,1.75rem); line-height:1.25; letter-spacing:-.012em; padding-left:1.1rem; border-left:2px solid var(--lean); max-width:34rem; }
.pbx .phases { display:flex; flex-direction:column; gap:1px; background:var(--rule); border:1px solid var(--rule); border-radius:3px; overflow:hidden; }
.pbx .phase { background:var(--bg-raised); padding:1.5rem; display:grid; grid-template-columns:2.75rem 1fr; gap:0 1rem; align-items:start; }
.pbx .phase-n { font-family:var(--mono); font-size:.625rem; letter-spacing:.1em; color:var(--ink-3); line-height:1.6; padding-top:.15rem; }
.pbx .phase-body { display:flex; flex-direction:column; gap:.5rem; min-width:0; }
.pbx .phase-when { font-family:var(--mono); font-size:.625rem; letter-spacing:.12em; text-transform:uppercase; color:var(--lean); }
.pbx .phase-target { font-family:var(--mono); font-size:.6875rem; color:var(--ink-2); background:var(--bg-sunk); border-radius:2px; padding:.45rem .6rem; align-self:flex-start; max-width:100%; }
@media (max-width:26rem) { .pbx .phase { grid-template-columns:1fr; gap:.5rem; } }
.pbx .agent { background:var(--bg-raised); border:1px solid var(--rule); border-radius:3px; padding:1.5rem; display:flex; flex-direction:column; gap:.75rem; }
.pbx .agent-head { display:flex; flex-direction:column; gap:.3rem; }
.pbx .agent-role { font-family:var(--mono); font-size:.625rem; letter-spacing:.13em; text-transform:uppercase; color:var(--ink-3); }
.pbx .agent h3 span { font-family:var(--mono); font-size:.75rem; font-weight:500; color:var(--ink-2); letter-spacing:0; }
.pbx .agent dl { margin:0; display:grid; grid-template-columns:6.5rem 1fr; gap:.45rem .75rem; font-size:.875rem; line-height:1.5; }
.pbx .agent dt { font-family:var(--mono); font-size:.625rem; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); padding-top:.18rem; }
.pbx .agent dd { margin:0; color:var(--ink-2); }
.pbx .agent dd strong { color:var(--ink); }
@media (max-width:30rem) { .pbx .agent dl { grid-template-columns:1fr; gap:.15rem; } .pbx .agent dd { margin-bottom:.5rem; } }
.pbx .flag { display:flex; gap:.6rem; font-size:.8125rem; line-height:1.5; color:var(--ink-2); background:var(--signal-tint); border-left:2px solid var(--signal); border-radius:0 2px 2px 0; padding:.7rem .8rem; }
.pbx .flag b { font-family:var(--mono); font-size:.625rem; letter-spacing:.1em; text-transform:uppercase; color:var(--signal); flex-shrink:0; padding-top:.18rem; }
.pbx .mistakes { display:flex; flex-direction:column; gap:1px; background:var(--rule); border:1px solid var(--rule); border-radius:3px; overflow:hidden; }
.pbx .mistake { background:var(--bg-raised); padding:1.3rem 1.5rem; display:flex; flex-direction:column; gap:.3rem; }
.pbx .mistake b { font-size:.9375rem; font-weight:640; }
.pbx .mistake span { font-size:.875rem; line-height:1.5; color:var(--ink-2); }
.pbx .mistake .fix { font-family:var(--mono); font-size:.6875rem; line-height:1.5; color:var(--lean); margin-top:.15rem; }
.pbx .table-scroll { overflow-x:auto; border:1px solid var(--rule); border-radius:3px; }
.pbx table { border-collapse:collapse; width:100%; min-width:30rem; background:var(--bg-raised); }
.pbx th, .pbx td { text-align:left; padding:.8rem 1rem; border-bottom:1px solid var(--rule-soft); font-size:.875rem; }
.pbx th { font-family:var(--mono); font-size:.625rem; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-3); font-weight:500; background:var(--bg-sunk); border-bottom:1px solid var(--rule); }
.pbx tr:last-child td { border-bottom:none; }
.pbx td:first-child { font-weight:600; }
.pbx td.n { font-family:var(--mono); font-variant-numeric:tabular-nums; color:var(--ink-2); }
.pbx .primary-row td { background:var(--lean-tint); }
.pbx .primary-row td:first-child::after { content:"PRIMARY"; font-family:var(--mono); font-size:.5625rem; letter-spacing:.1em; color:var(--lean); margin-left:.5rem; vertical-align:.1em; }
.pbx .step { background:var(--bg-raised); border:1px solid var(--rule); border-radius:3px; padding:1.75rem 1.5rem; display:flex; flex-direction:column; gap:.875rem; }
.pbx .step-1 { border-color:var(--lean); box-shadow:var(--shadow); }
.pbx .step-label { display:flex; align-items:baseline; gap:.6rem; font-family:var(--mono); font-size:.625rem; letter-spacing:.13em; text-transform:uppercase; color:var(--ink-3); }
.pbx .step-label b { color:var(--lean); font-weight:600; }
.pbx .price-line { display:flex; align-items:baseline; justify-content:space-between; gap:.75rem; flex-wrap:wrap; padding:.75rem 0; border-top:1px solid var(--rule-soft); border-bottom:1px solid var(--rule-soft); }
.pbx .price-line .amt { font-family:var(--serif); font-size:1.875rem; line-height:1; font-variant-numeric:tabular-nums; }
.pbx .price-line .amt sub { font-family:var(--sans); font-size:.8125rem; color:var(--ink-2); vertical-align:baseline; }
.pbx .checks { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.4rem; }
.pbx .checks li { display:flex; gap:.6rem; font-size:.9375rem; line-height:1.45; }
.pbx .checks li::before { content:""; width:.4rem; height:.4rem; border-radius:50%; background:var(--lean); flex-shrink:0; margin-top:.5rem; }
.pbx .cta { display:block; text-align:center; text-decoration:none; background:var(--lean); color:#fff; font-family:var(--sans); font-weight:650; font-size:1.0625rem; letter-spacing:-.005em; padding:1.05rem 1.25rem; border-radius:3px; transition:filter 140ms ease, transform 80ms ease; }
.pbx .cta:hover { filter:brightness(1.08); }
.pbx .cta:active { transform:scale(.995); }
.pbx .code-chip { display:flex; align-items:center; justify-content:space-between; gap:.75rem; background:var(--bg-sunk); border:1px dashed var(--rule); border-radius:3px; padding:.8rem .9rem; font-family:var(--mono); }
.pbx .code-chip .val { font-size:1.0625rem; font-weight:700; letter-spacing:.06em; }
.pbx .code-chip .lbl { font-size:.625rem; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-3); }
.pbx a:focus-visible, .pbx button:focus-visible { outline:2px solid var(--lean); outline-offset:3px; }
.pbx .sticky { position:fixed; left:0; right:0; bottom:0; background:color-mix(in srgb, var(--bg-raised) 94%, transparent); backdrop-filter:blur(10px); border-top:1px solid var(--rule); padding:.7rem 1.25rem calc(.7rem + env(safe-area-inset-bottom)); transform:translateY(110%); transition:transform 260ms cubic-bezier(.22,.7,.3,1); z-index:20; }
.pbx .sticky.is-up { transform:translateY(0); }
.pbx .sticky-inner { max-width:var(--wide); margin:0 auto; display:flex; align-items:center; gap:.875rem; }
.pbx .sticky-inner .txt { flex:1; min-width:0; }
.pbx .sticky-inner .txt b { display:block; font-size:.8125rem; line-height:1.3; }
.pbx .sticky-inner .txt span { font-family:var(--mono); font-size:.625rem; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-3); }
.pbx .sticky .cta { padding:.8rem 1.1rem; font-size:.9375rem; flex-shrink:0; }
.pbx footer { border-top:1px solid var(--rule); padding:2.5rem 0 1rem; display:flex; flex-direction:column; gap:.875rem; }
.pbx footer a { color:var(--lean); }
@media (prefers-reduced-motion: reduce) {
  .pbx * { transition:none !important; animation:none !important; }
  .pbx .seg { width:var(--w); }
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

  // Trajectory bands from STEP (semaglutide ~15% at 68wk; ~5-6% by wk 8; ~10-13%
  // by wk 28; ~13-14% at 52wk) and SURMOUNT (tirzepatide ~19.5-20.9% at 72wk).
  // Computed from real weight when present; otherwise expressed as % of body weight.
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

  // Two-path bars animate in on mount (the mock's .is-shown behavior).
  const [chartShown, setChartShown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setChartShown(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Sticky CTA: up once the reader is past the hero and the main CTA card
  // isn't on screen.
  const [stickyUp, setStickyUp] = useState(false);
  const closeRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let closeVisible = false;
    const io = new IntersectionObserver((entries) => {
      closeVisible = entries[0]?.isIntersecting ?? false;
      onScroll();
    });
    if (closeRef.current) io.observe(closeRef.current);
    const onScroll = () => setStickyUp(window.scrollY > window.innerHeight * 1.2 && !closeVisible);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
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
        ["Does", "Regulates appetite and slows gastric emptying so the deficit is sustainable instead of white-knuckled. The most clinically validated tool in this plan."],
        ["Chosen by", "Your prescriber — drug and dose are theirs to call, titrated upward over months."],
      ] as const,
      flag: "Rushing titration is the most common source of side effects. Let the schedule be boring.",
    },
    {
      role: "The muscle signal",
      name: "Resistance training",
      sub: "3× / week, progressive",
      rows: [
        ["Does", "Tells your body to keep muscle while weight drops. Without it, a meaningful share of scale loss comes from lean mass."],
        ["Minimum", "Three sessions a week — even 20 minutes counts, as long as the load progresses."],
      ] as const,
      flag: "This is the piece most people skip — it is what separates the two paths above.",
    },
    {
      role: "The raw material",
      name: "Protein + sleep",
      sub: "~0.7 g/lb · 7+ hours",
      rows: [
        ["Does", "Protein gives retained muscle its raw material; sleep drives the recovery hormones that make training stick."],
        ["Watch", "Appetite suppression makes under-eating protein easy — track it for the first month."],
      ] as const,
      flag: null,
    },
  ];

  const mistakes = [
    { b: "Treating the scale as the scoreboard", s: "If waist is dropping and the scale isn't, the protocol is working. If the scale is dropping and your lifts are falling, it isn't.", fix: "FIX → waist + strength are the scoreboard. Table below." },
    { b: "Skipping the training because you're not hungry", s: "Appetite suppression makes it easy to under-eat and under-train. The muscle you lose this way is the hardest thing to get back.", fix: "FIX → 3×/week minimum; 20-minute sessions count." },
    { b: "Rushing the dose", s: "Titration schedules exist because side effects cluster around dose jumps.", fix: "FIX → your prescriber drives. No self-adjusting." },
    { b: "Quitting in month four", s: "The cost and the plateau usually hit together. A plan you can afford for twelve months beats a sprint you abandon.", fix: "FIX → pick the plan you can afford for 12 months, not 3." },
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
    <div className="pbx">
      <style>{PBX_CSS}</style>
      <div className="wrap">
        <div className="masthead">
          <b>PeptidePilot · Protocol Briefing</b>
          {firstName ? <span>Prepared for {firstName}</span> : <span>Personal edition</span>}
        </div>

        {/* ── Hero ── */}
        <section className="hero">
          <span className="hero-tag">Analysis complete · weight-loss protocol</span>
          <h1>You don't have a weight problem. You have a ratio problem.</h1>
          <p className="lede">
            Losing weight is the easy half. Losing the <em>right</em> weight — fat, not muscle — is the half that decides whether you like the result in twelve months. Here's your read, your plan, and the places most people blow it.
          </p>
        </section>

        {/* ── 01 · Readout ── */}
        {(weightLbs || heightIn || bmi || goalShort || leadQuizData.budget || coverage) ? (
          <section>
            <p className="eyebrow">01 · The read</p>
            <h2>What your answers add up to</h2>
            <dl className="readout">
              {weightLbs ? <div><dt>Current weight</dt><dd className="num">{weightLbs} <span>lb</span></dd></div> : null}
              {heightIn ? <div><dt>Height</dt><dd className="num">{Math.floor(heightIn / 12)}'{heightIn % 12}"</dd></div> : null}
              {bmi ? <div><dt>BMI</dt><dd className="num">{bmi.toFixed(1)}</dd></div> : null}
              {goalShort ? <div><dt>Stated goal</dt><dd className="txt">{goalShort}</dd></div> : null}
              {leadQuizData.budget ? <div><dt>Budget</dt><dd className="txt">{leadQuizData.budget}</dd></div> : null}
              {coverage ? <div><dt>Coverage</dt><dd className="txt">{coverage}</dd></div> : null}
            </dl>
            {whyRows.length ? (
              <ul className="checks">
                {whyRows.slice(0, 3).map((w) => <li key={w}>{w}</li>)}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* ── 02 · Two paths ── */}
        <section>
          <p className="eyebrow">02 · The finding</p>
          <h2>Two ways to lose the same weight</h2>
          <p>
            Across the body-composition arms of the major GLP-1 trials, roughly <strong>a quarter to 40% of weight lost on medication alone comes from lean mass</strong> (Wilding 2021 — STEP 1; Jastreboff 2022 — SURMOUNT-1 sub-studies). Same scale number, very different body — unless the deficit is aimed at fat and the muscle is defended.
          </p>
          <div className={`chart${chartShown ? " is-shown" : ""}`}>
            <div className="path">
              <div className="path-head"><b style={{ color: "var(--fat)" }}>GLP-1 alone</b></div>
              <div className="bar">
                <div className="seg seg-fat" style={{ ["--w" as string]: "62%" }}>fat</div>
                <div className="seg seg-lean" style={{ ["--w" as string]: "38%" }}>up to 40% muscle</div>
              </div>
              <p className="path-note">Lighter, but weaker — and a slower metabolism to maintain it with.</p>
            </div>
            <div className="path">
              <div className="path-head"><b style={{ color: "var(--lean)" }}>Protected path</b></div>
              <div className="bar">
                <div className="seg seg-fat" style={{ ["--w" as string]: "88%" }}>fat — deficit aimed here</div>
                <div className="seg seg-lean" style={{ ["--w" as string]: "12%" }}>defended</div>
              </div>
              <p className="path-note">Medication + training + protein. The loss comes overwhelmingly from fat; strength holds.</p>
            </div>
            <div className="chart-key">
              <span><i className="swatch" style={{ background: "var(--fat)" }} /> fat lost</span>
              <span><i className="swatch" style={{ background: "var(--lean)" }} /> lean mass lost</span>
            </div>
            <p className="fine">Illustrative split — the medication drives the loss; training and protein decide the ratio. The only measured figure is the cited 25–40% lean-mass share on medication alone.</p>
          </div>
          <p className="pull">The scale can't tell you which of these you became. That's why the scale is not your primary metric.</p>
        </section>

        {/* ── 03 · Phases ── */}
        <section>
          <p className="eyebrow">03 · The plan</p>
          <h2>Twelve months, three phases</h2>
          <div className="phases">
            {[
              { n: "PH 1", when: "Weeks 1–8 · Foundation", d: "Establish the deficit without losing ground. Medication titrates up; training starts light; protein target locks in.", e: traj.p1 },
              { n: "PH 2", when: "Weeks 9–28 · Recomposition", d: "The second lever changes the scoreboard: progressive training while the medication holds appetite down. Visible change outpaces scale change.", e: traj.p2 },
              { n: "PH 3", when: "Weeks 29–52 · Consolidation", d: "Land it and keep it. Maintenance dose and habits get defined with your clinician — this phase decides whether month 13 looks like month 12.", e: traj.p3 },
            ].map((p) => (
              <div className="phase" key={p.n}>
                <div className="phase-n num">{p.n}</div>
                <div className="phase-body">
                  <span className="phase-when">{p.when}</span>
                  <p className="small">{p.d}</p>
                  <span className="phase-target num">Typical range (clinical trials): {p.e}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="fine">Ranges reflect clinical-trial averages — individual results vary; your clinician sets expectations for you.</p>
        </section>

        {/* ── 04 · Components ── */}
        <section>
          <p className="eyebrow">04 · The pieces</p>
          <h2>What each piece is actually doing</h2>
          <div className="stack-md">
            {agents.map((a) => (
              <div className="agent" key={a.name}>
                <div className="agent-head">
                  <span className="agent-role">{a.role}</span>
                  <h3>{a.name} <span>{a.sub}</span></h3>
                </div>
                <dl>
                  {a.rows.map(([dt, dd]) => (
                    <FragmentRow key={dt} dt={dt} dd={dd} />
                  ))}
                </dl>
                {a.flag ? <div className="flag"><b>Caution</b><span>{a.flag}</span></div> : null}
              </div>
            ))}
          </div>
        </section>

        {/* ── 05 · Mistakes ── */}
        <section>
          <p className="eyebrow">05 · The traps</p>
          <h2>The four ways this goes wrong</h2>
          <div className="mistakes">
            {mistakes.map((m) => (
              <div className="mistake" key={m.b}>
                <b>{m.b}</b>
                <span>{m.s}</span>
                <span className="fix">{m.fix}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 06 · Scoreboard ── */}
        <section>
          <p className="eyebrow">06 · The scoreboard</p>
          <h2>Track these five. Ignore everything else.</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>Metric</th><th>Cadence</th><th>What it tells you</th></tr>
              </thead>
              <tbody>
                {metrics.map((r) => (
                  <tr key={r.m} className={r.primary ? "primary-row" : undefined}>
                    <td>{r.m}</td>
                    <td className="n">{r.cad}</td>
                    <td>{r.tells}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 07 · Provider close ── */}
        {top && (
          <section>
            <p className="eyebrow">07 · Next steps</p>
            <h2>None of this happens without a prescriber</h2>
            <div className="stack-md" ref={closeRef}>
              <div className="step step-1">
                <div className="step-label">
                  <b>Step 1</b>
                  <span>{top.displayName}{showPct ? ` · ${matchPct}% match to your intake` : ""}</span>
                </div>
                <h3>Start the medical intake at {top.displayName}</h3>
                {price ? (
                  <div className="price-line">
                    <span className="amt num">${price}<sub>/mo all-in</sub></span>
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
                <p className="fine" style={{ textAlign: "center", maxWidth: "none" }}>
                  Licensed US clinicians review every intake — you qualify with them, not with us.
                </p>
              </div>

              <div className="step">
                <div className="step-label"><b>Step 2</b><span>The consult</span></div>
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
                This page stays live at <a href={resultsUrl} style={{ color: "var(--lean)" }}>{resultsUrl.replace(/^https?:\/\//, "")}</a> — come back to it anytime.
              </p>
            </div>
          </section>
        )}

        <footer>
          <SiteDisclosure className="fine" />
          {detail?.complianceNote ? <p className="fine">{detail.complianceNote}</p> : null}
        </footer>
      </div>

      {/* Sticky CTA (the mock's bottom bar) */}
      {top && goHrefSticky ? (
        <div className={`sticky${stickyUp ? " is-up" : ""}`}>
          <div className="sticky-inner">
            <div className="txt">
              <b>{top.displayName}{price ? ` — from $${price}/mo` : ""}</b>
              <span>Step 1 · medical intake · ~10 min</span>
            </div>
            <a className="cta" href={goHrefSticky} onPointerDown={() => firePixel("results_sb")}>
              Start intake →
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
