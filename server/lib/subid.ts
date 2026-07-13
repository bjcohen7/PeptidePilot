// Subid parsing + conversion idempotency helpers (leg-6, hardened per review).
//
// subid is built by the /go/ route as `${publicId}-${providerSlug}`. publicIds
// are nanoids that CAN contain '-' and '_', so we must NOT split on a delimiter.
// Instead we match the trailing segment against the KNOWN provider slugs
// (longest match wins), which is unambiguous and future-proof.

export const KNOWN_PROVIDER_SLUGS = ["gala", "medvi", "direct_med", "sprout"] as const;

export type ParsedSubid = { publicId: string; providerSlug: string };

/**
 * Resolve {publicId, providerSlug} from a subid by matching the longest known
 * provider slug that is a hyphen-suffix of the subid. Returns null if none match.
 * `knownSlugs` should come from the providers table at call time (falls back to
 * the built-in set).
 */
export function parseSubid(
  subid: string,
  knownSlugs: readonly string[] = KNOWN_PROVIDER_SLUGS,
): ParsedSubid | null {
  if (!subid) return null;
  // Homepage direct-to-Gala experiment: subid is `${sessionId}-gdirect` (these
  // visitors have no lead/publicId). Resolve to gala so postbacks attribute to
  // the right provider; the prefix is the visitor sessionId, surfaced as publicId.
  if (subid.endsWith("-gdirect")) {
    const sid = subid.slice(0, -"-gdirect".length);
    if (sid) return { publicId: sid, providerSlug: "gala" };
  }
  let best: string | null = null;
  for (const slug of knownSlugs) {
    if (!slug || subid === slug) continue;
    if (subid.endsWith("-" + slug) && (best === null || slug.length > best.length)) {
      best = slug;
    }
  }
  if (best === null) return null;
  const publicId = subid.slice(0, subid.length - best.length - 1);
  if (!publicId) return null;
  return { publicId, providerSlug: best };
}

/** UTC minute bucket "YYYY-MM-DDTHH:MM" — used only for the no-txid fallback key. */
export function occurredMinuteKey(d: Date): string {
  return d.toISOString().slice(0, 16);
}

export type ConversionType = "initial" | "rebill" | "unknown";

/** Normalize a network's conversion `type` param into initial/rebill/unknown. */
export function normalizeConversionType(raw: string | null | undefined): ConversionType {
  const t = (raw ?? "").toLowerCase();
  if (/rebill|recur|subscrip|renew/.test(t)) return "rebill";
  if (/initial|sale|new|first|conversion|purchase|order/.test(t)) return "initial";
  return "unknown";
}

/**
 * Compute the idempotency key + needs_review flag for a conversion.
 * - With a transaction_id: key = "tx:<txid>". This is the network's identity for
 *   the sale, so RETRIES (same sale, new timestamp) dedupe, and REBILLS
 *   (same subid, new txid) become new rows. needs_review = false.
 * - Without a transaction_id: key = "st:<subid>:<occurred-minute>" (best effort)
 *   and needs_review = true so a human can confirm.
 * `keyspace` namespaces manual vs postback so they never collide.
 */
export function computeDedupe(opts: {
  transactionId?: string | null;
  subid: string;
  occurredAt: Date;
  keyspace?: string;
}): { dedupeKey: string; needsReview: boolean } {
  const ns = opts.keyspace ? `${opts.keyspace}:` : "";
  const txid = (opts.transactionId ?? "").trim();
  if (txid) {
    return { dedupeKey: `${ns}tx:${txid}`.slice(0, 191), needsReview: false };
  }
  return {
    dedupeKey: `${ns}st:${opts.subid}:${occurredMinuteKey(opts.occurredAt)}`.slice(0, 191),
    needsReview: true,
  };
}
