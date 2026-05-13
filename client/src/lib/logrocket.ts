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

function waitForLogRocket() {
  return new Promise<void>((resolve, reject) => {
    if (window.LogRocket) {
      resolve();
      return;
    }

    let attempts = 0;
    const maxAttempts = 50;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (window.LogRocket) {
        window.clearInterval(interval);
        resolve();
        return;
      }

      if (attempts >= maxAttempts) {
        window.clearInterval(interval);
        reject(new Error("LogRocket script did not become available"));
      }
    }, 100);
  });
}

export function initLogRocket() {
  if (!shouldEnableLogRocket()) return Promise.resolve();
  if (initialized) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = waitForLogRocket()
    .then(() => {
      if (!window.LogRocket || initialized) return;
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
