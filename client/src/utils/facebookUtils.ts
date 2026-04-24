/**
 * Facebook tracking utilities for the PeptidePilot frontend.
 *
 * Provides helpers for reading _fbc / _fbp cookies and constructing
 * the fbc value from the fbclid URL parameter when the Meta Pixel has
 * not yet written the cookie. These values are forwarded to the
 * server-side CAPI endpoint to improve Facebook's Event Match Quality.
 *
 * Parameters that must NOT be hashed (fbc, fbp, client_ip_address,
 * client_user_agent) are passed as plain text — hashing happens only
 * for PII such as email, and only on the server.
 */

/**
 * Reads a first-party cookie value by name from document.cookie.
 * Returns null when running outside a browser context (e.g. SSR/prerender).
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() ?? null;
  }
  return null;
}

/**
 * Constructs a fbc string from the fbclid query parameter in the current
 * URL, following Facebook's documented format:
 *   fb.{subdomainIndex}.{creationTimeMs}.{fbclid}
 *
 * Returns null when fbclid is absent from the URL.
 */
export function getFbcFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fbclid = params.get("fbclid");
  if (!fbclid) return null;
  // subdomainIndex is 1 for a root domain (peptidepilot.me).
  return `fb.1.${Date.now()}.${fbclid}`;
}

/**
 * Returns the best available fbc and fbp values for the current session.
 *
 * fbc  — Facebook Click ID. Prefers the _fbc cookie set by the Meta Pixel;
 *         falls back to constructing the value from the fbclid URL parameter.
 * fbp  — Facebook Browser ID. Read from the _fbp cookie set by the Pixel.
 *
 * Both values are passed as plain text to Facebook (no hashing required).
 */
export function getFacebookTrackingParams(): { fbc: string | null; fbp: string | null } {
  const fbc = getCookie("_fbc") ?? getFbcFromUrl();
  const fbp = getCookie("_fbp");
  return { fbc, fbp };
}
