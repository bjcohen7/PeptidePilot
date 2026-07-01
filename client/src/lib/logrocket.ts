export function identifyLogRocketUser(
  _email: string,
  _extra?: Record<string, string | number | null>,
): Promise<void> {
  if (typeof window !== "undefined" && "LogRocket" in window) {
    try {
      (window as Record<string, unknown>).LogRocket;
    } catch {
      // silently ignore
    }
  }
  return Promise.resolve();
}
