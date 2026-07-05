import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { EMAIL_SEQUENCE, SEND_WINDOW } from "../../shared/emailSequence";

// ─────────────────────────────────────────────
// Subject variant assignment (50/50 random)
// ─────────────────────────────────────────────
export function assignSubjectVariant(): "A" | "B" {
  return Math.random() < 0.5 ? "A" : "B";
}

// ─────────────────────────────────────────────
// Send window: 9:00–10:30am ET, weekend→Monday
// ─────────────────────────────────────────────
function nextSendWindowDate(from: Date, exemptWeekend: boolean = false): Date {
  const et = new Date(from.toLocaleString("en-US", { timeZone: SEND_WINDOW.timezone }));
  const day = et.getDay(); // 0=Sun, 6=Sat
  const hour = et.getHours();
  const minute = et.getMinutes();

  let result = new Date(from);

  // If weekend and not exempt, slide to Monday
  if (!exemptWeekend && (day === 0 || day === 6)) {
    const daysUntilMonday = day === 0 ? 1 : 2;
    result.setDate(result.getDate() + daysUntilMonday);
  }

  // Set to 9:00am ET
  const etOffset = from.getTime() - et.getTime();
  const target9am = new Date(result);
  target9am.setHours(9, 0, 0, 0);
  const target9amET = new Date(target9am.getTime() + etOffset);
  target9amET.setHours(9, 0, 0, 0);

  // If already past the send window today, move to next applicable day
  if (result.toDateString() === from.toDateString() && (hour > SEND_WINDOW.endHour || (hour === SEND_WINDOW.endHour && minute >= SEND_WINDOW.endMinute))) {
    result.setDate(result.getDate() + 1);
    // Re-check weekend slide
    const newDay = result.getDay();
    if (!exemptWeekend && (newDay === 0 || newDay === 6)) {
      const daysUntilMonday = newDay === 0 ? 1 : 2;
      result.setDate(result.getDate() + daysUntilMonday);
    }
  }

  // Set to 9:00am ET
  result.setHours(9, 0, 0, 0);

  // If it's the same day and already past the window, add 1 day
  if (result <= from) {
    result.setDate(result.getDate() + 1);
    const newDay = result.getDay();
    if (!exemptWeekend && (newDay === 0 || newDay === 6)) {
      const daysUntilMonday = newDay === 0 ? 1 : 2;
      result.setDate(result.getDate() + daysUntilMonday);
    }
    result.setHours(9, 0, 0, 0);
  }

  return result;
}

// ─────────────────────────────────────────────
// Per-lead daily cap: max 1 email/lead/day
// ─────────────────────────────────────────────
async function applyPerLeadDailyCap(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  leadId: string,
  scheduledAt: Date
): Promise<Date> {
  const dateStr = scheduledAt.toISOString().slice(0, 10);

  const [existing] = await db.execute(sql.raw(`
    SELECT id, scheduled_at FROM email_queue
    WHERE lead_id = '${leadId}'
      AND status = 'pending'
      AND DATE(scheduled_at) = '${dateStr}'
    ORDER BY scheduled_at ASC
    LIMIT 1
  `));

  const rows = Array.isArray(existing) ? (Array.isArray(existing[0]) ? existing[0] : existing) : [];
  if (rows.length === 0) return scheduledAt;

  // Another email already scheduled this day — shift this one +1 day
  const nextDay = new Date(scheduledAt);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay;
}

// ─────────────────────────────────────────────
// Enqueue full 7-email drip sequence
// ─────────────────────────────────────────────
export async function enqueueEmailSequence(
  leadId: string,
  createdAt: Date = new Date()
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    for (const email of EMAIL_SEQUENCE) {
      let scheduledAt: Date;

      if (email.dayOffset === 0) {
        // Email 0: instant — next cron tick
        scheduledAt = new Date(Date.now() + 30_000); // 30s from now
      } else {
        // Emails 1-6: apply send window + weekend slide
        const baseDate = new Date(createdAt);
        baseDate.setDate(baseDate.getDate() + email.dayOffset);
        scheduledAt = nextSendWindowDate(baseDate, !email.weekendSlide);
      }

      // Per-lead daily cap
      scheduledAt = await applyPerLeadDailyCap(db, leadId, scheduledAt);

      const variant = assignSubjectVariant();

      await db.execute(sql.raw(`
        INSERT INTO email_queue (lead_id, email_slug, subject_variant, scheduled_at, status)
        VALUES ('${leadId}', '${email.slug}', '${variant}', '${scheduledAt.toISOString().slice(0, 19).replace("T", " ")}', 'pending')
      `));
    }
    console.log(`[EmailQueue] Enqueued 7 emails for lead ${leadId}`);
  } catch (error) {
    console.error(`[EmailQueue] Failed to enqueue for lead ${leadId}:`, error);
  }
}

