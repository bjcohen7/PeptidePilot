export function normCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function twoPropTest(c1: number, n1: number, c2: number, n2: number) {
  if (!n1 || !n2) return { z: 0, p: 1, probBeat: 0.5 };
  const p1 = c1 / n1;
  const p2 = c2 / n2;
  const pool = (c1 + c2) / (n1 + n2);
  const se = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2));
  const z = se === 0 ? 0 : (p2 - p1) / se;
  const seU = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2) || 1;
  return { z, p: 2 * (1 - normCdf(Math.abs(z))), probBeat: normCdf((p2 - p1) / seU) };
}
