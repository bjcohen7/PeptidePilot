import { Router, type Request } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { ENV } from "../_core/env";
import { conversions, leads, providers } from "../../drizzle/schema";
import { cancelSequenceForLead } from "../email/queue";
import { parseSubid, computeDedupe, normalizeConversionType, KNOWN_PROVIDER_SLUGS } from "../lib/subid";

/**
 * Affiliate postback receiver. Networks call this on a sale with the subid we
 * embedded in the /go/ affiliate link ({publicId}-{providerSlug}).
 *
 * URL format to paste into each affiliate dashboard (Everflow/RevOffers/TUNE):
 *   https://www.peptidepilot.me/api/postback?token=POSTBACK_SECRET&subid={SUBID_MACRO}&txid={TXID_MACRO}&amount={PAYOUT_MACRO}&type={TYPE_MACRO}&timestamp={TIME_MACRO}
 * where {SUBID_MACRO} echoes the sub id we sent and {TXID_MACRO} is the
 * network's unique conversion/transaction id:
 *   - Gala (Everflow):        subid={sub1}       txid={transaction_id}
 *   - direct_med (RevOffers): subid={subid1}     txid={conversion_id}
 *   - sprout (RevOffers/TUNE): subid={sub1}      txid={conversion_id}
 * The receiver also accepts subid under sub1/subid1/aff_sub, txid under
 * transaction_id/conversion_id/order_id, and amount under payout/sale_amount, so
 * a network's native macro name works directly. Per-provider overrides live in
 * providers.postback_param_map.
 */

const SUBID_KEYS = ["subid", "sub1", "subid1", "aff_sub", "s1", "sid"];
const TXID_KEYS = ["txid", "transaction_id", "transactionId", "conversion_id", "conversionId", "order_id", "tid", "cid"];
const AMOUNT_KEYS = ["amount", "payout", "sale_amount", "revenue", "sale", "amt"];
const TIME_KEYS = ["timestamp", "datetime", "event_time", "time", "conversion_time"];
const TYPE_KEYS = ["type", "conversion_type", "event_type", "txn_type", "status"];

function pick(params: Record<string, string>, keys: string[], mapped?: string): string | null {
  if (mapped && params[mapped] != null && params[mapped] !== "") return params[mapped];
  for (const k of keys) {
    if (params[k] != null && params[k] !== "") return params[k];
  }
  return null;
}

function toCents(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function toDate(raw: string | null, fallback: Date): Date {
  if (!raw) return fallback;
  const t = String(raw).trim();
  if (/^\d{10}$/.test(t)) return new Date(Number(t) * 1000);
  if (/^\d{13}$/.test(t)) return new Date(Number(t));
  const d = new Date(t);
  return isNaN(d.getTime()) ? fallback : d;
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
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query ?? {})) params[k] = Array.isArray(v) ? String(v[0]) : String(v);
  if (req.body && typeof req.body === "object") {
    for (const [k, v] of Object.entries(req.body)) if (params[k] == null) params[k] = String(v);
  }

  // 1. Auth — reject without the shared secret (fail-closed).
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

  // 3. Resolve provider by matching the subid's trailing slug against the real
  //    provider slugs (publicIds are nanoids and can contain '-'/'_').
  let knownSlugs: string[] = [...KNOWN_PROVIDER_SLUGS];
  const provBySlug = new Map<string, Record<string, string> | null>();
  try {
    const provRows = await db.select({ slug: providers.slug, postbackParamMap: providers.postbackParamMap }).from(providers);
    if (provRows.length) knownSlugs = provRows.map((p) => p.slug);
    for (const p of provRows) provBySlug.set(p.slug, (p.postbackParamMap as Record<string, string> | null) ?? null);
  } catch (err) {
    console.error("[Postback] provider list lookup error", { subid, message: (err as any)?.message, sqlMessage: (err as any)?.sqlMessage });
  }

  const parsed = parseSubid(subid, knownSlugs);
  const providerSlug = parsed?.providerSlug ?? "unknown";
  const paramMap: Record<string, string> | null = (parsed && provBySlug.get(parsed.providerSlug)) || null;

  // 4. Resolve lead by publicId.
  let leadId: string | null = null;
  if (parsed) {
    try {
      const leadRows = await db.select({ id: leads.id }).from(leads).where(eq(leads.publicId, parsed.publicId)).limit(1);
      leadId = leadRows[0]?.id ?? null;
    } catch (err) {
      // Never swallow DB errors (AGENTS.md) — log full detail, keep going with lead_id NULL.
      console.error("[Postback] lead lookup error", {
        subid, message: (err as any)?.message, code: (err as any)?.code,
        sqlMessage: (err as any)?.sqlMessage, causeSqlMessage: (err as any)?.cause?.sqlMessage,
      });
    }
  }

  const amountCents = toCents(pick(params, AMOUNT_KEYS, paramMap?.amount));
  const occurredAt = toDate(pick(params, TIME_KEYS, paramMap?.timestamp), new Date());
  const transactionId = pick(params, TXID_KEYS, paramMap?.transaction_id);
  const conversionType = normalizeConversionType(pick(params, TYPE_KEYS, paramMap?.type));
  const { dedupeKey, needsReview } = computeDedupe({ transactionId, subid, occurredAt });

  // 5. Insert (idempotent via unique (provider_slug, dedupe_key)).
  try {
    await db.insert(conversions).values({
      subid, leadId, providerSlug, amountCents, occurredAt,
      source: "postback", transactionId, conversionType, dedupeKey, needsReview,
      rawPayload: params,
    });
  } catch (err) {
    if (isDuplicateError(err)) {
      console.log("[Postback] DUPLICATE ignored (idempotent)", { subid, providerSlug, dedupeKey });
      return { status: 200 as const, body: { ok: true, duplicate: true } };
    }
    console.error("[Postback] insert error", {
      subid, message: (err as any)?.message, code: (err as any)?.code,
      sqlMessage: (err as any)?.sqlMessage, causeSqlMessage: (err as any)?.cause?.sqlMessage,
    });
    return { status: 500 as const, body: { ok: false, error: "insert_failed" } };
  }

  // 6. Stop-on-conversion: cancel the drip + send post-conversion.
  if (leadId) {
    try {
      await cancelSequenceForLead(leadId);
    } catch (err) {
      console.error("[Postback] cancelSequenceForLead failed", { leadId, message: (err as any)?.message });
    }
  }

  console.log("[Postback] RECORDED", { subid, providerSlug, leadId, amountCents, conversionType, needsReview, resolved: Boolean(leadId) });
  return { status: 200 as const, body: { ok: true, resolved: Boolean(leadId), leadId, conversionType, needsReview } };
}

postbackRouter.get("/", async (req, res) => {
  const { status, body } = await handle(req);
  res.status(status).json(body);
});
postbackRouter.post("/", async (req, res) => {
  const { status, body } = await handle(req);
  res.status(status).json(body);
});