// ─────────────────────────────────────────────
// Enqueue backfill campaign
// ─────────────────────────────────────────────
export async function enqueueBackfillCampaign(
  leadId: string,
  campaignSlug: string,
  leadCreatedAt: Date
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let count = 0;
  try {
    // Inject at sequence position 1 (day 1)
    const scheduledAt = nextSendWindowDate(new Date(leadCreatedAt.getTime() + 1 * 86400000));
    const variant = assignSubjectVariant();

    await db.execute(sql.raw(`
      INSERT INTO email_queue (lead_id, email_slug, subject_variant, scheduled_at, status)
      VALUES ('${leadId}', '${campaignSlug}', '${variant}', '${scheduledAt.toISOString().slice(0, 19).replace("T", " ")}', 'pending')
    `));
    count++;
  } catch (error) {
    console.error(`[EmailQueue] Failed to enqueue backfill for lead ${leadId}:`, error);
  }
  return count;
}

// ─────────────────────────────────────────────
// Legacy backfill (emails 3-6 for historical leads)
// ─────────────────────────────────────────────
export async function enqueueBackfillDrip(
  leadId: string,
  leadCreatedAt: Date,
  startAfterDays: number = 3
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  let count = 0;
  try {
    for (const email of EMAIL_SEQUENCE) {
      if (email.dayOffset < startAfterDays) continue;

      const baseDate = new Date(leadCreatedAt);
      baseDate.setDate(baseDate.getDate() + email.dayOffset);
      let scheduledAt = nextSendWindowDate(baseDate, !email.weekendSlide);

      // Ensure in future
      if (scheduledAt <= new Date()) {
        scheduledAt = nextSendWindowDate(new Date(), !email.weekendSlide);
      }

      // Per-lead daily cap
      scheduledAt = await applyPerLeadDailyCap(db, leadId, scheduledAt);

      const variant = assignSubjectVariant();

      await db.execute(sql.raw(`
        INSERT INTO email_queue (lead_id, email_slug, subject_variant, scheduled_at, status)
        VALUES ('${leadId}', '${email.slug}', '${variant}', '${scheduledAt.toISOString().slice(0, 19).replace("T", " ")}', 'pending')
      `));
      count++;
    }
  } catch (error) {
    console.error(`[EmailQueue] Failed to enqueue backfill for lead ${leadId}:`, error);
  }
  return count;
}

// ─────────────────────────────────────────────
// Cancel all pending emails for a lead
// ─────────────────────────────────────────────
export async function cancelPendingEmails(leadId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const [result] = await db.execute(sql.raw(`
      UPDATE email_queue SET status = 'cancelled'
      WHERE lead_id = '${leadId}' AND status = 'pending'
    `));
    const affected = (result as any)?.affectedRows ?? 0;
    console.log(`[EmailQueue] Cancelled ${affected} pending emails for lead ${leadId}`);
    return affected;
  } catch (error) {
    console.error(`[EmailQueue] Failed to cancel for lead ${leadId}:`, error);
    return 0;
  }
}

// ─────────────────────────────────────────────
// Cancel sequence + enqueue post-conversion
// ─────────────────────────────────────────────
export async function cancelSequenceForLead(leadId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Cancel all pending rows
    await cancelPendingEmails(leadId);

    // Set conversion_at and sequence_status
    await db.execute(sql.raw(`
      UPDATE leads SET sequence_status = 'completed', conversion_at = NOW()
      WHERE id = '${leadId}'
    `));

    // Enqueue post-conversion email (instant)
    const variant = assignSubjectVariant();
    await db.execute(sql.raw(`
      INSERT INTO email_queue (lead_id, email_slug, subject_variant, scheduled_at, status)
      VALUES ('${leadId}', 'post_conversion', '${variant}', DATE_ADD(NOW(), INTERVAL 1 MINUTE), 'pending')
    `));

    console.log(`[EmailQueue] Cancelled sequence + post-conversion for lead ${leadId}`);
  } catch (error) {
    console.error(`[EmailQueue] Failed to cancel sequence for lead ${leadId}:`, error);
  }
}

// ─────────────────────────────────────────────
// Suppress a lead
// ─────────────────────────────────────────────
export async function suppressLead(leadId: string, reason: string = "unsubscribe"): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.execute(sql.raw(`
      UPDATE leads SET suppressed = TRUE, sequence_status = 'cancelled'
      WHERE id = '${leadId}'
    `));
    await cancelPendingEmails(leadId);
    console.log(`[EmailQueue] Suppressed lead ${leadId} (${reason})`);
  } catch (error) {
    console.error(`[EmailQueue] Failed to suppress lead ${leadId}:`, error);
  }
}

