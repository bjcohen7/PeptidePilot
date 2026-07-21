import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { trackMetaCustomEvent } from "@/lib/metaPixel";

// Homepage CTA target selector for the direct-flow experiment.
//   quiz  → our normal quiz flow (/quiz)  [DEFAULT — paid traffic paused Jul 21]
//   gala  → the /start warm-up bridge (3 taps → Direct Meds handoff)
//   split → deterministic 50/50 on the visitor sessionId (/start vs /quiz)
// Mode comes from HOMEPAGE_CTA_MODE via /api/cta-mode, read at runtime so the env can
// flip without a rebuild. Default is now 'quiz' — the safe organic state; it's also the
// SSR/prerender value, so the prerendered homepage ships /quiz anchors (plain curl shows
// /quiz). To relaunch the direct/bridge flow post-certification, set HOMEPAGE_CTA_MODE=gala.
//
// The direct CTA now enters the /start bridge, NOT the provider redirect directly. The
// deeper DirectFunnelClick pixel stays owned by the /start→Direct Meds handoff; here we
// fire a lighter BridgeStart signal on funnel entry (firing DirectFunnelClick here too
// would double-count and mislabel bridge non-completers as having reached the provider).
type CtaMode = "quiz" | "gala" | "split";

function hashToGala(sessionId: string): boolean {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) h = (h * 31 + sessionId.charCodeAt(i)) >>> 0;
  return h % 2 === 0;
}

export function HomepageCta({
  children,
  placement,
}: {
  children: ReactNode;
  // Which homepage slot this CTA is (hero vs a lower repeat) — passed to /start as
  // ?pos= for placement attribution.
  placement?: "hero" | "footer";
}) {
  const [mode, setMode] = useState<CtaMode>("quiz");

  useEffect(() => {
    let alive = true;
    fetch("/api/cta-mode")
      .then((r) => r.json())
      .then((d) => {
        if (alive && (d?.mode === "quiz" || d?.mode === "gala" || d?.mode === "split")) setMode(d.mode);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const goDirect =
    mode === "gala" ||
    (mode === "split" && typeof window !== "undefined" && hashToGala(getVisitorSessionId()));

  if (!goDirect) {
    // quiz (or split→quiz): unchanged quiz-flow entry.
    return <Link href="/quiz">{children}</Link>;
  }

  // Direct flow → the /start bridge. Client-side nav (wouter Link), so the BridgeStart
  // pixel fires safely on click without an unload race. /start reads the sessionId from
  // localStorage itself, so it doesn't need to be carried in the URL.
  const startHref = placement ? `/start?pos=${placement}` : "/start";
  const fireBridgeStart = () => {
    try {
      trackMetaCustomEvent("BridgeStart", placement ? { placement } : {});
    } catch {
      /* no-op */
    }
  };

  return (
    <Link href={startHref} onClick={fireBridgeStart}>
      {children}
    </Link>
  );
}
