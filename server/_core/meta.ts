import crypto from "node:crypto";
import { parse } from "cookie";
import type { IncomingMessage } from "http";
import { ENV } from "./env";

type MetaEventName = "Lead" | "CompleteRegistration" | "ViewContent";

type MetaServerEvent = {
  eventName: MetaEventName;
  eventId?: string | null;
  email?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  sourceUrl?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  customData?: Record<string, unknown>;
};

function normalizeValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readCookies(req: IncomingMessage) {
  const raw = req.headers.cookie;
  if (!raw) return {};
  try {
    return parse(raw);
  } catch {
    return {};
  }
}

function buildUserData(event: MetaServerEvent) {
  const email = normalizeValue(event.email);
  const userData: Record<string, unknown> = {};

  if (email) userData.em = sha256(email);
  if (event.clientIpAddress) userData.client_ip_address = event.clientIpAddress;
  if (event.clientUserAgent) userData.client_user_agent = event.clientUserAgent;
  if (event.fbp) userData.fbp = event.fbp;
  if (event.fbc) userData.fbc = event.fbc;

  return userData;
}

export async function sendMetaServerEvents(
  req: IncomingMessage,
  events: MetaServerEvent[]
) {
  if (!ENV.metaCapiToken || !ENV.metaPixelId || events.length === 0) return;

  const cookies = readCookies(req);
  const endpoint = `https://graph.facebook.com/v22.0/${ENV.metaPixelId}/events`;

  const payload = {
    data: events.map((event) => ({
      event_name: event.eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_id: event.eventId ?? undefined,
      event_source_url: event.sourceUrl || ENV.siteUrl,
      user_data: buildUserData({
        ...event,
        fbp: event.fbp ?? cookies._fbp ?? null,
        fbc: event.fbc ?? cookies._fbc ?? null,
      }),
      custom_data: event.customData ?? {},
    })),
    test_event_code: ENV.metaTestEventCode || undefined,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        access_token: ENV.metaCapiToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Meta CAPI] Failed to send events:", errorText);
    }
  } catch (error) {
    console.error("[Meta CAPI] Request failed:", error);
  }
}
