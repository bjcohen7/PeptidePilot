import { useEffect, useRef, useState } from "react";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { trackMetaCustomEvent } from "@/lib/metaPixel";

// Paid-traffic bridge landing (/start). Three warm-up tap-questions — one per screen,
// instant advance — then a handoff to Direct Meds' BMI/eligibility quiz via the existing
// /go-direct/direct_med redirect (pos=bridge → provider_click_logs 'home_direct_brdg').
//
// STYLED TOWARD DIRECT MEDS (not our brand) so their step 1 feels like our step 4: their
// palette (#F7F3EF cream bg, #0AB0FB primary, #212529 text), full-pill buttons, Lora
// serif headings, white tap-cards, and a 3-node progress bar in their visual language
// (their bar is Start→Details→Eligibility; ours is steps 1-2-3 of "Start").
//
// The three questions deliberately avoid every topic DM asks downstream (goal, goal-weight,
// gender, symptoms, priority, motivation, pace, sleep, current GLP-1 use) — they cover the
// struggle history DM never asks, so nothing is repeated across the handoff.

const DM = {
  bg: "#F7F3EF",
  text: "#212529",
  primary: "#0AB0FB",
  border: "#DEE2E6",
  muted: "#6B7280",
  serif: "'Lora', Georgia, 'Times New Roman', serif",
};

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
    q: 3,
    title: "What have you tried so far?",
    options: ["Diet & exercise", "Other programs or pills", "This is my first real step"],
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
  const [handoffHref, setHandoffHref] = useState("/go-direct/direct_med?pos=bridge");

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
      setHandoffHref(`/go-direct/direct_med?${p.toString()}`);
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
      trackMetaCustomEvent("DirectFunnelClick", { sub1: `${sid}-dmdirect`, source: "bridge" });
    } catch {
      /* no-op */
    }
  };

  const onHandoff = QUESTIONS.length; // step index of the handoff screen (3)
  const isHandoff = step >= onHandoff;
  const current = QUESTIONS[Math.min(step, QUESTIONS.length - 1)];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: DM.bg,
        color: DM.text,
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "'Helvetica Neue', Helvetica, -apple-system, BlinkMacSystemFont, Arial, sans-serif",
      }}
    >
      {/* Small logo top — present, not competing. */}
      <header style={{ padding: "18px 20px 6px" }}>
        <span
          style={{
            fontFamily: DM.serif,
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: "-0.01em",
            color: DM.text,
          }}
        >
          Peptide<span style={{ color: DM.primary }}>Pilot</span>
        </span>
      </header>

      {/* Progress — 3 nodes, DM visual language (Start steps 1-2-3). */}
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
                  border: `2px solid ${done || active ? DM.primary : "rgba(56,49,44,0.25)"}`,
                  background: done ? DM.primary : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 auto",
                }}
              >
                {done ? (
                  <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>
                ) : active ? (
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: DM.primary }} />
                ) : null}
              </div>
              {i < 2 ? (
                <span
                  style={{
                    flex: 1,
                    height: 2,
                    margin: "0 6px",
                    background: step > i || isHandoff ? DM.primary : "rgba(56,49,44,0.2)",
                  }}
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
                fontFamily: DM.serif,
                fontWeight: 500,
                fontSize: "clamp(28px, 7vw, 40px)",
                lineHeight: 1.15,
                margin: "8px 0 28px",
                color: DM.text,
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
                    textAlign: "center",
                    background: "#fff",
                    border: `1px solid ${DM.border}`,
                    borderRadius: 14,
                    padding: "22px 18px",
                    fontFamily: DM.serif,
                    fontWeight: 600,
                    fontSize: 19,
                    color: DM.text,
                    cursor: "pointer",
                    transition: "border-color 120ms, box-shadow 120ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = DM.primary)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = DM.border)}
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
                fontFamily: DM.serif,
                fontWeight: 500,
                fontSize: "clamp(28px, 7vw, 40px)",
                lineHeight: 1.15,
                margin: "8px 0 16px",
                color: DM.text,
              }}
            >
              Last step: a quick <span style={{ color: DM.primary }}>BMI check</span> with Direct
              Meds to confirm you're a candidate&nbsp;→
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.5, color: DM.muted, margin: "0 0 28px" }}>
              Direct Meds is LegitScript-certified · Trustpilot-rated. Takes about a minute.
            </p>
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
                background: DM.primary,
                color: "#fff",
                borderRadius: 32,
                padding: "18px 24px",
                fontFamily: DM.serif,
                fontWeight: 500,
                fontSize: 20,
                textDecoration: "none",
              }}
            >
              Check my eligibility →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
