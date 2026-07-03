import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { getEmailMetrics, enqueueBackfillDrip, enqueueBackfillCampaign, cancelPendingEmails, suppressLead, cancelSequenceForLead, enqueueEmailSequence } from "../email/queue";
import { sql } from "drizzle-orm";
import { getResend, getEmailFrom } from "../email/resend";
import { getEmailTemplate, isPostConversionTemplate, type EmailPersonalization } from "../email/templates";
import { ENV } from "../_core/env";

export const emailRouter = router({
  /**
   * Admin: Create a test lead and enqueue the full 7-email sequence.
   * Email 0 fires in 30s, email 6 fires in 30s (both bypass send window).
   * All other emails stay pending for their normal scheduled times.
   */
  createTestLead: adminProcedure
    .input(z.object({
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const leadId = crypto.randomUUID();
      const publicId = "test-" + Date.now();

      // Insert test lead with realistic quiz data so buildPersonalization works
      const providerMatches = JSON.stringify([
        { slug: "gala", displayName: "Gala Health", fitScore: 8, score: 8, name: "Gala Health", whyMatch: ["Best price-to-care ratio for your budget", "Available in your state with fast shipping", "Includes unlimited follow-up visits"] },
        { slug: "sprout", displayName: "Sprout", fitScore: 6, score: 6, name: "Sprout", whyMatch: ["No long-term contracts", "Free shipping on all orders", "Board-certified providers"] },
        { slug: "direct_med", displayName: "Direct Meds", fitScore: 5, score: 5, name: "Direct Meds", whyMatch: ["Board-certified MD oversight", "Competitive pricing", "Fast turnaround"] },
      ]);
      const rawQuizData = JSON.stringify([0, 1, 2, 1, 0, 2, 1, 0]);
      await db.execute(sql.raw(`
        INSERT INTO leads (id, publicId, email, ageRange, primaryGoal, budget, topPeptideMatch, tier, consentGiven, consentTimestamp, ipAddress, rawQuizData, source, provider_matches)
        VALUES ('${leadId}', '${publicId}', '${input.email}', '25-34', 'weight-management', 'standard', 'gala', 1, TRUE, NOW(), '127.0.0.1', '${rawQuizData}', 'email_test', '${providerMatches}')
      `));
      console.log(`[TestSend] Created test lead ${leadId} (${publicId}) → ${input.email}`);

      // Enqueue full 7-email sequence
      await enqueueEmailSequence(leadId, new Date());
      console.log(`[TestSend] Enqueued 7 emails for lead ${leadId}`);

      // Set email_0 and email_6 to fire in 30s (bypass send window via slug exemption)
      const nextTick = new Date(Date.now() + 30_000).toISOString().slice(0, 19).replace("T", " ");
      await db.execute(sql.raw(`
        UPDATE email_queue
        SET scheduled_at = '${nextTick}'
        WHERE lead_id = '${leadId}'
          AND email_slug IN ('email_0_instant', 'email_6_closer')
      `));

      // Fetch all queue rows for the lead
      const [rows] = await db.execute(sql.raw(`
        SELECT id, email_slug, subject_variant, scheduled_at, status
        FROM email_queue
        WHERE lead_id = '${leadId}'
        ORDER BY scheduled_at ASC
      `));
      const queueRows = (Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : []) as any[];

      return {
        leadId,
        publicId,
        email: input.email,
        queueRows,
      };
    }),

  /**
   * Admin: Manual trigger — run one cron tick on demand.
   */
  triggerCron: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const resend = getResend();
    if (!resend) throw new Error("Resend not configured");

    try {
      // Test the exact same JOIN query the worker uses
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
        "LIMIT 10"
      ));
      const pending = Array.isArray(pendingRows)
        ? (Array.isArray(pendingRows[0]) ? pendingRows[0] : pendingRows)
        : [];

      return { pendingCount: pending.length, rows: pending.slice(0, 3) };
    } catch (err: any) {
      return { error: err.message, sqlState: err.sqlState, code: err.code };
    }
  }),

  /**
   * Admin: Update a lead's provider_matches directly (for testing).
   */
  updateLeadMatches: adminProcedure
    .input(z.object({
      leadId: z.string().min(8).max(64),
      providerMatches: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Use parameterized query to safely store JSON
      await db.execute(sql.raw(
        "UPDATE leads SET `provider_matches` = '" + input.providerMatches.replace(/'/g, "\\'") + "' WHERE id = '" + input.leadId + "'"
      ));
      return { success: true };
    }),

  /**
   * Admin: Update a lead's provider_matches directly via JSON parameter (safe).
   */
  updateLeadMatchesJson: adminProcedure
    .input(z.object({
      leadId: z.string().min(8).max(64),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Use a Drizzle sql tagged template for proper parameterization
      const matches = [
        { slug: "gala", displayName: "Gala Health", fitScore: 8, score: 8, name: "Gala Health", whyMatch: ["Best price-to-care ratio for your budget", "Available in your state with fast shipping", "Includes unlimited follow-up visits"] },
        { slug: "sprout", displayName: "Sprout", fitScore: 6, score: 6, name: "Sprout", whyMatch: ["No long-term contracts", "Free shipping on all orders", "Board-certified providers"] },
        { slug: "direct_med", displayName: "Direct Meds", fitScore: 5, score: 5, name: "Direct Meds", whyMatch: ["Board-certified MD oversight", "Competitive pricing", "Fast turnaround"] },
      ];
      const matchesJson = JSON.stringify(matches).replace(/'/g, "\\'");

      await db.execute(sql.raw(
        "UPDATE leads SET `provider_matches` = '" + matchesJson + "' WHERE id = '" + input.leadId + "'"
      ));
      return { success: true };
    }),

  /**
   * Admin: Debug personalization for a lead.
   */
  debugPersonalization: adminProcedure
    .input(z.object({ leadId: z.string().min(8).max(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { error: "no db" };

      const [rows] = await db.execute(sql.raw(
        "SELECT id, `publicId`, email, `topPeptideMatch`, `provider_matches`, `rawQuizData` " +
        "FROM leads WHERE id = '" + input.leadId + "' LIMIT 1"
      ));
      const arr = Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : [];
      if (arr.length === 0) return { error: "lead not found" };

      const lead = arr[0] as any;
      let providerMatches = null;
      try { providerMatches = JSON.parse(lead.provider_matches || "[]"); } catch (e) { providerMatches = { parseError: String(e) }; }

      let provider = null;
      try {
        const topMatch = providerMatches?.[0] || {};
        const slug = topMatch.slug || lead.topPeptideMatch;
        const [provRows] = await db.execute(sql.raw(
          "SELECT `slug`, `display_name` AS `displayName`, `price_from_cents` AS `priceFromCents`, " +
          "`ship_days_estimate` AS `shipDaysEstimate`, `promo_code` AS `promoCode`, `compliance_note` AS `complianceNote` " +
          "FROM providers WHERE slug = '" + slug + "' LIMIT 1"
        ));
        const provArr = Array.isArray(provRows) ? (Array.isArray(provRows[0]) ? provRows[0] : provRows) : [];
        provider = provArr[0] || null;
      } catch (e) { provider = { error: String(e) }; }

      return { lead: { id: lead.id, email: lead.email, publicId: lead.publicId, topPeptideMatch: lead.topPeptideMatch }, providerMatches, provider };
    }),

  /**
   * Admin: Surface the raw MySQL error from the JOIN query.
   */
  debugJoin: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { error: "no db" };

    // 1. Minimal JOIN — surface the actual error
    let joinError: any = null;
    try {
      await db.execute(sql.raw(
        "SELECT eq.id FROM email_queue eq JOIN leads l ON l.id = eq.lead_id LIMIT 1"
      ));
    } catch (err: any) {
      joinError = {
        message: err?.message,
        code: err?.code,
        errno: err?.errno,
        sqlState: err?.sqlState,
        sqlMessage: err?.sqlMessage,
        causeMessage: err?.cause?.message,
        causeCode: err?.cause?.code,
        causeSqlMessage: err?.cause?.sqlMessage,
        causeErrno: err?.cause?.errno,
      };
    }

    // 2. SHOW CREATE TABLE email_queue
    let emailQueueCreate: any = null;
    try {
      const [rows] = await db.execute(sql.raw("SHOW CREATE TABLE email_queue"));
      const arr = Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : [];
      emailQueueCreate = arr[0] || null;
    } catch (err: any) {
      emailQueueCreate = { error: err?.message };
    }

    // 3. SHOW CREATE TABLE leads
    let leadsCreate: any = null;
    try {
      const [rows] = await db.execute(sql.raw("SHOW CREATE TABLE leads"));
      const arr = Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : [];
      leadsCreate = arr[0] || null;
    } catch (err: any) {
      leadsCreate = { error: err?.message };
    }

    return { joinError, emailQueueCreate, leadsCreate };
  }),

  /**
   * Admin: Fix collation on a table to match leads (utf8mb4_0900_ai_ci).
   */
  fixCollation: adminProcedure
    .input(z.object({ tableName: z.string().min(1).max(64) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        await db.execute(sql.raw(
          "ALTER TABLE `" + input.tableName + "` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
        ));
        return { success: true, table: input.tableName };
      } catch (err: any) {
        return { success: false, error: err?.sqlMessage || err?.message };
      }
    }),

  /**
   * Admin: Sweep all tables for collation mismatches vs leads table.
   */
  sweepCollations: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { error: "no db" };

    const [rows] = await db.execute(sql.raw("SHOW TABLE STATUS"));
    const tables = (Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : []) as any[];

    const leadsCollation = "utf8mb4_0900_ai_ci";
    const results = tables.map((t: any) => ({
      table: t.Name,
      collation: t.Collation,
      match: t.Collation === leadsCollation,
    }));

    const mismatches = results.filter((r: any) => !r.match);
    return { leadsCollation, allTables: results, mismatches };
  }),

  /**
   * Admin: Diagnose why cron worker isn't processing.
   */
  diagnose: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { error: "no db" };

    // Check if suppressed/sequence_status columns exist on leads
    const [cols] = await db.execute(sql.raw(`SHOW COLUMNS FROM leads`));
    const colRows = Array.isArray(cols) ? (Array.isArray(cols[0]) ? cols[0] : cols) : [];
    const colNames = colRows.map((c: any) => c.Field);

    // Check pending queue rows (no JOIN to avoid column errors)
    const [pending] = await db.execute(sql.raw(`
      SELECT id, lead_id, email_slug, subject_variant, scheduled_at, status
      FROM email_queue
      WHERE status = 'pending' AND scheduled_at <= NOW()
      LIMIT 5
    `));
    const pendingRows = Array.isArray(pending) ? (Array.isArray(pending[0]) ? pending[0] : pending) : [];

    // Check daily cap
    const [todayCount] = await db.execute(sql.raw(`
      SELECT COUNT(*) as cnt FROM email_queue WHERE status = 'sent' AND sent_at >= CURDATE()
    `));
    const cntRows = Array.isArray(todayCount) ? (Array.isArray(todayCount[0]) ? todayCount[0] : todayCount) : [];

    return {
      leadsColumns: colNames,
      hasSuppressed: colNames.includes("suppressed"),
      hasSequenceStatus: colNames.includes("sequence_status"),
      pendingDueRows: pendingRows,
      sentToday: (cntRows[0] as any)?.cnt ?? 0,
      dailyCap: parseInt(process.env.EMAIL_DAILY_CAP || "50", 10),
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
    };
  }),

  /**
   * Admin: Get email metrics for dashboard.
   */
  metrics: adminProcedure.query(async () => {
    return getEmailMetrics();
  }),

  /**
   * Admin: Get recent email queue entries for a specific lead.
   */
  leadQueue: adminProcedure
    .input(z.object({ leadId: z.string().min(8).max(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const [rows] = await db.execute(sql.raw(`
        SELECT id, lead_id, email_slug, subject_variant, scheduled_at, sent_at, opened_at,
               clicked_at, status, error, resend_id, created_at
        FROM email_queue
        WHERE lead_id = '${input.leadId}'
        ORDER BY scheduled_at ASC
      `));

      return (Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : []) as any[];
    }),

  /**
   * Admin: Cancel sequence for a lead (stop-on-conversion).
   */
  cancelSequence: adminProcedure
    .input(z.object({ leadId: z.string().min(8).max(64) }))
    .mutation(async ({ input }) => {
      await cancelSequenceForLead(input.leadId);
      return { success: true };
    }),

  /**
   * Admin: Send test email (email 0 + email 6) to a specific address.
   * Does NOT enqueue — sends directly via Resend.
   */
  sendTestEmail: adminProcedure
    .input(z.object({
      toEmail: z.string().email(),
      emailSlug: z.enum(["email_0_instant", "email_6_closer"]),
    }))
    .mutation(async ({ input }) => {
      const resend = getResend();
      if (!resend) throw new Error("Resend not configured");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Use a fake lead for test rendering — we'll use a test personalization
      const p: EmailPersonalization = {
        leadId: "test-lead",
        publicId: "test-public-id",
        providerName: "Gala Health",
        matchScore: 92,
        priceFrom: "$179",
        shipDays: 4,
        answerEcho: "Based on your goals and budget, this is the best fit.",
        whyRow1: "Best price-to-care ratio for your budget",
        whyRow2: "Available in your state with fast shipping",
        whyRow3: "Includes unlimited follow-up visits",
        resultsUrl: `${ENV.appBaseUrl}/results/test-public-id`,
        goUrl: `${ENV.appBaseUrl}/results/test-public-id`,
        alt1Name: "Sprout",
        alt1Differentiator: "No long-term contracts, free shipping",
        alt2Name: "Direct Meds",
        alt2Differentiator: "Board-certified MD oversight",
        promoCode: null,
        complianceNote: "Compounded medications are not FDA-approved finished drug products.",
        mailingAddress: process.env.EMAIL_PHYSICAL_ADDRESS || "1234 Health Way, Suite 100, Austin, TX 78701",
      };

      const templateFn = getEmailTemplate(input.emailSlug);
      if (!templateFn) throw new Error(`Unknown email slug: ${input.emailSlug}`);

      let result: { subject: string; html: string };
      if (isPostConversionTemplate(input.emailSlug)) {
        result = (templateFn as any)(p);
      } else {
        result = (templateFn as any)(p, "A");
      }

      const sendResult = await resend.emails.send({
        from: getEmailFrom(),
        to: [input.toEmail],
        subject: `[TEST] ${result.subject}`,
        html: result.html,
      });

      if (sendResult.error) {
        throw new Error(`Resend error: ${sendResult.error.message}`);
      }

      return {
        success: true,
        resendId: sendResult.data?.id,
        subject: `[TEST] ${result.subject}`,
      };
    }),

  /**
   * Admin: Enqueue backfill drip for a single lead.
   */
  backfillLead: adminProcedure
    .input(z.object({
      leadId: z.string().min(8).max(64),
      startAfterDays: z.number().min(0).max(30).default(3),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [leadRows] = await db.execute(sql.raw(`
        SELECT id, createdAt, quiz_stale FROM leads WHERE id = '${input.leadId}'
      `));
      const leads = Array.isArray(leadRows) ? (Array.isArray(leadRows[0]) ? leadRows[0] : leadRows) : [];
      if (leads.length === 0) throw new Error("Lead not found");

      const lead = leads[0] as any;
      const isStale = lead.quiz_stale === 1 || lead.quiz_stale === true;
      // Older-quiz leads get the retake template; everyone else the normal drip.
      const count = isStale
        ? await enqueueBackfillCampaign(lead.id, "backfill_stale", new Date(lead.createdAt))
        : await enqueueBackfillDrip(lead.id, new Date(lead.createdAt), input.startAfterDays);
      return { queued: count, template: isStale ? "backfill_stale" : "drip" };
    }),

  /**
   * Admin: Enqueue backfill for a segment of leads.
   */
  backfillSegment: adminProcedure
    .input(z.object({
      segment: z.enum(["30d", "31-90d", "90d+"]),
      dryRun: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let dateFilter: string;
      switch (input.segment) {
        case "30d":
          dateFilter = "createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          break;
        case "31-90d":
          dateFilter = "createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY) AND createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY)";
          break;
        case "90d+":
          dateFilter = "createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY)";
          break;
      }

      const [leadRows] = await db.execute(sql.raw(`
        SELECT l.id, l.createdAt, l.quiz_stale
        FROM leads l
        WHERE l.email NOT LIKE 'anonymous+%'
          AND l.suppressed = FALSE
          AND ${dateFilter}
          AND NOT EXISTS (SELECT 1 FROM email_queue eq WHERE eq.lead_id = l.id)
        ORDER BY l.createdAt DESC
        LIMIT 500
      `));

      const eligibleLeads = (Array.isArray(leadRows) ? (Array.isArray(leadRows[0]) ? leadRows[0] : leadRows) : []) as any[];
      const staleCount = eligibleLeads.filter((l) => l.quiz_stale === 1 || l.quiz_stale === true).length;

      if (input.dryRun) {
        return {
          eligibleCount: eligibleLeads.length,
          staleCount,
          dryRun: true,
          message: `Found ${eligibleLeads.length} eligible leads in ${input.segment} segment (${staleCount} stale → retake email). Set dryRun=false to enqueue.`,
        };
      }

      let totalQueued = 0;
      for (const lead of eligibleLeads) {
        const isStale = lead.quiz_stale === 1 || lead.quiz_stale === true;
        // Older-quiz leads can't be shown a match — send the dedicated retake
        // template (backfill_stale) instead of the normal "here are your results"
        // drip, whose copy would falsely promise saved results.
        const count = isStale
          ? await enqueueBackfillCampaign(lead.id, "backfill_stale", new Date(lead.createdAt))
          : await enqueueBackfillDrip(lead.id, new Date(lead.createdAt), 3);
        totalQueued += count;
      }

      return {
        eligibleCount: eligibleLeads.length,
        staleCount,
        totalQueued,
        dryRun: false,
        message: `Enqueued ${totalQueued} emails across ${eligibleLeads.length} leads (${staleCount} routed to retake email).`,
      };
    }),

  /**
   * Admin: Suppress a lead (cancel pending emails).
   */
  suppressLead: adminProcedure
    .input(z.object({ leadId: z.string().min(8).max(64) }))
    .mutation(async ({ input }) => {
      await suppressLead(input.leadId, "admin");
      return { success: true };
    }),

  /**
   * Admin: Get leads eligible for backfill.
   */
  eligibleLeads: adminProcedure
    .input(z.object({
      segment: z.enum(["30d", "31-90d", "90d+"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let dateFilter: string;
      switch (input.segment) {
        case "30d":
          dateFilter = "createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
          break;
        case "31-90d":
          dateFilter = "createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY) AND createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY)";
          break;
        case "90d+":
          dateFilter = "createdAt < DATE_SUB(NOW(), INTERVAL 90 DAY)";
          break;
      }

      const [rows] = await db.execute(sql.raw(`
        SELECT l.id, l.publicId, l.email, l.createdAt, l.topPeptideMatch, l.tier, l.quiz_stale,
          (SELECT COUNT(*) FROM email_queue eq WHERE eq.lead_id = l.id) as queueCount
        FROM leads l
        WHERE l.email NOT LIKE 'anonymous+%'
          AND l.suppressed = FALSE
          AND ${dateFilter}
        ORDER BY l.createdAt DESC
        LIMIT 100
      `));

      return (Array.isArray(rows) ? (Array.isArray(rows[0]) ? rows[0] : rows) : []) as any[];
    }),
});
