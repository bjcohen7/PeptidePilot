import { Router, type Request } from "express";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { ENV } from "../_core/env";
import { conversions, leads, providers } from "../../drizzle/schema";
import { cancelSequenceForLead } from "../email/queue";

/**
 * Affiliate postback receiver. Networks call this on a sale with the subid we
 * embedded in the /go/ affiliate link ({publicId}-{providerSlug}).
 *
 * URL format to paste into each affiliate dashboard (Everflow/RevOffers/TUNE):
 *   https://www.peptidepilot.me/api/postback?token=POSTBACK_SECRET&subid={SUBID_MACRO}&amount={PAYOUT_MACRO}&timestamp={TIME_MACRO}
 * where {SUBID_MACRO} echoes the sub id we sent:
 *   - Gala (Everflow):        sub1  ->  &subid={sub1}
 *   - direct_med (RevOffers): subid1 -> &subid={subid1}
 *   - sprout (RevOffers/TUNE): sub1  -> &subid={sub1}
 * (The receiver also accepts subid under sub1/subid1/aff_sub, and amount under
 *  payout/sale_amount/revenue, so the raw network macro name works directly.)
 */

const SUBID_KEYS = ["subid", "sub1", "subid1", "aff_sub", "s1", "sid"];
const AMOUNT_KEYS = ["amount", "payout", "sale_amount", "revenue", "sale", "amt"];
const TIME_KEYS = ["timestamp", "datetime", "event_time", "time", "conversion_time"];

function pick(params: Record<string, string>, keys: string[], mapped?: string): string | null {
  if (mapped && params[mapped] != null && params[mapped] !== "") return params[mapped];
  for (const k of keys) {
    if (params[k] != null && params[k] !== "") return params[k];
  }
  return null;
}

/** Parse a dollar amount ("49.99" or "49") into integer cents. Returns null if unparseable. */
function toCents(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Parse a timestamp param (epoch seconds/ms or ISO). Falls back to `fallback`. */
function toDate(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback;
  const trimmed = String(raw).trim();
  if (/^\d{10}$/.test(trimmed)) return new Date(Number(trimmed) * 1000);
  if (/^\d{13}$/.test(trimmed)) return new Date(Number(trimmed));
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? fallback : d;
}

/** subid = {publicId}-{providerSlug}; providerSlug has no hyphen (gala/medvi/sprout/direct_med). */
function parseSubid(subid: string): { publicId: string; providerSlug: string } | null {
  const lastDash = subid.lastIndexOf("-");
  if (lastDash <= 0 || lastDash === subid.length - 1) return null;
  return { publicId: subid.slice(0, lastDash), providerSlug: subid.slice(lastDash + 1) };
}

function isDuplicateError(err: unknown): boolean {
  let cur = err as { code?: string; errno?: number; cause?: unknown } | undefined;
  while (cur && typeof cur === "object") {
    if (cur.code === "ER_DUP_ENTRY" || cur.errno === 1062) return true;
    cur = cur.cause as typeof cur;
  }
  return false;
}

export const postbackRouter = Router();

async function handle(req: Request) {
  // Merge query + body so GET and POST both work.
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query ?? {})) params[k] = Array.isArray(v) ? String(v[0]) : String(v);
  if (req.body && typeof req.body === "object") {
    for (const [k, v] of Object.entries(req.body)) if (params[k] == null) params[k] = String(v);
  }

  // 1. Auth — reject without the shared secret.
  const token = params.token ?? params.secret ?? "";
  if (!ENV.postbackSecret || token !== ENV.postbackSecret) {
    console.warn("[Postback] REJECTED (bad/missing token)", { ip: req.ip, keys: Object.keys(params) });
    return { status: 401 as const, body: { ok: false, error: "unauthorized" } };
  }

  // 2. subid is required.
  const subid = pick(params, SUBID_KEYS);
  if (!subid) {
    console.warn("[Postback] REJECTED (missing subid)", { params });
    return { status: 400 as const, body: { ok: false, error: "missing_subid" } };
  }

  const db = await getDb();
  if (!db) {
    console.error("[Postback] DB unavailable — cannot record", { subid });
    return { status: 503 as const, body: { ok: false, error: "db_unavailable" } };
  }

  // 3. Resolve provider + lead from the subid.
  const parsed = parseSubid(subid);
  const providerSlug = parsed?.providerSlug ?? "unknown";
  let leadId: string | null = null;
  let amountKeyOverride: string | undefined;

  if (parsed) {
    try {
      const provRows = await db
        .select({ slug: providers.slug, postbackParamMap: providers.postbackParamMap })
        .from(providers)
        .where(eq(providers.slug, parsed.providerSlug))
        .limit(1);
      const pmap = provRows[0]?.postbackParamMap as Record<string, string> | null | undefined;
      if (pmap?.amount) amountKeyOverride = pmap.amount;

      const leadRows = await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.publicId, parsed.publicId))
        .limit(1);
      leadId = leadRows[0]?.id ?? null;
    } catch (err) {
      // Never swallow DB errors (AGENTS.md) — log full detail, keep going with lead_id NULL.
      console.error("[Postback] lookup error", {
        subid,
        message: (err as any)?.message,
        code: (err as any)?.code,
        sqlMessage: (err as any)?.sqlMessage,
        causeSqlMessage: (err as any)?.cause?.sqlMessage,
      });
    }
  }

  const amountCents = toCents(pick(params, AMOUNT_KEYS, amountKeyOverride));
  const occurredAt = toDate(pick(params, TIME_KEYS), new Date());

  // 4. Insert (idempotent via unique (subid, occurred_at)).
  try {
    await db.insert(conversions).values({
      subid,
      leadId,
      providerSlug,
      amountCents,
      occurredAt,
      source: "postback",
      rawPayload: params,
    });
  } catch (err) {
    if (isDuplicateError(err)) {
      console.log("[Postback] DUPLICATE ignored (idempotent)", { subid, occurredAt });
      return { status: 200 as const, body: { ok: true, duplicate: true } };
    }
    console.error("[Postback] insert error", {
      subid,
      message: (err as any)?.message,
      code: (err as any)?.code,
      sqlMessage: (err as any)?.sqlMessage,
      causeSqlMessage: (err as any)?.cause?.sqlMessage,
    });
    return { status: 500 as const, body: { ok: false, error: "insert_failed" } };
  }

  // 5. Stop-on-conversion: cancel the drip + send post-conversion (only email wiring allowed).
  if (leadId) {
    try {
      await cancelSequenceForLead(leadId);
    } catch (err) {
      console.error("[Postback] cancelSequenceForLead failed", { leadId, message: (err as any)?.message });
    }
  }

  console.log("[Postback] RECORDED", { subid, providerSlug, leadId, amountCents, resolved: Boolean(leadId) });
  return { status: 200 as const, body: { ok: true, resolved: Boolean(leadId), leadId } };
}

postbackRouter.get("/", async (req, res) => {
  const { status, body } = await handle(req);
  res.status(status).json(body);
});
postbackRouter.post("/", async (req, res) => {
  const { status, body } = await handle(req);
  res.status(status).json(body);
});
