// test-send.ts — Create a test lead and enqueue emails 0 + 6 for immediate send
import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "./server/db";

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB"); process.exit(1); }

  const email = "cohen.benjacob@gmail.com";
  const publicId = "test-" + Date.now();
  const leadId = crypto.randomUUID();

  // Insert test lead
  await db.execute(sql.raw(`
    INSERT INTO leads (id, publicId, email, topPeptideMatch, createdAt, updatedAt)
    VALUES ('${leadId}', '${publicId}', '${email}', 'gala', NOW(), NOW())
  `));
  console.log(`[TestSend] Created lead ${leadId} (${publicId}) → ${email}`);

  // Enqueue full 7-email sequence
  const { enqueueEmailSequence } = await import("./server/email/queue");
  await enqueueEmailSequence(leadId, new Date());
  console.log(`[TestSend] Enqueued 7 emails for lead ${leadId}`);

  // Set email_0 to fire in 30 seconds (it already is, but confirm)
  // Set email_6 to fire in 60 seconds (so both send in next cron ticks)
  const [rows] = await db.execute(sql.raw(`
    SELECT id, email_slug, subject_variant, scheduled_at, status
    FROM email_queue
    WHERE lead_id = '${leadId}'
    ORDER BY scheduled_at ASC
  `));
  const queueRows = Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : [];

  console.log(`\n[TestSend] Queue rows for ${publicId}:`);
  console.log("=".repeat(90));
  console.log(`${"id".padEnd(8)} ${"slug".padEnd(32)} ${"variant".padEnd(10)} ${"scheduled_at".padEnd(22)} ${"status"}`);
  console.log("-".repeat(90));

  for (const row of queueRows) {
    const r = row as any;
    const isTestEmail = r.email_slug === "email_0_instant" || r.email_slug === "email_6_final";

    if (isTestEmail) {
      // Set these to fire immediately
      const nextTick = new Date(Date.now() + 30_000).toISOString().slice(0, 19).replace("T", " ");
      await db.execute(sql.raw(`
        UPDATE email_queue SET scheduled_at = '${nextTick}' WHERE id = ${r.id}
      `));
      r.scheduled_at = nextTick + " (set to fire in 30s)";
    }

    console.log(`${String(r.id).padEnd(8)} ${r.email_slug.padEnd(32)} ${(r.subject_variant || "?").padEnd(10)} ${String(r.scheduled_at).padEnd(22)} ${r.status}`);
  }

  console.log("=".repeat(90));
  console.log(`\n[TestSend] Emails 0 and 6 will fire in ~30s on next cron tick.`);
  console.log(`[TestSend] Watch Railway logs for [EmailWorker] entries.`);
}

main().catch(console.error);