// ─────────────────────────────────────────────
// Check stop-on-silence: emails 0-2 all unopened
// ─────────────────────────────────────────────
export async function checkStopOnSilence(leadId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Check if emails 0, 1, 2 are all sent and none opened
    const [result] = await db.execute(sql.raw(`
      SELECT
        SUM(status = 'sent') as sentCount,
        SUM(status = 'sent' AND opened_at IS NOT NULL) as openedCount
      FROM email_queue
      WHERE lead_id = '${leadId}'
        AND email_slug IN ('email_0_instant', 'email_1_why_match', 'email_2_cost')
    `));
    const rows = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : [];
    const r = rows[0] as any;
    const sentCount = r?.sentCount ?? 0;
    const openedCount = r?.openedCount ?? 0;

    // Only trigger if all 3 are sent and none opened
    if (sentCount < 3 || openedCount > 0) return;

    // Check if we already sent a retry
    const [retryCheck] = await db.execute(sql.raw(`
      SELECT id FROM email_queue
      WHERE lead_id = '${leadId}'
        AND email_slug = 'email_2_cost'
        AND subject_variant = 'B'
      LIMIT 1
    `));
    const retryRows = Array.isArray(retryCheck) ? (Array.isArray(retryCheck[0]) ? retryCheck[0] : retryCheck) : [];
    if (retryRows.length > 0) return;

    // Enqueue one retry of email 2 with Subject B
    const scheduledAt = new Date(Date.now() + 60_000); // 1 min from now
    await db.execute(sql.raw(`
      INSERT INTO email_queue (lead_id, email_slug, subject_variant, scheduled_at, status)
      VALUES ('${leadId}', 'email_2_cost', 'B', '${scheduledAt.toISOString().slice(0, 19).replace("T", " ")}', 'pending')
    `));

    // Cancel all remaining pending emails
    await db.execute(sql.raw(`
      UPDATE email_queue SET status = 'cancelled'
      WHERE lead_id = '${leadId}'
        AND status = 'pending'
        AND email_slug NOT IN ('email_2_cost')
        AND subject_variant != 'B'
    `));

    console.log(`[EmailQueue] Stop-on-silence: retry email 2 (B) for lead ${leadId}, cancelled rest`);
  } catch (error) {
    console.error(`[EmailQueue] Failed stop-on-silence for lead ${leadId}:`, error);
  }
}

// ─────────────────────────────────────────────
// Enqueue nudge (max 1 per lead)
// ─────────────────────────────────────────────
export async function enqueueNudge(leadId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check if nudge already sent
    const [check] = await db.execute(sql.raw(`
      SELECT nudge_sent FROM leads WHERE id = '${leadId}' LIMIT 1
    `));
    const rows = Array.isArray(check) ? (Array.isArray(check[0]) ? check[0] : check) : [];
    const lead = rows[0] as any;
    if (!lead || lead.nudge_sent) return false;

    // Check if nudge already queued
    const [existing] = await db.execute(sql.raw(`
      SELECT id FROM email_queue
      WHERE lead_id = '${leadId}' AND email_slug = 'nudge_still_deciding'
      LIMIT 1
    `));
    const existingRows = Array.isArray(existing) ? (Array.isArray(existing[0]) ? existing[0] : existing) : [];
    if (existingRows.length > 0) return false;

    const variant = assignSubjectVariant();
    const scheduledAt = new Date(Date.now() + 60_000); // 1 min from now
    await db.execute(sql.raw(`
      INSERT INTO email_queue (lead_id, email_slug, subject_variant, scheduled_at, status)
      VALUES ('${leadId}', 'nudge_still_deciding', '${variant}', '${scheduledAt.toISOString().slice(0, 19).replace("T", " ")}', 'pending')
    `));

    await db.execute(sql.raw(`
      UPDATE leads SET nudge_sent = TRUE WHERE id = '${leadId}'
    `));

    console.log(`[EmailQueue] Enqueued nudge for lead ${leadId}`);
    return true;
  } catch (error) {
    console.error(`[EmailQueue] Failed to enqueue nudge for lead ${leadId}:`, error);
    return false;
  }
}

