import { describe, it, expect } from "vitest";
import { matchPercentFromFitScore, isValidMatchPercent, shouldDisplayMatchPercent, MAX_FIT_SCORE, MIN_DISPLAY_PERCENT } from "../shared/matchDisplay";

describe("matchPercentFromFitScore — points-only (no fraction branch)", () => {
  it("real quiz points [0,8] normalize to (0,100] (the 300–800% bug)", () => {
    expect(matchPercentFromFitScore(8)).toBe(100); // was 800%
    expect(matchPercentFromFitScore(7)).toBe(88);  // was 700%
    expect(matchPercentFromFitScore(5)).toBe(63);  // was 500%
    expect(matchPercentFromFitScore(3)).toBe(38);  // was 300%
    expect(MAX_FIT_SCORE).toBe(8);
  });
  it("fitScore=1 is a valid points value (worst match) → 13%, NOT 100%", () => {
    // Regression: the old <=1 fraction branch mapped 1 -> 100%. It must be points.
    expect(matchPercentFromFitScore(1)).toBe(13); // round(1/8*100)=round(12.5)=13
  });
  it("a stray 0.92 is treated as points now (fraction branch deleted) → 12%", () => {
    // Real data has no fractions anymore (test rows normalized to points).
    expect(matchPercentFromFitScore(0.92)).toBe(12); // round(0.92/8*100)=round(11.5)=12
  });
  it("junk / out-of-range → null (clause drops)", () => {
    expect(matchPercentFromFitScore(0)).toBeNull();
    expect(matchPercentFromFitScore(-2)).toBeNull();
    expect(matchPercentFromFitScore(9)).toBeNull();   // above max points → drop
    expect(matchPercentFromFitScore(600)).toBeNull();
    expect(matchPercentFromFitScore(NaN)).toBeNull();
    expect(matchPercentFromFitScore(undefined)).toBeNull();
    expect(matchPercentFromFitScore(null)).toBeNull();
    expect(matchPercentFromFitScore("abc")).toBeNull();
  });
});

describe("isValidMatchPercent — range only (0,100]", () => {
  it.each([[92, true], [100, true], [1, true], [0, false], [-1, false], [101, false], [600, false], [NaN, false], [null, false]])(
    "%s -> %s", (v, ok) => expect(isValidMatchPercent(v as any)).toBe(ok));
});

describe("shouldDisplayMatchPercent — business gate >= 60", () => {
  it("MIN_DISPLAY_PERCENT is 60", () => expect(MIN_DISPLAY_PERCENT).toBe(60));
  it("boundary 59/60/61", () => {
    expect(shouldDisplayMatchPercent(59)).toBe(false);
    expect(shouldDisplayMatchPercent(60)).toBe(true);
    expect(shouldDisplayMatchPercent(61)).toBe(true);
  });
  it("valid-but-weak derived values drop; strong ones show", () => {
    expect(shouldDisplayMatchPercent(38)).toBe(false); // fitScore 3
    expect(shouldDisplayMatchPercent(50)).toBe(false); // fitScore 4
    expect(shouldDisplayMatchPercent(63)).toBe(true);  // fitScore 5
    expect(shouldDisplayMatchPercent(100)).toBe(true); // fitScore 8
    expect(shouldDisplayMatchPercent(0)).toBe(false);
    expect(shouldDisplayMatchPercent(600)).toBe(false);
    expect(shouldDisplayMatchPercent(null)).toBe(false);
  });
});
