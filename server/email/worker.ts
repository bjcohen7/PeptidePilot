import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { getResend, getEmailFrom } from "./resend";
import { getEmailTemplate, isPostConversionTemplate, type EmailPersonalization } from "./templates";
import { generateUnsubscribeToken } from "./schema";
import { ENV } from "../_core/env";
import { EMAIL_SEQUENCE, SEND_WINDOW } from "../../shared/emailSequence";
import { checkStopOnSilence } from "./queue";
import { reconcileIncompleteLeads } from "./reconcile";
import { matchPercentFromFitScore } from "../../shared/matchDisplay";

const SEND_INTERVAL_MS = 15_000;
const BATCH_SIZE = 10;
const RECONCILE_INTERVAL_MS = 60 * 60 * 1000; // hourly leak-alarm sweep

// Backfill campaigns are re-engagement, never sequence. They must always yield
// the daily cap to sequence + behavioral sends (see the two-phase batch below).
const BACKFILL_SLUGS = "('backfill_a', 'backfill_b', 'backfill_c', 'backfill_stale')";

// Transactional sends: a fresh lead's "your match is ready" (email_0) and the
// post-conversion "you started" note. Both are cap-EXEMPT — they send uncapped
// and don't count toward the bulk cap, which exists to throttle volume, not
// one-per-event transactionals.
const EXEMPT_SLUGS = "('email_0_instant', 'post_conversion')";

function extractRows(result: unknown): any[] {
  return Array.isArray(result) ? ((Array.isArray(result[0]) ? result[0] : result) as any[]) : [];
}

let _cronTimer: ReturnType<typeof setInterval> | null = null;
let _reconcileTimer: ReturnType<typeof setInterval> | null = null;

async function runReconcile() {
  try {
    await reconcileIncompleteLeads();
  } catch (err) {
    console.error("[LeakAlarm] reconcile sweep crashed:", err);
  }
}

export function startEmailCron() {
  if (_cronTimer) return;
  if (!process.env.RESEND_API_KEY) {
    console.log("[EmailCron] RESEND_API_KEY not set — cron worker disabled");
    return;
  }

  console.log("[EmailCron] Starting email cron worker (every 15s)");
  _cronTimer = setInterval(processEmailBatch, SEND_INTERVAL_MS);
  setTimeout(processEmailBatch, 5_000);

  // Leak-alarm safety net: hourly sweep that detects + self-heals shell leads
  // (email captured but pipeline incomplete) and loudly logs the failure class.
  _reconcileTimer = setInterval(runReconcile, RECONCILE_INTERVAL_MS);
  setTimeout(runReconcile, 90_000);
}

export function stopEmailCron() {
  if (_cronTimer) {
    clearInterval(_cronTimer);
    _cronTimer = null;
    console.log("[EmailCron] Stopped email cron worker");
  }
  if (_reconcileTimer) {
    clearInterval(_reconcileTimer);
    _reconcileTimer = null;
  }
}

/**
 * Check if current time is within the send window (9:00-10:30am ET).
 */
