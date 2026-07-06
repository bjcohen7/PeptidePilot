import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { PROVIDER_FLOOR_PRICE } from "../../shared/providerData";

/**
 * Startup consistency check for the static "from $X/mo" floor. Static/prerendered
 * pages use the compile-time PROVIDER_FLOOR_PRICE constant, which can silently
 * drift from the live providers table. Log loudly on mismatch so a stale floor
 * gets noticed (fix = update shared/providerData.ts + rebuild).
 */
export async function checkProviderFloorConsistency(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const [rows] = await db.execute(
      sql.raw("SELECT MIN(price_from_cents) AS minCents FROM providers WHERE active = 1")
    );
    const arr = Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : [];
    const minCents = Number((arr[0] as any)?.minCents ?? 0);
    if (!minCents) return;
    const liveFloor = Math.round(minCents / 100);
    if (liveFloor !== PROVIDER_FLOOR_PRICE) {
      console.error(
        `[ProviderFloor] MISMATCH: static constant $${PROVIDER_FLOOR_PRICE}/mo != live table min $${liveFloor}/mo. ` +
          `Update shared/providerData.ts (startingPrice) + rebuild so prerendered pages match.`
      );
    } else {
      console.log(`[ProviderFloor] OK: static floor $${PROVIDER_FLOOR_PRICE}/mo matches live table.`);
    }
  } catch (e: any) {
    console.error("[ProviderFloor] consistency check failed:", e?.message);
  }
}
