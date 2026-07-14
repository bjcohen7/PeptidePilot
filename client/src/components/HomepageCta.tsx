import { useEffect, useRef, useState, type ReactNode } from "react";
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

export function HomepageCta({
  children,
  placement,
}: {
  children: ReactNode;
  // Which homepage slot this CTA is (hero vs a lower repeat) — passed to
  // /go-direct/gala as ?pos= so the click log can attribute placement.
  placement?: "hero" | "footer";
}) {
  const [mode, setMode] = useState<CtaMode>("gala");
  const [href, setHref] = useState(placement ? `/go-direct/gala?pos=${placement}` : "/go-direct/gala");
  const pointerFired = useRef(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/cta-mode")
      .then((r) => r.json())
      .then((d) => {
        if (alive && (d?.mode === "quiz" || d?.mode === "gala" || d?.mode === "split")) setMode(d.mode);
      })
      .catch(() => {});
    // Attach the visitor sessionId to the outbound href once client-side, so the
    // natural anchor navigation carries it. Prerender/no-JS keeps the bare
    // /go-direct/gala (still valid — the server falls back to 'anon').
    let sid = "";
    try {
      sid = getVisitorSessionId();
    } catch {
      /* no-op */
    }
    if (sid) {
      const p = new URLSearchParams({ sid });
      if (placement) p.set("pos", placement);
      setHref(`/go-direct/gala?${p.toString()}`);
    }
    return () => {
      alive = false;
    };
  }, [placement]);

  const goDirect =
    mode === "gala" ||
    (mode === "split" && typeof window !== "undefined" && hashToGala(getVisitorSessionId()));

  if (!goDirect) {
    // quiz (or split→quiz): unchanged quiz-flow entry — no pixel, client-side nav.
    return <Link href="/quiz">{children}</Link>;
  }

  // Fire DirectFunnelClick on POINTERDOWN — before the anchor navigates — so the fbq
  // beacon isn't cancelled by page unload. (The old onClick fired fbq then immediately
  // window.location.assign()'d, so navigation killed the request and Meta received 0
  // events.) The click then navigates naturally to the sid'd href, same-tab, with no
  // artificial delay. Keyboard activation has no pointerdown, so onClick fires it then;
  // a per-interaction ref prevents a double count.
  const firePixel = () => {
    let sid = "anon";
    try {
      sid = getVisitorSessionId();
    } catch {
      /* no-op */
    }
    try {
      trackMetaCustomEvent("DirectFunnelClick", { sub1: `${sid}-gdirect` });
    } catch {
      /* no-op */
    }
  };

  return (
    <a
      href={href}
      onPointerDown={() => {
        pointerFired.current = true;
        firePixel();
      }}
      onClick={() => {
        if (!pointerFired.current) firePixel();
        pointerFired.current = false;
      }}
    >
      {children}
    </a>
  );
}
