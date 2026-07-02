import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { getEmailMetrics, enqueueBackfillDrip, cancelPendingEmails, suppressLead, cancelSequenceForLead, enqueueEmailSequence } from "../email/queue";
import { sql } from "drizzle-orm";
import { getResend, getEmailFrom } from "../email/resend";
import { getEmailTemplate, isPostConversionTemplate, type EmailPersonalization } from "../email/templates";
import { ENV } from "../_core/env";

export const emailRouter = router({
  /**
   * Admin: Create a test lead and enqueue the full 7-email sequence.
   * Email 0 fires in 30s, email 6 fires in 60s (both bypass send window).
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

      // Insert test lead — use minimal columns that exist
      await db.execute(sql.raw(`
        INSERT INTO leads (id, publicId, email, createdAt, updatedAt)
        VALUES ('${leadId}', '${publicId}', '${input.email}', NOW(), NOW())
      `));
      console.log(`[TestSend] Created test lead ${leadId} (${publicId}) → ${input.email}`);

      // Enqueue full 7-email sequence
      await enqueueEmailSequence(leadId, new Date());
      console.log(`[TestSend] Enqueued 7 emails for lead ${leadId}`);

      // Set email_0 and email_6 to fire in 30s (bypass send window via test_* prefix)
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
        priceFrom: "$179/mo",
        shipDays: 4,
        answerEcho: "Based on your goals and budget, this is the best fit.",
        whyRow1: "Best price-to-care ratio for your budget",
        whyRow2: "Available in your state with fast shipping",
        whyRow3: "Includes unlimited follow-up visits",
        resultsUrl: `${ENV.siteUrl || "https://www.peptidepilot.me"}/results/test-public-id`,
        goUrl: `${ENV.siteUrl || "https://www.peptidepilot.me"}/results/test-public-id`,
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
        SELECT id, createdAt FROM leads WHERE id = '${input.leadId}'
      `));
      const leads = Array.isArray(leadRows) ? (Array.isArray(leadRows[0]) ? leadRows[0] : leadRows) : [];
      if (leads.length === 0) throw new Error("Lead not found");

      const lead = leads[0] as any;
      const count = await enqueueBackfillDrip(lead.id, new Date(lead.createdAt), input.startAfterDays);
      return { queued: count };
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
        SELECT l.id, l.createdAt
        FROM leads l
        WHERE l.email NOT LIKE 'anonymous+%'
          AND l.suppressed = FALSE
          AND ${dateFilter}
          AND NOT EXISTS (SELECT 1 FROM email_queue eq WHERE eq.lead_id = l.id)
        ORDER BY l.createdAt DESC
        LIMIT 500
      `));

      const eligibleLeads = (Array.isArray(leadRows) ? (Array.isArray(leadRows[0]) ? leadRows[0] : leadRows) : []) as any[];

      if (input.dryRun) {
        return {
          eligibleCount: eligibleLeads.length,
          dryRun: true,
          message: `Found ${eligibleLeads.length} eligible leads in ${input.segment} segment. Set dryRun=false to enqueue.`,
        };
      }

      let totalQueued = 0;
      for (const lead of eligibleLeads) {
        const count = await enqueueBackfillDrip(lead.id, new Date(lead.createdAt), 3);
        totalQueued += count;
      }

      return {
        eligibleCount: eligibleLeads.length,
        totalQueued,
        dryRun: false,
        message: `Enqueued ${totalQueued} emails across ${eligibleLeads.length} leads.`,
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
        SELECT l.id, l.publicId, l.email, l.createdAt, l.topPeptideMatch, l.tier,
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
