import { describe, it, expect } from "vitest";
import { parseSubid, computeDedupe, normalizeConversionType, KNOWN_PROVIDER_SLUGS } from "./lib/subid";

describe("parseSubid — matches the trailing slug against real provider slugs (nanoid publicIds can contain -/_)", () => {
  const cases: Array<[string, { publicId: string; providerSlug: string } | null]> = [
    // The review's required case: publicId with BOTH a hyphen and an underscore.
    ["ab-cd_ef123-gala", { publicId: "ab-cd_ef123", providerSlug: "gala" }],
    // underscore in the provider slug itself
    ["ab-cd_ef123-direct_med", { publicId: "ab-cd_ef123", providerSlug: "direct_med" }],
    // plain nanoid
    ["V1StGXR8_Z5jdHi6B-myT-sprout", { publicId: "V1StGXR8_Z5jdHi6B-myT", providerSlug: "sprout" }],
    // publicId that itself ends with a slug-looking token — trailing real slug still wins
    ["x-gala-direct_med", { publicId: "x-gala", providerSlug: "direct_med" }],
    ["x-sprout-gala", { publicId: "x-sprout", providerSlug: "gala" }],
    ["test-1783010674869-medvi", { publicId: "test-1783010674869", providerSlug: "medvi" }],
    // malformed / no known slug suffix -> null
    ["noseparator", null],
    ["ab-cd-unknownvendor", null],
    ["-gala", null], // empty publicId
    ["gala", null], // slug only
  ];
  for (const [subid, expected] of cases) {
    it(subid, () => expect(parseSubid(subid, KNOWN_PROVIDER_SLUGS)).toEqual(expected));
  }

  it("longest-match wins when one slug is a suffix of another", () => {
    const slugs = ["med", "direct_med"];
    expect(parseSubid("pub-direct_med", slugs)).toEqual({ publicId: "pub", providerSlug: "direct_med" });
  });
});

describe("computeDedupe — idempotency identity", () => {
  const t1 = new Date("2026-07-02T21:16:05.000Z");
  const t2 = new Date("2026-07-05T09:00:00.000Z"); // retry redelivered days later

  it("txid present: retries (same txid, new timestamp) share one key", () => {
    const a = computeDedupe({ transactionId: "TX-999", subid: "p-gala", occurredAt: t1 });
    const b = computeDedupe({ transactionId: "TX-999", subid: "p-gala", occurredAt: t2 });
    expect(a.dedupeKey).toBe(b.dedupeKey);
    expect(a.needsReview).toBe(false);
  });

  it("rebill: same subid, different txid -> different key (new row)", () => {
    const initial = computeDedupe({ transactionId: "TX-1", subid: "p-gala", occurredAt: t1 });
    const rebill = computeDedupe({ transactionId: "TX-2", subid: "p-gala", occurredAt: t2 });
    expect(initial.dedupeKey).not.toBe(rebill.dedupeKey);
  });

  it("no txid: falls back to subid + minute bucket and flags needs_review", () => {
    const a = computeDedupe({ subid: "p-gala", occurredAt: new Date("2026-07-02T21:16:05Z") });
    const b = computeDedupe({ subid: "p-gala", occurredAt: new Date("2026-07-02T21:16:59Z") }); // same minute
    const c = computeDedupe({ subid: "p-gala", occurredAt: new Date("2026-07-02T21:17:01Z") }); // next minute
    expect(a.dedupeKey).toBe(b.dedupeKey);
    expect(a.dedupeKey).not.toBe(c.dedupeKey);
    expect(a.needsReview).toBe(true);
  });

  it("manual keyspace never collides with postback keys", () => {
    const postback = computeDedupe({ subid: "p-gala", occurredAt: t1 });
    const manual = computeDedupe({ subid: "p-gala", occurredAt: t1, keyspace: "man" });
    expect(postback.dedupeKey).not.toBe(manual.dedupeKey);
  });
});

describe("normalizeConversionType", () => {
  it.each([
    ["rebill", "rebill"], ["recurring", "rebill"], ["subscription_renewal", "rebill"],
    ["initial", "initial"], ["sale", "initial"], ["new", "initial"], ["purchase", "initial"],
    ["", "unknown"], ["weird", "unknown"], [null, "unknown"],
  ])("%s -> %s", (input, expected) => expect(normalizeConversionType(input as any)).toBe(expected));
});
