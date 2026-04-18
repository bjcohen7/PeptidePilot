const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "26875589488702265";

type MetaEventParams = Record<string, string | number | boolean | null | undefined>;

type FbqFn = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => number;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

let initialized = false;

function shouldEnableMetaPixel() {
  return typeof window !== "undefined" && import.meta.env.PROD && Boolean(META_PIXEL_ID);
}

function bootstrapFbq() {
  if (typeof window.fbq === "function") return window.fbq;

  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
      return;
    }

    fbq.queue?.push(args);
  } as FbqFn;

  if (!fbq.queue) fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = (...args: unknown[]) => fbq.queue!.push(args);

  window.fbq = fbq;
  window._fbq = fbq;
  return fbq;
}

function loadMetaPixelScript() {
  const existing = document.querySelector<HTMLScriptElement>('script[data-meta-pixel="true"]');
  if (existing) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.dataset.metaPixel = "true";
  document.head.appendChild(script);
}

export function initMetaPixel() {
  if (!shouldEnableMetaPixel() || initialized) return;

  try {
    const fbq = bootstrapFbq();
    loadMetaPixelScript();
    fbq("init", META_PIXEL_ID);
    initialized = true;
  } catch (error) {
    console.error("[Meta Pixel] Failed to initialize", error);
  }
}

export function trackMetaPageView() {
  if (!shouldEnableMetaPixel()) return;
  initMetaPixel();
  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  } catch (error) {
    console.error("[Meta Pixel] Failed to track PageView", error);
  }
}

export function trackMetaEvent(name: string, params?: MetaEventParams) {
  if (!shouldEnableMetaPixel()) return;
  initMetaPixel();
  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", name, params ?? {});
    }
  } catch (error) {
    console.error(`[Meta Pixel] Failed to track ${name}`, error);
  }
}
