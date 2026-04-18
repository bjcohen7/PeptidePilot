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
  import.meta.env.VITE_META_PIXEL_ID?.trim() || "26875589488702265";

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

export function initMetaPixel() {
  if (!canUseDom()) return;
  if (import.meta.env.DEV) return;
  if (!META_PIXEL_ID) return;
  if (initialized) return;

  try {
    if (!getFbq()) {
      ((f: Window, b: Document, e: string, v: string, n?: Window["fbq"], t?: HTMLScriptElement, s?: HTMLCollectionOf<Element>) => {
        if (typeof f.fbq === "function") return;
        n = function (...args: unknown[]) {
          if (typeof n?.callMethod === "function") {
            n.callMethod(...args);
            return;
          }

          n?.queue?.push(args);
        } as Window["fbq"];

        if (!n) return;

        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e) as HTMLScriptElement;
        t.async = true;
        t.src = v;
        s = b.getElementsByTagName(e);
        const firstScript = s.item(0);
        firstScript?.parentNode?.insertBefore(t, firstScript);
        f.fbq = n;
      })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    }

    const fbq = getFbq();
    if (!fbq) return;

    fbq("init", META_PIXEL_ID);
    initialized = true;
  } catch (error) {
    console.error("[Meta Pixel] Failed to initialize", error);
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
