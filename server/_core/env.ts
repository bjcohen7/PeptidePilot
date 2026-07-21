/**
 * Canonical public origin for ALL outbound links (emails, sitemaps, redirects).
 * Normalizes any configured value to https + the www host so a link can never
 * point at the naked/broken origin. peptidepilot.me → www.peptidepilot.me.
 */
function normalizeBaseUrl(raw: string): string {
  let url = (raw || "").trim().replace(/\/+$/, "");
  if (!url) url = "https://www.peptidepilot.me";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/^http:\/\//i, "https://");
  // Force www on the apex peptidepilot.me
  url = url.replace(/^https:\/\/peptidepilot\.me\b/i, "https://www.peptidepilot.me");
  return url;
}

export const ENV = {
  appBaseUrl: normalizeBaseUrl(
    process.env.APP_BASE_URL || process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.peptidepilot.me"
  ),
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  siteUrl: process.env.SITE_URL || process.env.VITE_SITE_URL || "https://www.peptidepilot.me",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  metaPixelId: process.env.VITE_META_PIXEL_ID || "1053576873680593",
  metaCapiToken: process.env.META_CAPI_TOKEN ?? "",
  metaTestEventCode: process.env.META_TEST_EVENT_CODE ?? "",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
  // Shared secret required on /api/postback (affiliate conversion callbacks).
  postbackSecret: process.env.POSTBACK_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
