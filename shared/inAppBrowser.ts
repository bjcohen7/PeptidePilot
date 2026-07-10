// Detect Facebook / Instagram in-app browsers (WebViews) from a user-agent.
// FB in-app UAs carry FBAN/FBAV/FBIOS/FB_IAB; Instagram carries "Instagram".
// These WebViews are where the mid-intake signup leak concentrates (they can't
// autofill passwords, break some OAuth, and feel cramped). Deliberately NARROW:
// it must NOT match plain mobile Safari/Chrome — no bare "iPhone"/"iPad" check.
export function isInAppBrowser(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /(FBAN|FBAV|FBIOS|FB_IAB|Instagram)/i.test(ua);
}
