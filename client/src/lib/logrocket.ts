const LOGROCKET_APP_ID = "peptidepilot/peptidepilot";

type LogRocketIdentifyTraits = Record<string, string | number | boolean | null | undefined>;

type LogRocketApi = {
  init: (appId: string) => void;
  identify?: (id: string, traits?: LogRocketIdentifyTraits) => void;
};

declare global {
  interface Window {
    LogRocket?: LogRocketApi;
  }
}

let initPromise: Promise<void> | null = null;
let initialized = false;

function shouldEnableLogRocket() {
  return typeof window !== "undefined" && import.meta.env.PROD;
}

function loadLogRocketScript() {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-logrocket="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load LogRocket")), { once: true });
      if (window.LogRocket) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.logr-in.com/LogRocket.min.js";
    script.crossOrigin = "anonymous";
    script.async = true;
    script.dataset.logrocket = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load LogRocket")), { once: true });
    document.head.appendChild(script);
  });
}

export function initLogRocket() {
  if (!shouldEnableLogRocket()) return Promise.resolve();
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = loadLogRocketScript()
    .then(() => {
      if (!window.LogRocket || initialized) return;
      window.LogRocket.init(LOGROCKET_APP_ID);
      initialized = true;
    })
    .catch((error) => {
      console.error("[LogRocket] Failed to initialize", error);
    });

  return initPromise;
}

export async function identifyLogRocketUser(
  id: string,
  traits?: LogRocketIdentifyTraits,
) {
  if (!shouldEnableLogRocket()) return;

  await initLogRocket();
  window.LogRocket?.identify?.(id, traits);
}
