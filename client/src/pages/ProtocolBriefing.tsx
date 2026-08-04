import { useMemo } from "react";
import { matchPercentFromFitScore, shouldDisplayMatchPercent } from "@shared/matchDisplay";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { SiteDisclosure } from "@/components/SiteDisclosure";

/**
 * Protocol-Briefing results page (RESULTS_PAGE_MODE=briefing, default).
 * Structure adopted from the partner mock (reference/partner-mock/), with the
 * honest-machine substitutions:
 *  - promo section is CONFIG-GATED (providers.promo_code + GALA_PROMO_TERMS env);
 *    both unset → fully hidden. The mock's PILOT30/"$99×2mo" were fabricated.
 *  - "intake code" theater → the lead's real publicId short-ref + results-link
 *    permanence framing. No implication the provider asks for a code.
 *  - Tesamorelin removed from components (provider doesn't dispense it);
 *    combination-therapy interest lives in the consult questions.
 *  - Phase expectations labeled "Typical range (clinical trials):" with numbers
 *    aligned to STEP (semaglutide) / SURMOUNT (tirzepatide) trajectories,
 *    computed from the lead's real weight when present; generic %-ranges
 *    otherwise. Disclaimer at section end.
 *  - Match % is the REAL computed percent; stat strip renders only fields the
 *    lead actually provided (no blanks, no invented values).
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

const INK = "#16213A";
const MUTED = "#5B6378";
const ACCENT = "#138A5E";
const LINE = "#E6EBF2";
const CARD = "#FFFFFF";
const WASH = "#F7F9FB";

function Section({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: "40px 0 8px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: ACCENT, marginBottom: 6 }}>{kicker}</div>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(22px,4.5vw,30px)", lineHeight: 1.15, color: INK, margin: "0 0 18px" }}>{title}</h2>
      {children}
    </section>
  );
}

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
  // as it was THEN. Never show a row whose $ figure contradicts today's price —
  // drop it rather than showing two prices on one page.
  const whyRows = (top?.whyMatch ?? []).filter((w) => {
    const dollars = w.match(/\$(\d+)/g);
    if (!dollars || price == null) return true;
    return dollars.every((d) => d === `$${price}`);
  });

  // Real body metrics only when the lead gave them (BMI calculator). Never invent.
  const bmi = heightIn && weightLbs ? (703 * weightLbs) / (heightIn * heightIn) : null;
  const stats = useMemo(() => {
    const s: { label: string; value: string }[] = [];
    if (weightLbs) s.push({ label: "Current weight", value: `${weightLbs} lb` });
    if (heightIn) s.push({ label: "Height", value: `${Math.floor(heightIn / 12)}'${heightIn % 12}"` });
    if (bmi) s.push({ label: "BMI", value: bmi.toFixed(1) });
    if (leadQuizData.primaryGoal) s.push({ label: "Stated goal", value: leadQuizData.primaryGoal });
    if (leadQuizData.budget) s.push({ label: "Budget", value: leadQuizData.budget });
    if (leadQuizData.insurance) {
      s.push({
        label: "Coverage",
        value: leadQuizData.insurance === "uninsured" ? "Cash-pay"
          : leadQuizData.insurance === "medicare" ? "Medicare/Medicaid"
          : "Commercial insurance",
      });
    }
    return s;
  }, [weightLbs, heightIn, bmi, leadQuizData]);

  // Trajectory bands from STEP (semaglutide ~15% at 68wk; ~5-6% by wk 8; ~10-13%
  // by wk 28) and SURMOUNT (tirzepatide ~19.5-20.9% at 72wk). Computed from real
  // weight when present; otherwise expressed as % of body weight.
  const traj = useMemo(() => {
    const pct = (lo: number, hi: number, suffix = "") =>
      weightLbs
        ? `${Math.round((weightLbs * lo) / 100)}–${Math.round((weightLbs * hi) / 100)} lb down${suffix}`
        : `${lo}–${hi}% of body weight down${suffix}`;
    return {
      p1: pct(4, 6),
      p2: pct(10, 14, " from start"),
      p3: weightLbs
        ? `${Math.round(weightLbs * 0.8)}–${Math.round(weightLbs * 0.85)} lb landing weight (15–20% total)`
        : "15–20% total body-weight reduction",
    };
  }, [weightLbs]);

  const goHref = top ? `/go/${top.slug}/${publicId}?position=results_sp` : null;

  // Same-tab nav to /go → 302 → provider: fire on POINTERDOWN, before unload
  // (the DirectFunnelClick lesson). Server-side logging rides the /go route.
  const firePixel = () => {
    try {
      trackMetaCustomEvent("ProviderHandoff", {
        source: "results",
        position: "results_sp",
        content_category: "weight-management",
      });
    } catch { /* no-op */ }
  };

  const components = [
    {
      name: "GLP-1 therapy",
      sub: "semaglutide · tirzepatide — prescriber-selected",
      what: "Regulates appetite and slows gastric emptying so the deficit is sustainable instead of white-knuckled. The most clinically validated tool in this plan.",
      caution: "Dose is titrated upward over months by your prescriber — rushing titration is the most common source of side effects.",
    },
    {
      name: "Resistance training",
      sub: "3× / week, progressive",
      what: "The signal that tells your body to keep muscle while weight drops. Without it, a meaningful share of scale loss comes from lean mass.",
      caution: "This is the piece most people skip — it is what separates the two paths above.",
    },
    {
      name: "Protein + sleep",
      sub: "~0.7g/lb target · 7+ hours",
      what: "Protein gives retained muscle its raw material; sleep drives the recovery hormones that make training stick.",
      caution: "Appetite suppression makes under-eating protein easy — track it for the first month.",
    },
  ];

  const failures = [
    { t: "Treating the scale as the scoreboard", d: "If waist is dropping and the scale isn't, the protocol is working. If the scale is dropping and your lifts are falling, it isn't — that's the signal to talk to your prescriber." },
    { t: "Skipping the training because you're not hungry", d: "Appetite suppression makes it easy to under-eat and under-train. The muscle you lose this way is the hardest thing to get back." },
    { t: "Rushing the dose", d: "Titration schedules exist because side effects cluster around dose jumps. Let your prescriber drive." },
    { t: "Quitting in month four", d: "The cost and the plateau usually hit together. A plan you can afford for twelve months beats a sprint you abandon." },
  ];

  const metrics = ["Waist (weekly, same conditions)", "Weight 7-day average (not daily readings)", "Protein intake (daily, first month)", "Training sessions completed (weekly)", "Sleep duration (nightly)"];

  const consultQs = [
    "Which medication and starting dose fit my history?",
    "What does the titration schedule look like for me?",
    "Ask your clinician about combination or adjunct therapies — what's evidence-backed for your case, and what isn't.",
    "What should trigger a check-in before the next scheduled one?",
  ];

  return (
    <div style={{ background: WASH, minHeight: "100vh", fontFamily: "Inter, 'Inter Fallback', system-ui, sans-serif", color: INK }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 26 }}>
          Peptide<span style={{ color: ACCENT }}>Pilot</span> <span style={{ color: MUTED, fontWeight: 400 }}>· Protocol Briefing</span>
          {firstName ? <span style={{ display: "block", color: MUTED, fontWeight: 400, marginTop: 2 }}>Prepared for {firstName}</span> : null}
        </div>

        {/* ── Hero synthesis ── */}
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(28px,6vw,40px)", lineHeight: 1.12, margin: "0 0 14px" }}>
          You don't have a weight problem. <span style={{ color: ACCENT }}>You have a ratio problem.</span>
        </h1>
        <p style={{ color: MUTED, fontSize: 16, lineHeight: 1.6 }}>
          Losing weight is the easy half. Losing the <em>right</em> weight — fat, not muscle — is the half that decides whether you like the result in twelve months. Here's your read, your plan, and the places most people blow it.
        </p>

        {/* ── Stat strip (real answers only) ── */}
        {stats.length > 0 && (
          <Section kicker="01 · The read" title="What your answers add up to">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
              {stats.map((s) => (
                <div key={s.label} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: MUTED }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{s.value}</div>
                </div>
              ))}
            </div>
            {whyRows.length ? (
              <div style={{ marginTop: 14, background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: "14px 16px" }}>
                {whyRows.slice(0, 3).map((w, i) => (
                  <p key={i} style={{ margin: i ? "8px 0 0" : 0, fontSize: 14, lineHeight: 1.5, color: INK }}>• {w}</p>
                ))}
              </div>
            ) : null}
          </Section>
        )}

        {/* ── Two paths ── */}
        <Section kicker="02 · The finding" title="Two ways to lose the same weight">
          <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.6 }}>
            Across the body-composition arms of the major GLP-1 trials, roughly <strong style={{ color: INK }}>a quarter to 40% of weight lost on medication alone comes from lean mass</strong> (Wilding 2021 — STEP 1; Jastreboff 2022 — SURMOUNT-1 sub-studies). Same scale number, very different body — unless the deficit is aimed at fat and the muscle is defended.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
            <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#C2335A" }}>GLP-1 ALONE</div>
              <p style={{ fontSize: 14, color: MUTED, margin: "8px 0 0", lineHeight: 1.5 }}>Up to ~40% of the loss can be muscle. Lighter, but weaker — and a slower metabolism to maintain it with.</p>
            </div>
            <div style={{ background: CARD, border: `2px solid ${ACCENT}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>PROTECTED PATH</div>
              <p style={{ fontSize: 14, color: MUTED, margin: "8px 0 0", lineHeight: 1.5 }}>Medication + training + protein. The loss comes overwhelmingly from fat; strength holds.</p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>The scale can't tell you which of these you became. That's why the scale is not your primary metric.</p>
        </Section>

        {/* ── Phases ── */}
        <Section kicker="03 · The plan" title="Twelve months, three phases">
          {[
            { w: "Weeks 1–8 · Foundation", d: "Establish the deficit without losing ground. Medication titrates up; training starts light; protein target locks in.", e: traj.p1 },
            { w: "Weeks 9–28 · Recomposition", d: "The second lever changes the scoreboard: progressive training while the medication holds appetite down. Visible change outpaces scale change.", e: traj.p2 },
            { w: "Weeks 29–52 · Consolidation", d: "Land it and keep it. Maintenance dose and habits get defined with your clinician — this phase decides whether month 13 looks like month 12.", e: traj.p3 },
          ].map((p) => (
            <div key={p.w} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>{p.w}</div>
              <p style={{ fontSize: 14, color: INK, margin: "6px 0", lineHeight: 1.5 }}>{p.d}</p>
              <div style={{ fontSize: 13, color: MUTED, background: WASH, borderRadius: 8, padding: "8px 10px" }}>
                <strong>Typical range (clinical trials):</strong> {p.e}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, color: MUTED }}>Ranges reflect clinical-trial averages — individual results vary; your clinician sets expectations for you.</p>
        </Section>

        {/* ── Components ── */}
        <Section kicker="04 · The pieces" title="What each piece is actually doing">
          {components.map((c) => (
            <div key={c.name} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ fontWeight: 700 }}>{c.name} <span style={{ fontWeight: 400, color: MUTED, fontSize: 13 }}>{c.sub}</span></div>
              <p style={{ fontSize: 14, margin: "6px 0", lineHeight: 1.5 }}>{c.what}</p>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>⚠ {c.caution}</p>
            </div>
          ))}
        </Section>

        {/* ── Failure modes ── */}
        <Section kicker="05 · The traps" title="The four ways this goes wrong">
          {failures.map((f) => (
            <div key={f.t} style={{ borderLeft: `3px solid ${LINE}`, padding: "4px 0 4px 14px", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{f.t}</div>
              <p style={{ fontSize: 14, color: MUTED, margin: "4px 0 0", lineHeight: 1.5 }}>{f.d}</p>
            </div>
          ))}
        </Section>

        {/* ── Metrics ── */}
        <Section kicker="06 · The scoreboard" title="Track these five. Ignore everything else.">
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {metrics.map((m) => <li key={m} style={{ fontSize: 15, lineHeight: 1.9 }}>{m}</li>)}
          </ol>
        </Section>

        {/* ── Provider close ── */}
        {top && (
          <Section kicker="07 · Next steps" title="None of this happens without a prescriber">
            <div style={{ background: CARD, border: `2px solid ${ACCENT}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {top.displayName}{showPct ? <span style={{ color: ACCENT }}> — {matchPct}% match to your intake</span> : null}
              </div>
              {whyRows[0] ? <p style={{ fontSize: 14, color: MUTED, margin: "8px 0 0", lineHeight: 1.5 }}>{whyRows[0]}</p> : null}
              {price ? (
                <p style={{ fontSize: 14, margin: "12px 0 0", lineHeight: 1.6 }}>
                  <strong>${price}/mo all-in.</strong> Typical cash-pay GLP-1 runs $300–$1,000+/mo — over twelve months, that gap is the whole reason people quit in month four.
                </p>
              ) : null}
              {/* Promo — CONFIG-GATED: renders ONLY when a real code exists on the provider row. */}
              {detail?.promoCode ? (
                <div style={{ marginTop: 12, background: WASH, borderRadius: 10, padding: "10px 12px", fontSize: 14 }}>
                  Code <strong>{detail.promoCode}</strong> applied at checkout{promoTerms ? ` — ${promoTerms}` : ""}.
                </div>
              ) : null}
              {goHref && (
                <a
                  href={goHref}
                  onPointerDown={firePixel}
                  style={{ display: "block", textAlign: "center", background: ACCENT, color: "#fff", borderRadius: 999, padding: "16px 22px", fontWeight: 700, fontSize: 16, textDecoration: "none", marginTop: 16 }}
                >
                  Start my Phase 1 intake at {top.displayName} →
                </a>
              )}
              <p style={{ fontSize: 12, color: MUTED, textAlign: "center", marginTop: 10 }}>
                Licensed US clinicians review every intake — you qualify with them, not with us.
              </p>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>What to ask in the consult</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {consultQs.map((q) => <li key={q} style={{ fontSize: 14, lineHeight: 1.8, color: INK }}>{q}</li>)}
              </ul>
            </div>

            {/* Real reference, not code theater: publicId short-ref + permanence. */}
            <div style={{ marginTop: 18, background: CARD, border: `1px solid ${LINE}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: MUTED }}>Your results reference</div>
              <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, fontSize: 18, letterSpacing: "0.06em", margin: "4px 0" }}>{publicId.slice(0, 8).toUpperCase()}</div>
              <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>This page stays live at <a href={resultsUrl} style={{ color: ACCENT }}>{resultsUrl.replace(/^https?:\/\//, "")}</a> — come back to it anytime.</p>
            </div>
          </Section>
        )}

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${LINE}` }}>
          <SiteDisclosure style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }} />
          {detail?.complianceNote ? <p style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{detail.complianceNote}</p> : null}
        </div>
      </div>
    </div>
  );
}
