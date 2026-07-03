// SINGLE SOURCE OF TRUTH for the match "fit" display percentage.
// The results page AND every email merge path derive the shown % from this —
// never from a raw fitScore. This kills the "two paths, two truths" bug where
// the email did fitScore*100 (→ 300–800% for real leads) while the page did
// fitScore/5.
//
// providerMatching.ts scores fitScore as a points sum in [0, MAX_FIT_SCORE]
// (budget +3, insurance +2, weight-loss +2, meds-both +1). Legacy/test data
// stored fitScore as a 0-1 fraction. Both normalize to a 0-100 integer %.
// Returns null when the input can't produce a sane % so callers DROP the clause
// — no surface may ever render a percentage above 100 or below 1.
export const MAX_FIT_SCORE = 8;

export function matchPercentFromFitScore(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const pct = n <= 1 ? Math.round(n * 100) : Math.round((n / MAX_FIT_SCORE) * 100);
  if (pct < 1 || pct > 100) return null; // hard sanity clamp: (0, 100] only
  return pct;
}

/** True only when v is a real percentage in (0, 100] — the template drop rule. */
export function isValidMatchPercent(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 100;
}
