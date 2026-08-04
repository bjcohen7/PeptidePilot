declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      push?: (...args: unknown[]) => void;
      loaded?: boolean;
      version?: string;
      queue?: unknown[];
    };
    _fbq?: typeof window.fbq;
  }
}

const META_PIXEL_ID =
  (typeof import.meta.env !== "undefined" ? import.meta.env.VITE_META_PIXEL_ID?.trim() : undefined) ||
  "1053576873680593";

let initialized = false;

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getFbq() {
  return typeof window.fbq === "function" ? window.fbq : null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readCookie(name: string) {
  if (!canUseDom()) return null;
  const value = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

export function createMetaEventId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * LCP round 4 — polite pixel loading. initMetaPixel() installs ONLY the
 * standard fbq queue stub (synchronously, at boot) and queues fbq("init"),
 * so every fbq() call made before fbevents.js arrives is queued and flushed
 * when it loads — zero events lost. loadMetaPixelScript() injects the actual
 * fbevents.js and is called by main.tsx AFTER hydration + idle, keeping the
 * pixel's main-thread cost off the tap-critical window.
 */
export function initMetaPixel() {
  if (!canUseDom()) return;
  if (import.meta.env.DEV) return;
  if (!META_PIXEL_ID) return;
  if (initialized) return;

  try {
    if (!getFbq()) {
      const f = window;
      const n = function (...args: unknown[]) {
        if (typeof (n as Window["fbq"])?.callMethod === "function") {
          (n as any).callMethod(...args);
          return;
        }
        (n as any)?.queue?.push(args);
      } as Window["fbq"];
      if (!f._fbq) f._fbq = n;
      (n as any).push = n;
      (n as any).loaded = true;
      (n as any).version = "2.0";
      (n as any).queue = [];
      f.fbq = n;
    }

    const fbq = getFbq();
    if (!fbq) return;

    fbq("init", META_PIXEL_ID);
    initialized = true;
  } catch (error) {
    console.error("[Meta Pixel] Failed to initialize", error);
  }
}

let scriptLoaded = false;

/** Inject fbevents.js — call after hydration/idle; queued events flush on load. */
export function loadMetaPixelScript() {
  if (!canUseDom()) return;
  if (import.meta.env.DEV) return;
  // Automation guard (2026-08-04): headless captures/bots must not fire real
  // pixel events. The fbq stub still queues silently; the script never loads.
  if (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent)) return;
  if (scriptLoaded) return;
  scriptLoaded = true;
  try {
    const t = document.createElement("script");
    t.async = true;
    t.src = "https://connect.facebook.net/en_US/fbevents.js";
    const first = document.getElementsByTagName("script").item(0);
    first?.parentNode?.insertBefore(t, first);
  } catch (error) {
    console.error("[Meta Pixel] Failed to load fbevents.js", error);
  }
}

export function trackMetaPageView() {
  if (import.meta.env.DEV) return;

  try {
    const fbq = getFbq();
    if (!fbq) return;
    fbq("track", "PageView");
  } catch (error) {
    console.error("[Meta Pixel] Failed to track PageView", error);
  }
}

export function applyMetaAdvancedMatching(email: string) {
  if (import.meta.env.DEV) return;

  try {
    const fbq = getFbq();
    if (!fbq) return;
    fbq("init", META_PIXEL_ID, { em: normalizeEmail(email) });
  } catch (error) {
    console.error("[Meta Pixel] Failed to apply advanced matching", error);
  }
}

export function getMetaBrowserIdentifiers() {
  return {
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc"),
  };
}

/**
 * Fires a custom browser-side Meta Pixel event (e.g. "AffiliateClick").
 * Pass the same eventId to the CAPI backend endpoint so Facebook can
 * deduplicate the browser and server events within the 48-hour window.
 */
export function trackMetaCustomEvent(
  name: string,
  params?: Record<string, unknown>,
  eventId?: string
) {
  if (import.meta.env.DEV) return;

  try {
    const fbq = getFbq();
    if (!fbq) return;
    if (eventId) {
      fbq("trackCustom", name, params ?? {}, { eventID: eventId });
      return;
    }
    fbq("trackCustom", name, params ?? {});
  } catch (error) {
    console.error(`[Meta Pixel] Failed to track custom event ${name}`, error);
  }
}

export function trackMetaEvent(
  name: "Lead" | "CompleteRegistration" | "ViewContent",
  params?: Record<string, unknown>,
  eventId?: string
) {
  if (import.meta.env.DEV) return;

  try {
    const fbq = getFbq();
    if (!fbq) return;
    if (eventId) {
      fbq("track", name, params ?? {}, { eventID: eventId });
      return;
    }
    fbq("track", name, params ?? {});
  } catch (error) {
    console.error(`[Meta Pixel] Failed to track ${name}`, error);
  }
}
