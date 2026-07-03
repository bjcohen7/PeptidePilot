import { describe, it, expect } from "vitest";
import { matchPercentFromFitScore, isValidMatchPercent, MAX_FIT_SCORE } from "../shared/matchDisplay";

describe("matchPercentFromFitScore — one source for the fit %", () => {
  it("real quiz points [0,8] normalize to (0,100] (the 300–800% bug)", () => {
    expect(matchPercentFromFitScore(8)).toBe(100); // was 800%
    expect(matchPercentFromFitScore(7)).toBe(88);  // was 700%
    expect(matchPercentFromFitScore(5)).toBe(63);  // was 500%
    expect(matchPercentFromFitScore(3)).toBe(38);  // was 300%
    expect(MAX_FIT_SCORE).toBe(8);
  });
  it("legacy/test fractional scores (0-1) render as percent", () => {
    expect(matchPercentFromFitScore(0.92)).toBe(92);
    expect(matchPercentFromFitScore(0.81)).toBe(81);
    expect(matchPercentFromFitScore(1)).toBe(100);
  });
  it("never returns out-of-range; junk → null (clause drops)", () => {
    expect(matchPercentFromFitScore(0)).toBeNull();
    expect(matchPercentFromFitScore(-2)).toBeNull();
    expect(matchPercentFromFitScore(9)).toBeNull();   // above max points → drop
    expect(matchPercentFromFitScore(600)).toBeNull(); // a raw slip-through → drop
    expect(matchPercentFromFitScore(NaN)).toBeNull();
    expect(matchPercentFromFitScore(undefined)).toBeNull();
    expect(matchPercentFromFitScore(null)).toBeNull();
    expect(matchPercentFromFitScore("abc")).toBeNull();
  });
});

describe("isValidMatchPercent — the template drop rule (0,100]", () => {
  it.each([
    [92, true], [100, true], [1, true],
    [0, false], [-1, false], [101, false], [600, false], [NaN, false], [undefined, false], [null, false],
  ])("%s -> %s", (v, ok) => expect(isValidMatchPercent(v as any)).toBe(ok));
});
