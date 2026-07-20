import { useEffect, useRef, useState } from "react";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { trackMetaCustomEvent } from "@/lib/metaPixel";

// Paid-traffic bridge landing (/start). Three warm-up tap-questions — one per screen,
// instant advance — then a PROVIDER-ANONYMOUS handoff to whichever direct provider the
// server /go-direct/:provider route currently points at (today: Gala). The handoff copy
// (HANDOFF below) never names the provider, so future destination swaps don't touch it.
//
// STYLED TOWARD THE DESTINATION so their step 1 feels like our step 4. Current palette is
// Gala's (recon-extracted): white bg, slate text, emerald-green progress accent, dark
// near-black pill primary button, light gray borders. SYSTEM fonts only — no webfonts
// (we deliberately cleared the font critical path; do not reintroduce one here).

const GALA = {
  bg: "#FFFFFF",
  text: "#1F2937", // slate-800 body
  headline: "#1A1A1A", // near-black headline
  accent: "#047857", // emerald — progress accent (matches Gala)
  button: "#1F2937", // dark near-black pill primary CTA (matches Gala's "Next →")
  border: "#E5E7EB", // gray-200 card border
  muted: "#6B7280", // gray-500 secondary text
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

// Provider-anonymous handoff copy — SINGLE source of truth. Swapping the destination
// provider must NOT require editing any of this. No provider name, no provider-specific
// credentials (LegitScript/Trustpilot were DM's), no BMI (DM's opener), no price.
const HANDOFF = {
  headline: "Next: check your eligibility →",
  body: "A few quick questions to confirm you're a candidate — reviewed by licensed US clinicians. Takes about 2 minutes. No insurance needed.",
  trust: "Licensed US providers · no insurance required",
  cta: "Start my eligibility check →",
};

// Which provider the /start handoff sends to. Single swap-point on the client; the server
// /go-direct/:provider route owns the actual destination URL + subid param. HANDOFF_SUFFIX
// mirrors the server's cohort suffix for the Meta pixel sub1.
const HANDOFF_PROVIDER = "gala";
const HANDOFF_SUFFIX = "gdirect";

type Question = { q: number; title: string; options: string[] };

const QUESTIONS: Question[] = [
  {
    q: 1,
    title: "How long have you been trying to lose weight?",
    options: ["Under a year", "A few years", "As long as I can remember"],
  },
  {
    q: 2,
    title: "What's been the hardest part?",
    options: ["Hunger & cravings", "The weight always comes back", "No time or energy"],
  },
  {
    // Q3 option set changed 2026-07-20 (Gala-v2): priorities, not prior-attempts.
    q: 3,
    title: "What matters most to you?",
    options: ["Lowest monthly price", "No insurance needed", "Fastest start"],
  },
];

// Persist one answer to the visitor session BEFORE the eventual handoff, so partial
// funnels are still measurable. Fire-and-forget with keepalive so a pending write
// survives the outbound navigation.
function recordAnswer(sessionId: string, q: number, value: string) {
  try {
    void fetch("/api/bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, q, value }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    /* no-op */
  }
}

export default function Start() {
  // 0..2 = questions; 3 = handoff. Modeled as an index so an optional email-capture
  // screen can slot in between Q3 and the handoff later without reworking the flow.
  const [step, setStep] = useState(0);
  const sidRef = useRef<string>("");
  const pointerFired = useRef(false);
  const [handoffHref, setHandoffHref] = useState(`/go-direct/${HANDOFF_PROVIDER}?pos=bridge`);

  useEffect(() => {
    let sid = "";
    try {
      sid = getVisitorSessionId();
    } catch {
      /* no-op */
    }
    if (sid) {
      sidRef.current = sid;
      const p = new URLSearchParams({ sid, pos: "bridge" });
      setHandoffHref(`/go-direct/${HANDOFF_PROVIDER}?${p.toString()}`);
    }
    // Fresh visit always starts at Q1 (no hero, no scroll).
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);

  const answer = (q: number, value: string) => {
    recordAnswer(sidRef.current || "anon", q, value);
    try {
      trackMetaCustomEvent(`BridgeQ${q}`, { answer: value });
    } catch {
      /* no-op */
    }
    setStep((s) => s + 1);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  // DirectFunnelClick on pointerdown (before the anchor navigates) so the fbq beacon
  // isn't cancelled by unload — same pattern as HomepageCta.
  const fireDirectPixel = () => {
    try {
      const sid = sidRef.current || "anon";
      trackMetaCustomEvent("DirectFunnelClick", { sub1: `${sid}-${HANDOFF_SUFFIX}`, source: "bridge" });
    } catch {
      /* no-op */
    }
  };

  const isHandoff = step >= QUESTIONS.length;
  const current = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: GALA.bg,
        color: GALA.text,
        display: "flex",
        flexDirection: "column",
        fontFamily: GALA.sans,
      }}
    >
      {/* Small logo top — present, not competing. */}
      <header style={{ padding: "18px 20px 6px" }}>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em", color: GALA.headline }}>
          Peptide<span style={{ color: GALA.accent }}>Pilot</span>
        </span>
      </header>

      {/* Progress — 3 nodes, echoing Gala's green step indicator (steps 1-2-3). */}
      <div
        style={{ display: "flex", alignItems: "center", padding: "8px 24px 4px", maxWidth: 560, width: "100%", margin: "0 auto" }}
        aria-label={`Step ${Math.min(step + 1, 3)} of 3`}
      >
        {[0, 1, 2].map((i) => {
          const done = step > i || isHandoff;
          const active = step === i && !isHandoff;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "0 0 auto" }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `2px solid ${done || active ? GALA.accent : "#D1D5DB"}`,
                  background: done ? GALA.accent : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 auto",
                }}
              >
                {done ? (
                  <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>
                ) : active ? (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: GALA.accent }} />
                ) : null}
              </div>
              {i < 2 ? (
                <span
                  style={{ flex: 1, height: 2, margin: "0 6px", background: step > i || isHandoff ? GALA.accent : "#E5E7EB" }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 560,
          margin: "0 auto",
          padding: "24px 20px 40px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {!isHandoff ? (
          <>
            <h1
              style={{
                fontWeight: 600,
                fontSize: "clamp(26px, 6.5vw, 34px)",
                lineHeight: 1.2,
                margin: "8px 0 28px",
                color: GALA.headline,
              }}
            >
              {current.title}
            </h1>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {current.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => answer(current.q, opt)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "#fff",
                    border: `1px solid ${GALA.border}`,
                    borderRadius: 12,
                    padding: "20px 18px",
                    fontFamily: GALA.sans,
                    fontWeight: 500,
                    fontSize: 17,
                    color: GALA.text,
                    cursor: "pointer",
                    transition: "border-color 120ms, box-shadow 120ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = GALA.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = GALA.border)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <h1
              style={{
                fontWeight: 600,
                fontSize: "clamp(26px, 6.5vw, 34px)",
                lineHeight: 1.2,
                margin: "8px 0 16px",
                color: GALA.headline,
              }}
            >
              {HANDOFF.headline}
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.55, color: GALA.muted, margin: "0 0 28px" }}>{HANDOFF.body}</p>
            <a
              href={handoffHref}
              onPointerDown={() => {
                pointerFired.current = true;
                fireDirectPixel();
              }}
              onClick={() => {
                if (!pointerFired.current) fireDirectPixel();
                pointerFired.current = false;
              }}
              style={{
                display: "block",
                textAlign: "center",
                background: GALA.button,
                color: "#fff",
                borderRadius: 999,
                padding: "18px 24px",
                fontFamily: GALA.sans,
                fontWeight: 600,
                fontSize: 18,
                textDecoration: "none",
              }}
            >
              {HANDOFF.cta}
            </a>
            <p style={{ marginTop: 16, fontSize: 13, color: GALA.muted, textAlign: "center" }}>{HANDOFF.trust}</p>
          </div>
        )}
      </main>
    </div>
  );
}
