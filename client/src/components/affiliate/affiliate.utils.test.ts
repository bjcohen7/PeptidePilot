import { describe, it, expect } from "vitest";
import { deriveMonogram, buildCardData } from "./affiliate.utils";

describe("deriveMonogram", () => {
  it('handles two-word names: "Direct Meds" → "DM"', () => {
    expect(deriveMonogram("Direct Meds")).toBe("DM");
  });

  it('handles single-word PascalCase: "SkinnyRX" → "SR"', () => {
    expect(deriveMonogram("SkinnyRX")).toBe("SR");
  });

  it('handles single-word PascalCase: "PeterMD" → "PM"', () => {
    expect(deriveMonogram("PeterMD")).toBe("PM");
  });

  it('handles all-lowercase single word: "limitless" → "LI"', () => {
    expect(deriveMonogram("limitless")).toBe("LI");
  });

  it('handles three+ word names: "American Compounding Lab" → "AC"', () => {
    expect(deriveMonogram("American Compounding Lab")).toBe("AC");
  });

  it("trims and uppercases", () => {
    expect(deriveMonogram("  direct meds  ")).toBe("DM");
  });
});

describe("buildCardData", () => {
  const baseLink = {
    partnerName: "Direct Meds",
    partnerSlug: "direct-meds",
    url: "https://example.com/affiliate",
  };

  const fullOverride = {
    differentiatorBadge: "No Hidden Fees",
    headline: "Transparent Pricing",
    promo: "All-inclusive pricing for compounded semaglutide.",
    couponCode: "TESTCODE10",
    couponLabel: "$50 off",
    trustSignals: ["Licensed", "Free consult"],
    secondaryCtaLabel: "Learn More",
  };

  it("featured: includes coupon, trust signals, primary headline/CTA", () => {
    const out = buildCardData(baseLink, fullOverride, true);
    expect(out.couponCode).toBe("TESTCODE10");
    expect(out.trustSignals).toEqual(["Licensed", "Free consult"]);
    expect(out.headline).toBe("Transparent Pricing");
    expect(out.ctaLabel).toBe("Get Started");
  });

  it("secondary: shows coupon and trust signals, uses secondary headline/CTA", () => {
    const out = buildCardData(baseLink, fullOverride, false);
    expect(out.couponCode).toBe("TESTCODE10");
    expect(out.trustSignals).toEqual(["Licensed", "Free consult"]);
    expect(out.headline).toBe("Transparent Pricing");
    expect(out.ctaLabel).toBe("Learn More");
  });

  it("falls back to safe defaults when no override is provided", () => {
    const out = buildCardData(baseLink, undefined, true);
    expect(out.promo).toBe("Trusted partner.");
    expect(out.ctaLabel).toBe("Get Started");
    expect(out.differentiatorBadge).toBeUndefined();
  });

  it("falls back to primary headline when secondaryHeadline is missing", () => {
    const overrideNoSecondary = { ...fullOverride, secondaryHeadline: undefined };
    const out = buildCardData(baseLink, overrideNoSecondary, false);
    expect(out.headline).toBe("Transparent Pricing");
  });

  it("truncates over-long differentiator badges", () => {
    const longBadge = { ...fullOverride, differentiatorBadge: "A".repeat(50) };
    const out = buildCardData(baseLink, longBadge, true);
    expect(out.differentiatorBadge!.length).toBeLessThanOrEqual(22);
    expect(out.differentiatorBadge!.endsWith("…")).toBe(true);
  });
});