function isWithinSendWindow(): boolean {
  const now = new Date();
  const etStr = now.toLocaleString("en-US", {
    timeZone: SEND_WINDOW.timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const [hourStr, minuteStr] = etStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const timeInMinutes = hour * 60 + minute;
  const startMinutes = SEND_WINDOW.startHour * 60 + SEND_WINDOW.startMinute;
  const endMinutes = SEND_WINDOW.endHour * 60 + SEND_WINDOW.endMinute;
  return timeInMinutes >= startMinutes && timeInMinutes <= endMinutes;
}

/**
 * Check if a scheduled date falls on a weekend.
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Send a fetched set of due rows, honoring the send window (email_0/6,
 * post-conversion, and nudge bypass it). Returns the number actually
 * dispatched, for cap accounting.
 */
async function dispatchRows(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  resend: NonNullable<ReturnType<typeof getResend>>,
  rows: any[]
): Promise<number> {
  let sent = 0;
  for (const row of rows) {
    const r = row as any;

    // Emails 1-5 and backfill sends wait for the send window; email_0 (instant),
    // email_6, post-conversion, and nudge bypass it.
    if (r.email_slug !== "email_0_instant" && r.email_slug !== "email_6_closer" && r.email_slug !== "post_conversion" && r.email_slug !== "nudge_still_deciding") {
      if (!isWithinSendWindow()) continue;
    }

    await sendOneEmail(db, resend, {
      queueId: r.id,
      leadId: r.lead_id,
      emailSlug: r.email_slug,
      subjectVariant: r.subject_variant || "A",
      email: r.email,
      publicId: r.publicId,
      topPeptideMatch: r.topPeptideMatch,
    });
    sent++;

    // After sending emails 0, 1, or 2: check stop-on-silence
    if (["email_0_instant", "email_1_why_match", "email_2_cost"].includes(r.email_slug)) {
      await checkStopOnSilence(r.lead_id);
    }
  }
  return sent;
}

async function processEmailBatch() {
  const db = await getDb();
  if (!db) return;

  const resend = getResend();
  if (!resend) return;

  const dailyCap = parseInt(process.env.EMAIL_DAILY_CAP || "50", 10);

  try {
    const dueClause =
      "eq.status = 'pending' " +
      "AND eq.scheduled_at <= NOW() " +
      "AND (l.suppressed IS NULL OR l.suppressed = 0) " +
      "AND (l.sequence_status = 'active' OR l.sequence_status IS NULL) " +
      "AND l.email NOT LIKE 'anonymous+%' ";
    const cols =
      "SELECT eq.id, eq.lead_id, eq.email_slug, eq.subject_variant, eq.scheduled_at, " +
      "l.email, l.`publicId`, l.`topPeptideMatch` " +
      "FROM email_queue eq JOIN leads l ON l.id = eq.lead_id ";

    // ── Phase 0: transactional sends — CAP-EXEMPT, always dispatched ─────────
    // email_0 ("your match is ready") and post_conversion ("you started") are
    // one-per-event transactionals that must never wait for cap headroom (a
    // day-late transactional during the backfill run would be a real miss). They
    // send uncapped and do NOT count toward the bulk cap, which exists to
    // protect sender reputation from volume, not transactionals.
    const e0Rows = extractRows(await db.execute(sql.raw(
      cols + "WHERE " + dueClause + "AND eq.email_slug IN " + EXEMPT_SLUGS + " " +
      "ORDER BY eq.scheduled_at ASC LIMIT " + BATCH_SIZE
    )));
    await dispatchRows(db, resend, e0Rows);

    // The bulk cap counts only NON-transactional sends.
    const [capCount] = await db.execute(sql.raw(`
      SELECT COUNT(*) as cnt FROM email_queue
      WHERE status = 'sent' AND sent_at >= CURDATE()
        AND email_slug NOT IN ${EXEMPT_SLUGS}
    `));
    const capRows = Array.isArray(capCount) ? (Array.isArray(capCount[0]) ? capCount[0] : capCount) : [];
    const cappedSentToday = (capRows[0] as any)?.cnt ?? 0;

    const remaining = Math.max(0, dailyCap - cappedSentToday);
    if (remaining <= 0) { await checkNudgeTriggers(db, resend); return; }

    // ── Phase A: other sequence + behavioral sends (capped) go before backfill ─
    // Backfill rows carry past scheduled_at, so a plain scheduled_at ordering
    // would let them jump ahead and consume the cap. Fetch non-backfill,
    // non-email_0 first; spend the rest on backfill in Phase B.
    const seqLimit = Math.min(BATCH_SIZE, remaining);
    const seqRows = extractRows(await db.execute(sql.raw(
      cols + "WHERE " + dueClause + "AND eq.email_slug NOT IN " + BACKFILL_SLUGS + " " +
      "AND eq.email_slug NOT IN " + EXEMPT_SLUGS + " " +
      "ORDER BY eq.scheduled_at ASC LIMIT " + seqLimit
    )));
    const sentA = await dispatchRows(db, resend, seqRows);

    // ── Phase B: backfill only from the cap headroom sequence didn't need ───
    // Skip if Phase A hit its limit (a sequence backlog remains this tick), or
    // if reserving every still-pending sequence obligation due today leaves no
    // room. Backfill consumes ONLY leftover cap.
    const seqBacklog = seqRows.length >= seqLimit;
    if (!seqBacklog) {
      const reserveRow = extractRows(await db.execute(sql.raw(
        "SELECT COUNT(*) cnt FROM email_queue eq JOIN leads l ON l.id = eq.lead_id " +
        "WHERE eq.status = 'pending' AND eq.email_slug NOT IN " + BACKFILL_SLUGS + " " +
        "AND eq.email_slug NOT IN " + EXEMPT_SLUGS + " " +
        "AND eq.scheduled_at < (CURDATE() + INTERVAL 1 DAY) " +
        "AND (l.suppressed IS NULL OR l.suppressed = 0) " +
        "AND (l.sequence_status = 'active' OR l.sequence_status IS NULL) " +
        "AND l.email NOT LIKE 'anonymous+%'"
      )));
      const reserveForSequence = Number((reserveRow[0] as any)?.cnt ?? 0);
      const backfillAllowance = Math.max(0, dailyCap - cappedSentToday - sentA - reserveForSequence);
      const backfillLimit = Math.min(BATCH_SIZE, backfillAllowance);
      if (backfillLimit > 0) {
        const bfRows = extractRows(await db.execute(sql.raw(
          cols + "WHERE " + dueClause + "AND eq.email_slug IN " + BACKFILL_SLUGS + " " +
          "ORDER BY eq.scheduled_at ASC " +
          "LIMIT " + backfillLimit
        )));
        await dispatchRows(db, resend, bfRows);
      }
    }

    // Check nudge triggers (every tick)
    await checkNudgeTriggers(db, resend);

  } catch (error: any) {
    console.error("[EmailCron] Batch processing error:", error?.message);
    console.error("[EmailCron] error.code:", error?.code);
    console.error("[EmailCron] error.errno:", error?.errno);
    console.error("[EmailCron] error.sqlState:", error?.sqlState);
    console.error("[EmailCron] error.sqlMessage:", error?.sqlMessage);
    console.error("[EmailCron] error.cause:", error?.cause?.message);
    console.error("[EmailCron] error.cause.code:", error?.cause?.code);
    console.error("[EmailCron] error.cause.sqlMessage:", error?.cause?.sqlMessage);
    console.error("[EmailCron] error.cause.errno:", error?.cause?.errno);
  }
}

/**
 * Check for leads with affiliate click + 3 days no conversion → enqueue nudge.
 */
async function checkNudgeTriggers(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  resend: NonNullable<ReturnType<typeof getResend>>
) {
  try {
    const [clickRows] = await db.execute(sql.raw(
      "SELECT DISTINCT l.id, l.`publicId`, l.`topPeptideMatch`, pcl.provider_slug " +
      "FROM leads l " +
      "JOIN provider_click_logs pcl ON pcl.lead_id = l.id " +
      "WHERE l.conversion_at IS NULL " +
      "AND l.nudge_sent = 0 " +
      "AND l.email NOT LIKE 'anonymous+%' " +
      "AND (l.suppressed IS NULL OR l.suppressed = 0) " +
      "AND (l.sequence_status = 'active' OR l.sequence_status IS NULL) " +
      "AND pcl.created_at <= DATE_SUB(NOW(), INTERVAL 3 DAY) " +
      "AND NOT EXISTS (" +
        "SELECT 1 FROM email_queue eq " +
        "WHERE eq.lead_id = l.id AND eq.email_slug = 'nudge_still_deciding'" +
      ") " +
      "LIMIT 10"
    ));

    const leads = Array.isArray(clickRows)
      ? (Array.isArray(clickRows[0]) ? clickRows[0] : clickRows)
      : [];

    for (const row of leads) {
      const r = row as any;
      const { enqueueNudge } = await import("./queue");
      const enqueued = await enqueueNudge(r.id);
      if (enqueued) {
        // Build personalization and send immediately
        const p = await buildPersonalization(db, r.id, r.publicId, r.topPeptideMatch);
        if (p) {
          const { assignSubjectVariant } = await import("./queue");
          const variant = assignSubjectVariant();
          const templateFn = getEmailTemplate("nudge_still_deciding");
          if (templateFn && !isPostConversionTemplate("nudge_still_deciding")) {
            const { subject, html } = (templateFn as any)(p, variant);
            try {
              const result = await resend.emails.send({
                from: getEmailFrom(),
                to: [r.email],
                subject,
                html,
                headers: {
                  "List-Unsubscribe": `<${generateUnsubHeader(r.id)}>`,
                },
              });
              if (!result.error) {
                await db.execute(sql.raw(`
                  UPDATE email_queue
                  SET status = 'sent', sent_at = NOW(), resend_id = '${result.data?.id || ""}'
                  WHERE lead_id = '${r.id}' AND email_slug = 'nudge_still_deciding' AND status = 'pending'
                  ORDER BY id DESC LIMIT 1
                `));
                console.log(`[EmailCron] Sent nudge to ${r.email} for lead ${r.id}`);
              }
            } catch (err) {
              console.error(`[EmailCron] Failed to send nudge for lead ${r.id}:`, err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[EmailCron] Nudge trigger check error:", error);
  }
}

/**
 * Build full personalization from lead + provider data.
 */
async function buildPersonalization(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  leadId: string,
  publicId: string,
  topPeptideMatch: string
): Promise<EmailPersonalization | null> {
  try {
    const [leadRows] = await db.execute(sql.raw(
      "SELECT id, `publicId`, email, `topPeptideMatch`, `provider_matches`, `rawQuizData` " +
      "FROM leads WHERE id = '" + leadId + "' LIMIT 1"
    ));
    const leadArr = Array.isArray(leadRows) ? (Array.isArray(leadRows[0]) ? leadRows[0] : leadRows) : [];
    if (leadArr.length === 0) return null;
    const lead = leadArr[0] as any;

    const providerMatches = typeof lead.provider_matches === "string"
      ? JSON.parse(lead.provider_matches || "[]")
      : Array.isArray(lead.provider_matches) ? lead.provider_matches : [];
    const topMatch = providerMatches[0] || {};
    const alt1 = providerMatches[1] || {};
    const alt2 = providerMatches[2] || {};

    // Get provider details from DB
    const [providerRows] = await db.execute(sql.raw(
      "SELECT `slug`, `display_name` AS `displayName`, `price_from_cents` AS `priceFromCents`, " +
      "`ship_days_estimate` AS `shipDaysEstimate`, `promo_code` AS `promoCode`, `compliance_note` AS `complianceNote` " +
      "FROM providers WHERE slug = '" + (topMatch.slug || topPeptideMatch) + "' LIMIT 1"
    ));
    const provArr = Array.isArray(providerRows) ? (Array.isArray(providerRows[0]) ? providerRows[0] : providerRows) : [];
    const provider = provArr[0] as any || {};

    const siteUrl = ENV.appBaseUrl;

    return {
      leadId,
      publicId,
      providerName: topMatch.displayName || provider.displayName || topMatch.name || topPeptideMatch,
      // Single source: same display % the results page renders (never fitScore*100,
      // which produced 300–800% for real leads whose fitScore is a 0–8 points sum).
      matchScore: matchPercentFromFitScore(topMatch.fitScore ?? topMatch.score) ?? 0,
      // Bare dollar amount only — templates own the "/month" suffix (avoids "$179/mo/month").
      priceFrom: provider.priceFromCents ? `$${Math.round(provider.priceFromCents / 100)}` : "$199",
      shipDays: provider.shipDaysEstimate || 4,
      answerEcho: "", // Will be populated from rawQuizData if needed
      whyRow1: topMatch.whyMatch?.[0] || "Matches your stated goals and budget",
      whyRow2: topMatch.whyMatch?.[1] || "Available in your state",
      whyRow3: topMatch.whyMatch?.[2] || "Competitive pricing for your budget",
      resultsUrl: `${siteUrl}/results/${publicId}`,
      goUrl: `${siteUrl}/results/${publicId}`,
      alt1Name: alt1.displayName || alt1.name || "Provider #2",
      alt1Differentiator: alt1.whyMatch?.[0] || "Alternative option",
      alt2Name: alt2.displayName || alt2.name || "Provider #3",
      alt2Differentiator: alt2.whyMatch?.[0] || "Another alternative",
      promoCode: provider.promoCode || null,
      complianceNote: provider.complianceNote || "Compounded medications are not FDA-approved finished drug products.",
      mailingAddress: process.env.EMAIL_PHYSICAL_ADDRESS || "1234 Health Way, Suite 100, Austin, TX 78701",
    };
  } catch (error) {
    console.error(`[EmailCron] Failed to build personalization for lead ${leadId}:`, error);
    return null;
  }
}

async function sendOneEmail(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  resend: NonNullable<ReturnType<typeof getResend>>,
  job: {
    queueId: number;
    leadId: string;
    emailSlug: string;
    subjectVariant: string;
    email: string;
    publicId: string;
    topPeptideMatch: string;
  }
) {
  const templateFn = getEmailTemplate(job.emailSlug);
  if (!templateFn) {
    await db.execute(sql.raw(`
      UPDATE email_queue SET status = 'failed', error = 'Unknown email slug: ${job.emailSlug}'
      WHERE id = ${job.queueId}
    `));
    return;
  }

  const p = await buildPersonalization(db, job.leadId, job.publicId, job.topPeptideMatch);
  if (!p) {
    await db.execute(sql.raw(`
      UPDATE email_queue SET status = 'failed', error = 'Could not build personalization'
      WHERE id = ${job.queueId}
    `));
    return;
  }

  const variant = job.subjectVariant === "B" ? "B" : "A";

  let subject: string;
  let html: string;

  if (isPostConversionTemplate(job.emailSlug)) {
    const result = (templateFn as any)(p);
    subject = result.subject;
    html = result.html;
  } else {
    const result = (templateFn as any)(p, variant);
    subject = result.subject;
    html = result.html;
  }

  try {
    const result = await resend.emails.send({
      from: getEmailFrom(),
      to: [job.email],
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<${generateUnsubHeader(job.leadId)}>`,
      },
    });

    if (result.error) {
      console.error(`[EmailCron] Resend error for queue ${job.queueId}:`, result.error);
      await db.execute(sql.raw(`
        UPDATE email_queue SET status = 'failed', error = '${String(result.error.message || result.error).replace(/'/g, "''")}'
        WHERE id = ${job.queueId}
      `));
      return;
    }

    await db.execute(sql.raw(`
      UPDATE email_queue
      SET status = 'sent', sent_at = NOW(), resend_id = '${result.data?.id || ""}'
      WHERE id = ${job.queueId}
    `));

    await db.execute(sql.raw(`
      UPDATE leads SET last_email_sent_at = NOW(), email_delivered = TRUE
      WHERE id = '${job.leadId}'
    `));

    console.log(`[EmailCron] Sent ${job.emailSlug} (${variant}) to ${job.email} (queue ${job.queueId})`);
  } catch (error) {
    console.error(`[EmailCron] Failed to send queue ${job.queueId}:`, error);
    await db.execute(sql.raw(`
      UPDATE email_queue SET status = 'failed', error = '${String(error).slice(0, 500).replace(/'/g, "''")}'
      WHERE id = ${job.queueId}
    `));
  }
}

function generateUnsubHeader(leadId: string): string {
  const token = generateUnsubscribeToken(leadId);
  return `${ENV.appBaseUrl}/api/email/unsubscribe?token=${token}`;
}
