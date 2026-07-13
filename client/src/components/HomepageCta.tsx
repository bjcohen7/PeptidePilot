import { useEffect, useState, type ReactNode, type MouseEvent } from "react";
import { Link } from "wouter";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { trackMetaCustomEvent } from "@/lib/metaPixel";

// Homepage CTA target selector for the direct-to-Gala experiment.
//   quiz  → our normal quiz flow (/quiz)
//   gala  → straight into Gala's funnel via /go-direct/gala (DEFAULT)
//   split → deterministic 50/50 on the visitor sessionId
// Mode comes from HOMEPAGE_CTA_MODE via /api/cta-mode, read at runtime so the env
// can flip without a rebuild. Default 'gala' — also the SSR/prerender value, so the
// prerendered homepage ships gala anchors (plain curl shows /go-direct/gala).
type CtaMode = "quiz" | "gala" | "split";

function hashToGala(sessionId: string): boolean {
  let h = 0;
  for (let i = 0; i < sessionId.length; i++) h = (h * 31 + sessionId.charCodeAt(i)) >>> 0;
  return h % 2 === 0;
}

export function HomepageCta({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<CtaMode>("gala");

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
    // quiz (or split→quiz): unchanged quiz-flow entry — no pixel, client-side nav.
    return <Link href="/quiz">{children}</Link>;
  }

  const handleDirect = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    let sid = "anon";
    try {
      sid = getVisitorSessionId();
    } catch {
      /* no-op */
    }
    // Fire-and-forget; must never block or delay the outbound navigation.
    try {
      trackMetaCustomEvent("DirectFunnelClick", { sub1: `${sid}-gdirect` });
    } catch {
      /* no-op */
    }
    window.location.assign(`/go-direct/gala?sid=${encodeURIComponent(sid)}`);
  };

  // Base href (no sid) so no-JS / curl still resolves and shows /go-direct/gala;
  // the onClick attaches the sid and fires the pixel for real (JS) visitors.
  return (
    <a href="/go-direct/gala" onClick={handleDirect}>
      {children}
    </a>
  );
}
