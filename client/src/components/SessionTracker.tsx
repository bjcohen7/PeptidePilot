import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { trackMetaPageView } from "@/lib/metaPixel";
import { trpc } from "@/lib/trpc";

const VISITOR_SESSION_KEY = "peptidepilot_visitor_session_id";

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `pp_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function getOrCreateVisitorSessionId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(VISITOR_SESSION_KEY);
  if (existing) return existing;

  const created = createSessionId();
  window.localStorage.setItem(VISITOR_SESSION_KEY, created);
  return created;
}

function normalizePath(path: string) {
  return path || "/";
}

function shouldTrackPath(path: string) {
  return !path.startsWith("/admin");
}

function extractClickLabel(target: Element) {
  const explicit = target.getAttribute("data-track-label");
  if (explicit) return explicit;

  const aria = target.getAttribute("aria-label");
  if (aria) return aria.trim();

  const text = target.textContent?.replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, 255);

  return target.tagName.toLowerCase();
}

export function getVisitorSessionId() {
  return getOrCreateVisitorSessionId();
}

function sendSessionStart(payload: {
  sessionId: string;
  landingPath: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  userAgent: string;
}) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(
      "/api/analytics/session-start",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  void fetch("/api/analytics/session-start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch((error) => {
    console.error("[Analytics] Failed to start session:", error);
  });
}

export default function SessionTracker() {
  const [location] = useLocation();
  const trackPageView = trpc.analytics.trackPageView.useMutation();
  const sessionId = useMemo(() => getOrCreateVisitorSessionId(), []);
  const currentPathRef = useRef(normalizePath(location));
  const enteredAtRef = useRef(Date.now());
  const startedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !shouldTrackPath(location)) return;

    if (!startedRef.current) {
      const params = new URLSearchParams(window.location.search);
      sendSessionStart({
        sessionId,
        landingPath: normalizePath(location),
        referrer: document.referrer || null,
        utmSource: params.get("utm_source"),
        utmMedium: params.get("utm_medium"),
        utmCampaign: params.get("utm_campaign"),
        utmContent: params.get("utm_content"),
        utmTerm: params.get("utm_term"),
        userAgent: navigator.userAgent,
      });
      startedRef.current = true;
      currentPathRef.current = normalizePath(location);
      enteredAtRef.current = Date.now();
      trackMetaPageView();
      return;
    }

    const previousPath = currentPathRef.current;
    const previousEnteredAt = enteredAtRef.current;
    const nextPath = normalizePath(location);

    if (previousPath !== nextPath && shouldTrackPath(previousPath)) {
      const durationMs = Math.max(0, Date.now() - previousEnteredAt);
      trackPageView.mutate({
        sessionId,
        path: previousPath,
        durationMs,
        referrer: document.referrer || null,
      });
    }

    currentPathRef.current = nextPath;
    enteredAtRef.current = Date.now();
    if (shouldTrackPath(nextPath)) {
      trackMetaPageView();
    }
  }, [location, sessionId, trackPageView]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sendFinalPageView = () => {
      const path = currentPathRef.current;
      if (!shouldTrackPath(path)) return;

      const payload = {
        sessionId,
        path,
        durationMs: Math.max(0, Date.now() - enteredAtRef.current),
        referrer: document.referrer || null,
      };

      navigator.sendBeacon?.(
        "/api/analytics/page-view",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );
    };

    window.addEventListener("pagehide", sendFinalPageView);
    return () => window.removeEventListener("pagehide", sendFinalPageView);
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a, button, [data-track-click]") : null;
      if (!target) return;

      const path = currentPathRef.current;
      if (!shouldTrackPath(path)) return;

      const isAnchor = target instanceof HTMLAnchorElement;
      const href = isAnchor ? target.href : null;
      const label = extractClickLabel(target);

      const payload = {
        sessionId,
        path,
        label,
        targetHref: href,
        eventType: isAnchor
          ? href && href.startsWith(window.location.origin)
            ? "internal-link"
            : "external-link"
          : "button",
      };

      navigator.sendBeacon?.(
        "/api/analytics/click",
        new Blob([JSON.stringify(payload)], { type: "application/json" })
      );
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [sessionId]);

  return null;
}