// ─────────────────────────────────────────────
// Update email_queue row by resend_id (webhook)
// ─────────────────────────────────────────────
export async function updateEmailByResendId(
  resendId: string,
  updates: {
    status?: string;
    delivered_at?: boolean;
    opened_at?: boolean;
    clicked_at?: boolean;
    bounced_at?: boolean;
    complained_at?: boolean;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const setClauses: string[] = [];
  if (updates.status) setClauses.push(`status = '${updates.status}'`);
  if (updates.delivered_at) setClauses.push(`delivered_at = COALESCE(delivered_at, NOW())`);
  if (updates.opened_at) setClauses.push(`opened_at = NOW()`);
  if (updates.clicked_at) setClauses.push(`clicked_at = NOW()`);
  if (updates.bounced_at) setClauses.push(`bounced_at = NOW()`);
  if (updates.complained_at) setClauses.push(`complained_at = NOW()`);

  if (setClauses.length === 0) return;

  try {
    await db.execute(sql.raw(`
      UPDATE email_queue SET ${setClauses.join(", ")}
      WHERE resend_id = '${resendId}'
    `));
  } catch (error) {
    console.error(`[EmailQueue] Failed to update by resend_id ${resendId}:`, error);
  }
}

// ─────────────────────────────────────────────
// Get email metrics
// ─────────────────────────────────────────────
export async function getEmailMetrics(): Promise<{
  totalQueued: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalFailed: number;
  totalCancelled: number;
  suppressedLeads: number;
  activeSequences: number;
  emailsSentToday: number;
  bySlug: Array<{
    slug: string;
    queued: number;
    sent: number;
    opened: number;
    clicked: number;
  }>;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalQueued: 0, totalSent: 0, totalDelivered: 0, totalOpened: 0,
      totalClicked: 0, totalBounced: 0, totalFailed: 0, totalCancelled: 0,
      suppressedLeads: 0, activeSequences: 0, emailsSentToday: 0, bySlug: [],
    };
  }

  try {
    const [overview] = await db.execute(sql.raw(`
      SELECT
        COUNT(*) as totalQueued,
        SUM(status = 'sent') as totalSent,
        SUM(status = 'sent' AND opened_at IS NOT NULL) as totalOpened,
        SUM(status = 'sent' AND clicked_at IS NOT NULL) as totalClicked,
        SUM(status = 'bounced') as totalBounced,
        SUM(status = 'failed') as totalFailed,
        SUM(status = 'cancelled') as totalCancelled,
        SUM(status = 'sent' AND sent_at >= CURDATE()) as emailsSentToday
      FROM email_queue
    `));
    const o = (Array.isArray(overview) ? (Array.isArray(overview[0]) ? overview[0] : overview) : [overview])[0] as any;

    const [suppressed] = await db.execute(sql.raw(`
      SELECT COUNT(*) as cnt FROM leads WHERE suppressed = TRUE
    `));
    const s = (Array.isArray(suppressed) ? (Array.isArray(suppressed[0]) ? suppressed[0] : suppressed) : [suppressed])[0] as any;

    const [active] = await db.execute(sql.raw(`
      SELECT COUNT(*) as cnt FROM leads WHERE sequence_status = 'active'
    `));
    const a = (Array.isArray(active) ? (Array.isArray(active[0]) ? active[0] : active) : [active])[0] as any;

    const [slugRows] = await db.execute(sql.raw(`
      SELECT
        email_slug as slug,
        COUNT(*) as queued,
        SUM(status = 'sent') as sent,
        SUM(status = 'sent' AND opened_at IS NOT NULL) as opened,
        SUM(status = 'sent' AND clicked_at IS NOT NULL) as clicked
      FROM email_queue
      GROUP BY email_slug
      ORDER BY FIELD(email_slug, ${EMAIL_SEQUENCE.map((e) => `'${e.slug}'`).join(",")}, 'nudge_still_deciding', 'post_conversion', 'backfill_a', 'backfill_b', 'backfill_c')
    `));
    const bySlug = (Array.isArray(slugRows) ? (Array.isArray(slugRows[0]) ? slugRows[0] : slugRows) : []) as any[];

    return {
      totalQueued: o?.totalQueued ?? 0,
      totalSent: o?.totalSent ?? 0,
      totalDelivered: o?.totalSent ?? 0,
      totalOpened: o?.totalOpened ?? 0,
      totalClicked: o?.totalClicked ?? 0,
      totalBounced: o?.totalBounced ?? 0,
      totalFailed: o?.totalFailed ?? 0,
      totalCancelled: o?.totalCancelled ?? 0,
      suppressedLeads: s?.cnt ?? 0,
      activeSequences: a?.cnt ?? 0,
      emailsSentToday: o?.emailsSentToday ?? 0,
      bySlug: bySlug.map((r) => ({
        slug: r.slug,
        queued: r.queued ?? 0,
        sent: r.sent ?? 0,
        opened: r.opened ?? 0,
        clicked: r.clicked ?? 0,
      })),
    };
  } catch (error) {
    console.error("[EmailQueue] Failed to get metrics:", error);
    return {
      totalQueued: 0, totalSent: 0, totalDelivered: 0, totalOpened: 0,
      totalClicked: 0, totalBounced: 0, totalFailed: 0, totalCancelled: 0,
      suppressedLeads: 0, activeSequences: 0, emailsSentToday: 0, bySlug: [],
    };
  }
}
