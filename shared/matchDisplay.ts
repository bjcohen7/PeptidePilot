// SINGLE SOURCE OF TRUTH for the match "fit" display percentage.
// The results page AND every email merge path derive the shown % from this —
// never from a raw fitScore. This kills the "two paths, two truths" bug where
// the email did fitScore*100 (→ 300–800% for real leads) while the page did
// fitScore/5.
//
// providerMatching.ts scores fitScore as a points sum in [0, MAX_FIT_SCORE]
// (budget +3, insurance +2, weight-loss +2, meds-both +1). This is the ONLY
// scale — there is no legacy 0–1 fraction branch: a value of exactly 1 is a
// (worst) points value → 13%, not 100%. (The only 0.92 test rows in prod were
// normalized to points.)
export const MAX_FIT_SCORE = 8;

// Business rule: never volunteer a weak match number in a persuasion context.
// Below this, drop the % entirely (don't inflate, don't floor — just omit).
export const MIN_DISPLAY_PERCENT = 60;

/** Normalize a raw fitScore (points, [0,8]) to a (0,100] integer %, or null. */
export function matchPercentFromFitScore(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const pct = Math.round((n / MAX_FIT_SCORE) * 100);
  if (pct < 1 || pct > 100) return null; // hard sanity clamp: (0, 100] only
  return pct;
}

/** Range validity only — a real % in (0, 100]. */
export function isValidMatchPercent(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 100;
}

/**
 * Display gate for the compatibility clause / % subject / verdict badge:
 * a valid % that is also persuasive (>= MIN_DISPLAY_PERCENT). Below the floor,
 * callers drop the clause via the existing mechanism.
 */
export function shouldDisplayMatchPercent(v: unknown): v is number {
  return isValidMatchPercent(v) && (v as number) >= MIN_DISPLAY_PERCENT;
}
