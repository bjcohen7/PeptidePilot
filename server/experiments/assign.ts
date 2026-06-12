import { createHash } from "crypto";

export function bucketFor(
  sessionId: string,
  slug: string,
  variants: { id: number; name: string; trafficWeight: number }[],
) {
  const h = createHash("sha256").update(`${sessionId}:${slug}`).digest();
  const n = h.readUInt32BE(0) % 100;
  let acc = 0;
  for (const v of variants) {
    acc += v.trafficWeight;
    if (n < acc) return v;
  }
  return variants[0];
}
