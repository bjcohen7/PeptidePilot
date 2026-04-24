import { Router, type Request, type Response } from "express";
import axios from "axios";
import { hashValue } from "../utils/hash";
import { ENV } from "../_core/env";

const router = Router();

/**
 * POST /api/capi/track-affiliate-click
 *
 * Receives affiliate link click data from the React frontend and fires
 * a server-side "AffiliateClick" event to Facebook's Conversions API.
 * The endpoint always returns HTTP 200 so that a tracking failure never
 * blocks the user's navigation to the affiliate site.
 *
 * Expected JSON body:
 *   email        {string}  User's email (hashed server-side; never on the client)
 *   eventUrl     {string}  Full URL of the results page at click time
 *   fbc          {string?} Facebook Click ID (_fbc cookie or constructed from fbclid)
 *   fbp          {string?} Facebook Browser ID (_fbp cookie)
 *   userAgent    {string?} navigator.userAgent from the browser
 *   supplierName {string?} Affiliate supplier label (stored in custom_data)
 *   peptideName  {string?} Recommended peptide name (stored in custom_data)
 *   eventId      {string?} Deduplication ID shared with the browser-side Pixel event
 */
router.post("/track-affiliate-click", async (req: Request, res: Response) => {
  const {
    email,
    eventUrl,
    fbc,
    fbp,
    userAgent,
    supplierName,
    peptideName,
    eventId,
  } = req.body as {
    email?: string;
    eventUrl?: string;
    fbc?: string | null;
    fbp?: string | null;
    userAgent?: string;
    supplierName?: string;
    peptideName?: string;
    eventId?: string;
  };

  // Resolve credentials — prefer the FB_* names specified in the brief;
  // fall back to the existing META_* names already present in ENV so that
  // the integration works with either naming convention.
  const pixelId =
    process.env.FB_PIXEL_ID || ENV.metaPixelId;
  const accessToken =
    process.env.FB_CAPI_ACCESS_TOKEN || ENV.metaCapiToken;
  const testEventCode =
    process.env.FB_TEST_EVENT_CODE || ENV.metaTestEventCode || undefined;

  if (!pixelId || !accessToken) {
    console.error(
      "[CAPI] Missing pixel ID or access token. " +
        "Set FB_PIXEL_ID and FB_CAPI_ACCESS_TOKEN (or VITE_META_PIXEL_ID and META_CAPI_TOKEN)."
    );
    // Return 200 — do not expose server configuration errors to the client.
    return res.status(200).json({ success: false, error: "Server configuration error" });
  }

  // Railway (and most reverse proxies) sets x-forwarded-for.
  // The header may be a comma-separated list; the first value is the
  // original client IP.
  const rawIp =
    (req.headers["x-forwarded-for"] as string | undefined) ||
    req.socket.remoteAddress ||
    "";
  const clientIp = rawIp.split(",")[0].trim();

  // Hash the email server-side. PII must never be hashed on the client.
  const hashedEmail = hashValue(email);

  // Build the user_data object; only include fields that have values.
  const userData: Record<string, unknown> = {
    client_ip_address: clientIp || undefined,
    client_user_agent: userAgent || req.headers["user-agent"] || undefined,
  };
  if (hashedEmail) userData.em = [hashedEmail];
  if (fbc) userData.fbc = fbc;
  if (fbp) userData.fbp = fbp;

  // Generate a deduplication ID if the frontend did not supply one.
  const dedupeEventId =
    eventId ||
    `affiliate_click_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "AffiliateClick",
        event_id: dedupeEventId,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: eventUrl || "https://www.peptidepilot.me/results",
        user_data: userData,
        custom_data: {
          ...(supplierName ? { supplier: supplierName } : {}),
          ...(peptideName ? { peptide: peptideName } : {}),
        },
      },
    ],
  };

  // Include test_event_code only when the environment variable is set.
  // Omitting it in production ensures real events are sent.
  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  try {
    const apiUrl = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    const response = await axios.post(apiUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });
    console.log("[CAPI] Event sent successfully:", JSON.stringify(response.data));
    return res.status(200).json({ success: true, eventId: dedupeEventId });
  } catch (error: unknown) {
    const errorData =
      axios.isAxiosError(error) && error.response
        ? error.response.data
        : error instanceof Error
          ? error.message
          : String(error);
    console.error("[CAPI] Failed to send event:", JSON.stringify(errorData));
    // Always return 200 — never block the user's navigation due to a
    // tracking failure.
    return res.status(200).json({ success: false, error: "Event tracking failed silently" });
  }
});

export default router;
