import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { getResend, getEmailFrom } from "./resend";
import { getEmailTemplate, isPostConversionTemplate, type EmailPersonalization } from "./templates";
import { generateUnsubscribeToken } from "./schema";
import { ENV } from "../_core/env";
import { EMAIL_SEQUENCE, SEND_WINDOW } from "../../shared/emailSequence";
import { checkStopOnSilence } from "./queue";

const SEND_INTERVAL_MS = 15_000;
const BATCH_SIZE = 10;

let _cronTimer: ReturnType<typeof setInterval> | null = null;

export function startEmailCron() {
  if (_cronTimer) return;
  if (!process.env.RESEND_API_KEY) {
    console.log("[EmailCron] RESEND_API_KEY not set — cron worker disabled");
    return;
  }

  console.log("[EmailCron] Starting email cron worker (every 15s)");
  _cronTimer = setInterval(processEmailBatch, SEND_INTERVAL_MS);
  setTimeout(processEmailBatch, 5_000);
}

export function stopEmailCron() {
  if (_cronTimer) {
    clearInterval(_cronTimer);
    _cronTimer = null;
    console.log("[EmailCron] Stopped email cron worker");
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

async function processEmailBatch() {
  const db = await getDb();
  if (!db) return;

  const resend = getResend();
  if (!resend) return;

  const dailyCap = parseInt(process.env.EMAIL_DAILY_CAP || "50", 10);

  try {
    // Check daily cap
    const [todayCount] = await db.execute(sql.raw(`
      SELECT COUNT(*) as cnt FROM email_queue
      WHERE status = 'sent' AND sent_at >= CURDATE()
    `));
    const rows = Array.isArray(todayCount) ? (Array.isArray(todayCount[0]) ? todayCount[0] : todayCount) : [];
    const sentToday = (rows[0] as any)?.cnt ?? 0;

    if (sentToday >= dailyCap) return;

    const remaining = dailyCap - sentToday;
    const batchSize = Math.min(BATCH_SIZE, remaining);

    // Fetch pending emails that are due
    const [pendingRows] = await db.execute(sql.raw(
      "SELECT eq.id, eq.lead_id, eq.email_slug, eq.subject_variant, eq.scheduled_at, " +
      "l.email, l.`publicId`, l.`topPeptideMatch`, l.suppressed, l.sequence_status " +
      "FROM email_queue eq " +
      "JOIN leads l ON l.id = eq.lead_id " +
      "WHERE eq.status = 'pending' " +
      "AND eq.scheduled_at <= NOW() " +
      "AND (l.suppressed IS NULL OR l.suppressed = 0) " +
      "AND (l.sequence_status = 'active' OR l.sequence_status IS NULL) " +
      "AND l.email NOT LIKE 'anonymous+%' " +
      "ORDER BY eq.scheduled_at ASC " +
      "LIMIT " + batchSize
    ));

    const pending = Array.isArray(pendingRows)
      ? (Array.isArray(pendingRows[0]) ? pendingRows[0] : pendingRows)
      : [];

    if (pending.length === 0) return;

    for (const row of pending) {
      const r = row as any;

      // Skip emails 1-5 if outside send window (email 0 is instant, always send)
      // post-conversion and nudge also bypass the window
      if (r.email_slug !== "email_0_instant" && r.email_slug !== "email_6_closer" && r.email_slug !== "post_conversion" && r.email_slug !== "nudge_still_deciding") {
        if (!isWithinSendWindow()) {
          continue; // skip — will be picked up next tick within window
        }
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

      // After sending emails 0, 1, or 2: check stop-on-silence
      if (["email_0_instant", "email_1_why_match", "email_2_cost"].includes(r.email_slug)) {
        await checkStopOnSilence(r.lead_id);
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

    const siteUrl = ENV.siteUrl || "https://www.peptidepilot.me";

    return {
      leadId,
      publicId,
      providerName: topMatch.displayName || provider.displayName || topMatch.name || topPeptideMatch,
      matchScore: Math.round((topMatch.fitScore || topMatch.score || 0) * 100),
      priceFrom: provider.priceFromCents ? `$${Math.round(provider.priceFromCents / 100)}/mo` : "$199/mo",
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
  return `${ENV.siteUrl || "https://www.peptidepilot.me"}/api/email/unsubscribe?token=${token}`;
}
