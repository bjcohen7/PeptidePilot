import { isInAppBrowser } from "@shared/inAppBrowser";

/**
 * A quiet, one-line hint shown ONLY inside a Facebook/Instagram in-app browser
 * AND only when the lead's results were also emailed. Nudges them to reopen from
 * email (their real browser), where the ~10-minute signup is far smoother. It is
 * a hint only — no popup, no redirect, no auto-anything. Renders null everywhere
 * else (including during prerender, where `navigator` is undefined).
 */
export function WebviewEscapeHint({ emailDelivered }: { emailDelivered?: boolean }) {
  if (!emailDelivered) return null;
  if (typeof navigator === "undefined" || !isInAppBrowser(navigator.userAgent)) return null;
  return (
    <p className="text-xs text-muted-foreground/70 text-center mt-3 leading-relaxed">
      📱 In the Facebook app? Your results were also emailed to you — opening from email uses your
      regular browser and makes the ~10-minute signup smoother.
    </p>
  );
}
