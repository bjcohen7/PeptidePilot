import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { ensureAffiliateWorkspaceSchema, getDb } from "../db";
import { leads, affiliateClicks, visitorSessions, pageVisits } from "../../drizzle/schema";
import {
  calculateMatches,
  determineTier,
  QUIZ_INDEX,
  QUIZ_QUESTIONS,
  PRIMARY_GOAL_OPTIONS,
  BUDGET_OPTIONS,
  toReturningMatchSummary,
  type ReturningMatchSummary,
} from "../../shared/scoring";
import { nanoid } from "nanoid";
import { matchProviders } from "../../shared/providerMatching";
import { providers } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { desc, eq, sql, inArray } from "drizzle-orm";
import { sendMetaServerEvents } from "../_core/meta";
import { ENV } from "../_core/env";
import { randomBytes } from "crypto";
import { sendTelegramMessage } from "../_core/telegram";
import { enqueueEmailSequence } from "../email/queue";

const TIER1_WEBHOOK = process.env.WEBHOOK_TIER1_URL;
const TIER2_WEBHOOK = process.env.WEBHOOK_TIER2_URL;
const TIER3_WEBHOOK = process.env.WEBHOOK_TIER3_URL;
const RETURNING_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const returningLookupInput = z.object({
  token: z.string().min(8).max(128),
});

async function sendWebhook(url: string | undefined, payload: object) {
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[Webhook] Failed to send:", err);
  }
}

async function insertLead(
  values: Omit<typeof leads.$inferInsert, "sessionId" | "returningToken" | "tokenExpiresAt">
) {
  const db = await getDb();
  if (!db) return false;
  const publicId = values.publicId ?? values.id;
  await db.execute(sql`
    insert into leads (
      id,
      publicId,
      email,
      ageRange,
      primaryGoal,
      budget,
      topPeptideMatch,
      tier,
      consentGiven,
      consentTimestamp,
      ipAddress,
      rawQuizData,
      source,
      results
    ) values (
      ${values.id},
      ${publicId},
      ${values.email},
      ${values.ageRange},
      ${values.primaryGoal},
      ${values.budget},
      ${values.topPeptideMatch},
      ${values.tier},
      ${values.consentGiven},
      ${values.consentTimestamp},
      ${values.ipAddress},
      ${JSON.stringify(values.rawQuizData)},
      ${values.source ?? null},
      ${values.results ? JSON.stringify(values.results) : null}
    )
  `);
  return true;
}

async function generateAndStoreReturningToken(leadId: string) {
  const db = await getDb();
  if (!db) return null;
  const returningToken = createReturningToken();
  const tokenExpiresAt = createTokenExpiry();
  try {
    await db
      .update(leads)
      .set({ returningToken, tokenExpiresAt })
      .where(eq(leads.id, leadId));
  } catch (error) {
    console.error("[ReturningUser] Failed to store token:", error);
    return null;
  }
  return returningToken;
}

function createReturningToken() {
  return randomBytes(32).toString("hex");
}

function createTokenExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 180);
  return expiresAt;
}

function decodeLeadAnswers(rawQuizData: unknown) {
  if (!Array.isArray(rawQuizData)) return [];
  return rawQuizData.map((value) => {
    if (Array.isArray(value)) return value.filter((v) => typeof v === "number");
    if (typeof value === "number") return value;
    return -1;
  });
}

function buildReturningTopMatches(rawQuizData: unknown) {
  const answers = decodeLeadAnswers(rawQuizData);
  if (answers.length !== QUIZ_QUESTIONS.length) {
    return [];
  }

  return calculateMatches(answers).slice(0, 5).map((match) => ({
    slug: match.peptide.id,
    name: match.peptide.name,
    score: match.score,
    matchPercent: match.matchPercent,
  }));
}



export const quizRouter = router({
  getReturningResultsByToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(32).max(128),
      }),
    )
    .query(async ({ input }) => {
      await ensureAffiliateWorkspaceSchema();

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available." });
      }

      const rows = await db
        .select({
          id: leads.id,
          returningToken: leads.returningToken,
          tokenExpiresAt: leads.tokenExpiresAt,
          rawQuizData: leads.rawQuizData,
        })
        .from(leads)
        .where(eq(leads.returningToken, input.token))
        .limit(1);

      const lead = rows[0];
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Returning session not found." });
      }

      if (lead.tokenExpiresAt && lead.tokenExpiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Returning session not found." });
      }

      const answers = Array.isArray(lead.rawQuizData)
        ? lead.rawQuizData.map((value) => {
            if (Array.isArray(value)) return value.filter((v) => typeof v === "number" && Number.isFinite(v));
            if (typeof value === "number" && Number.isFinite(value)) return value;
            return -1;
          })
        : [];
      if (answers.length !== QUIZ_QUESTIONS.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Returning session not found." });
      }
      const topMatches = calculateMatches(answers)
        .slice(0, 5)
        .map(toReturningMatchSummary);

      return {
        token: lead.returningToken,
        leadId: lead.id,
        topMatches,
      };
    }),

  getResultsByPublicId: publicProcedure
    .input(z.object({ publicId: z.string().min(8).max(64) }))
    .query(async ({ input }) => {
      await ensureAffiliateWorkspaceSchema();
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available." });
      }

      const rows = await db
        .select({
          id: leads.id,
          publicId: leads.publicId,
          email: leads.email,
          results: leads.results,
          rawQuizData: leads.rawQuizData,
          topPeptideMatch: leads.topPeptideMatch,
          tier: leads.tier,
          consentGiven: leads.consentGiven,
          providerMatches: leads.providerMatches,
          experimentVariant: leads.experimentVariant,
        })
        .from(leads)
        .where(eq(leads.publicId, input.publicId))
        .limit(1);

      const lead = rows[0];
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Results not found." });
      }

      // Fetch email_delivered and suppressed via raw SQL (columns added at runtime)
      let emailDelivered = false;
      let suppressed = false;
      try {
        const [extraRows] = await db.execute(sql.raw(
          `SELECT email_delivered, suppressed FROM leads WHERE publicId = '${input.publicId}' LIMIT 1`
        ));
        const extra = (Array.isArray(extraRows) ? (Array.isArray(extraRows[0]) ? extraRows[0] : extraRows) : [])[0] as any;
        if (extra) {
          emailDelivered = extra.email_delivered === 1 || extra.email_delivered === true;
          suppressed = extra.suppressed === 1 || extra.suppressed === true;
        }
      } catch {
        // Columns may not exist yet — fall back to defaults
      }

      // If results column is populated, use it; otherwise recompute from rawQuizData
      let results = lead.results as ReturningMatchSummary[] | null;
      if (!results || results.length === 0) {
        const answers = Array.isArray(lead.rawQuizData)
          ? lead.rawQuizData.map((value: unknown) => {
              if (Array.isArray(value)) return value.filter((v) => typeof v === "number");
              if (typeof value === "number") return value;
              return -1;
            })
          : [];

        if (answers.length === QUIZ_QUESTIONS.length) {
          results = calculateMatches(answers).slice(0, 5).map(toReturningMatchSummary);
        }
      }

      // Load provider details for matched providers
      const providerMatchResults = lead.providerMatches as unknown as Array<{
        slug: string; displayName: string; fitScore: number; whyMatch: string[];
      }> | null;
      let providerDetails = null;
      if (providerMatchResults && providerMatchResults.length > 0) {
        const slugs = providerMatchResults.map((m) => m.slug);
        const pRows = await db
          .select()
          .from(providers)
          .where(inArray(providers.slug, slugs));
        providerDetails = pRows.map((p) => ({
          slug: p.slug,
          displayName: p.displayName,
          priceFromCents: p.priceFromCents,
          priceNote: p.priceNote,
          included: p.included,
          medsOffered: p.medsOffered,
          cashPayFriendly: p.cashPayFriendly,
          shipDaysEstimate: p.shipDaysEstimate,
          affiliateUrlTemplate: p.affiliateUrlTemplate,
          promoCode: p.promoCode,
          complianceNote: p.complianceNote,
        }));
      }

      // Build personalization data from rawQuizData
      const rawAnswers = Array.isArray(lead.rawQuizData)
        ? lead.rawQuizData.map((v: unknown) => (typeof v === "number" ? v : -1))
        : [];
      const goalIdx = rawAnswers[QUIZ_INDEX.PRIMARY_GOAL] ?? -1;
      const budgetIdx = rawAnswers[QUIZ_INDEX.BUDGET] ?? -1;
      const insuranceIdx = rawAnswers[QUIZ_INDEX.GLP1_INSURANCE] ?? -1;

      return {
        leadId: lead.id,
        publicId: lead.publicId,
        email: lead.email,
        hasRealEmail: !lead.email.startsWith("anonymous+"),
        consentGiven: lead.consentGiven,
        topPeptideMatch: lead.topPeptideMatch,
        tier: lead.tier,
        results: results ?? [],
        // False when we have neither stored results nor a rawQuizData vector we
        // can recompute (older quiz versions). Drives the retake view — never an error.
        renderable: (results ?? []).length > 0,
        providerMatches: providerMatchResults ?? [],
        providerDetails: providerDetails ?? [],
        experimentVariant: lead.experimentVariant ?? null,
        emailDelivered,
        leadQuizData: {
          primaryGoal: goalIdx >= 0 && goalIdx < PRIMARY_GOAL_OPTIONS.length
            ? PRIMARY_GOAL_OPTIONS[goalIdx]
            : null,
          budget: budgetIdx >= 0 && budgetIdx < BUDGET_OPTIONS.length
            ? BUDGET_OPTIONS[budgetIdx]
            : null,
          insurance: insuranceIdx === 0 ? "commercial"
            : insuranceIdx === 1 ? "medicare"
            : insuranceIdx === 2 ? "uninsured"
            : null,
        },
      };
    }),

  recoverLeadByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      await ensureAffiliateWorkspaceSchema();
      const db = await getDb();
      if (!db) return { found: false };
      const rows = await db
        .select({ publicId: leads.publicId })
        .from(leads)
        .where(eq(leads.email, input.email.trim().toLowerCase()))
        .orderBy(desc(leads.createdAt))
        .limit(1);
      if (!rows[0]) return { found: false };
      return { found: true, publicId: rows[0].publicId };
    }),

  submitQuiz: publicProcedure
    .input(
      z.object({
        email: z.string().email().optional().nullable(),
        consentGiven: z.boolean().optional().default(false),
        answers: z.array(z.union([z.number().int(), z.array(z.number().int())])),
        sessionId: z.string().min(8).max(64).optional().nullable(),
        meta: z
          .object({
            sourceUrl: z.string().url().optional().nullable(),
            leadEventId: z.string().min(8).max(128).optional().nullable(),
            completeRegistrationEventId: z.string().min(8).max(128).optional().nullable(),
            viewContentEventId: z.string().min(8).max(128).optional().nullable(),
            fbp: z.string().min(1).max(512).optional().nullable(),
            fbc: z.string().min(1).max(512).optional().nullable(),
          })
          .optional()
          .nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureAffiliateWorkspaceSchema();

      const { email, consentGiven, answers, sessionId, meta } = input;
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      const hasProvidedEmail = normalizedEmail.length > 0;

      if (hasProvidedEmail && !consentGiven) {
        throw new Error("Consent is required to submit.");
      }

      // Determine if answers match the old 22-question scoring format
      const isOldFormat = answers.length === QUIZ_QUESTIONS.length;
      const matches = isOldFormat ? calculateMatches(answers) : [];
      const topMatches = matches.slice(0, 5).map((m) => m.peptide.id);
      const topPeptideMatch = topMatches[0] ?? "semaglutide";
      const tier = isOldFormat ? determineTier(answers as number[]) : 3;

      const ageRange = "not-captured";
      const primaryGoal = typeof answers[0] === "number" ? String(answers[0]) : "multi";
      const budget = "not-captured";
      const isGlp1Lead = !isOldFormat || topPeptideMatch === "semaglutide";

      const ipAddress =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        (ctx.req.socket as { remoteAddress?: string })?.remoteAddress ||
        "unknown";

      const leadId = nanoid();
      const publicId = nanoid();
      const returningResults = matches.slice(0, 5).map(toReturningMatchSummary);
      const leadEmail = hasProvidedEmail
        ? normalizedEmail
        : `anonymous+${leadId}@peptidepilot.local`;
      const consentTimestamp = new Date();

      const db = await getDb();

      // Compute provider matches and experiment variant
      let providerMatchResults = null;
      let experimentVariant: string | null = null;
      if (db) {
        const activeProviders = await db
          .select()
          .from(providers)
          .where(eq(providers.active, true))
          .orderBy(providers.sortPriority);
        if (activeProviders.length > 0) {
          providerMatchResults = matchProviders(answers as number[], activeProviders);
          // A/B assignment: deterministic 50/50 split based on leadId hash
          const hash = leadId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
          experimentVariant = hash % 2 === 0 ? "control" : "verdict";
        }
      }

      if (db) {
        try {
          await insertLead({
            id: leadId,
            publicId,
            email: leadEmail,
            ageRange,
            primaryGoal,
            budget,
            topPeptideMatch,
            tier,
            consentGiven: hasProvidedEmail ? consentGiven : false,
            consentTimestamp,
            ipAddress,
            rawQuizData: answers,
            results: returningResults,
          });
        } catch (e) {
          console.error("[submitQuiz] insertLead failed:", e);
          throw e;
        }

        // Store providerMatches and experimentVariant
        if (providerMatchResults || experimentVariant) {
          const updateData: Record<string, unknown> = {};
          if (providerMatchResults) updateData.providerMatches = providerMatchResults;
          if (experimentVariant) updateData.experimentVariant = experimentVariant;
          try {
            await db.update(leads).set(updateData).where(eq(leads.id, leadId));
          } catch (e) {
            console.error("[submitQuiz] Failed to set provider/experiment data:", e);
          }
        }

        // Update sessionId separately
        if (sessionId) {
          try {
            await db.update(leads).set({ sessionId }).where(eq(leads.id, leadId));
          } catch (e) {
            console.error("[submitQuiz] Failed to set sessionId:", e);
          }
        }

        // Enqueue email drip sequence (email 0 instant, 1-6 on schedule)
        try {
          await enqueueEmailSequence(leadId, consentTimestamp);
        } catch (e) {
          console.error("[submitQuiz] Failed to enqueue emails:", e);
        }

        if (sessionId) {
          const existingSession = await db
            .select()
            .from(visitorSessions)
            .where(eq(visitorSessions.id, sessionId))
            .limit(1);

          if (existingSession[0]) {
            await db
              .update(visitorSessions)
              .set({
                leadId,
                lastSeenAt: new Date(),
              })
              .where(eq(visitorSessions.id, sessionId));
          } else {
            await db.insert(visitorSessions).values({
              id: sessionId,
              leadId,
              landingPath: "/results",
              lastPath: "/results",
            });
          }
        }
      }

      // Generate and store returning token separately (two-step to avoid schema mismatch)
      let returningToken: string | null = null;
      try {
        returningToken = await generateAndStoreReturningToken(leadId);
      } catch (error) {
        console.error("[ReturningUser] Failed to generate/store token:", error);
      }

      const webhookPayload = {
        leadId,
        email: leadEmail,
        returningToken,
        ageRange,
        primaryGoal,
        budget,
        topPeptideMatch,
        tier,
        topMatches,
        consentTimestamp: consentTimestamp.toISOString(),
        ipAddress,
      };

      if (hasProvidedEmail) {
        await sendMetaServerEvents(ctx.req, [
          {
            eventName: "CompleteRegistration",
            eventId: meta?.completeRegistrationEventId,
            email: leadEmail,
            clientIpAddress: ipAddress,
            clientUserAgent: ctx.req.headers["user-agent"] ?? null,
            sourceUrl: meta?.sourceUrl ?? `${ENV.siteUrl}/results`,
            fbp: meta?.fbp ?? null,
            fbc: meta?.fbc ?? null,
            customData: {
              content_name: "Peptide Quiz",
              status: "completed",
            },
          },
          {
            eventName: "Lead",
            eventId: meta?.leadEventId,
            email: leadEmail,
            clientIpAddress: ipAddress,
            clientUserAgent: ctx.req.headers["user-agent"] ?? null,
            sourceUrl: meta?.sourceUrl ?? `${ENV.siteUrl}/results`,
            fbp: meta?.fbp ?? null,
            fbc: meta?.fbc ?? null,
            customData: {
              content_name: matches[0]?.peptide.name ?? "Peptide Results",
              content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
              value: isGlp1Lead ? 50 : 10,
              currency: "USD",
            },
          },
          {
            eventName: "ViewContent",
            eventId: meta?.viewContentEventId,
            email: leadEmail,
            clientIpAddress: ipAddress,
            clientUserAgent: ctx.req.headers["user-agent"] ?? null,
            sourceUrl: meta?.sourceUrl ?? `${ENV.siteUrl}/results`,
            fbp: meta?.fbp ?? null,
            fbc: meta?.fbc ?? null,
            customData: {
              content_name: matches[0]?.peptide.name ?? "Peptide Results",
              content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
              content_ids: matches[0]?.peptide.id ? [matches[0].peptide.id] : undefined,
            },
          },
        ]);

        if (tier === 1) {
          await sendWebhook(TIER1_WEBHOOK, webhookPayload);
        } else if (tier === 2) {
          await sendWebhook(TIER2_WEBHOOK, webhookPayload);
        } else {
          await sendWebhook(TIER3_WEBHOOK, webhookPayload);
        }

        await notifyOwner({
          title: `New PeptidePilot Lead — Tier ${tier}`,
          content: `Email: ${leadEmail}\nTop Match: ${topPeptideMatch}\nBudget: ${budget}\nAge: ${ageRange}`,
        });
      }

      return {
        status: "success" as const,
        leadId,
        publicId,
        topMatches,
        returningToken,
        returningResults,
        providerMatches: providerMatchResults,
        experimentVariant,
      };
    }),

  attachEmail: publicProcedure
    .input(
      z.object({
        leadId: z.string().min(8).max(64),
        email: z.string().email(),
        consentGiven: z.boolean(),
        meta: z
          .object({
            leadEventId: z.string().min(8).max(128).optional().nullable(),
            completeRegistrationEventId: z.string().min(8).max(128).optional().nullable(),
            viewContentEventId: z.string().min(8).max(128).optional().nullable(),
            fbp: z.string().min(1).max(512).optional().nullable(),
            fbc: z.string().min(1).max(512).optional().nullable(),
          })
          .optional()
          .nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureAffiliateWorkspaceSchema();

      const { leadId, email, consentGiven, meta } = input;
      const normalizedEmail = email.trim().toLowerCase();

      if (!consentGiven) {
        throw new Error("Consent is required to attach an email.");
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available." });
      }

      const rows = await db
        .select({
          id: leads.id,
          email: leads.email,
          rawQuizData: leads.rawQuizData,
          tier: leads.tier,
          topPeptideMatch: leads.topPeptideMatch,
        })
        .from(leads)
        .where(eq(leads.id, leadId))
        .limit(1);

      const lead = rows[0];
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found." });
      }

      // Skip if email is already a real email (not anonymous)
      if (!lead.email.startsWith("anonymous+")) {
        return { status: "skipped" as const };
      }

      await db.update(leads).set({ email: normalizedEmail, consentGiven }).where(eq(leads.id, leadId));

      const answers = Array.isArray(lead.rawQuizData)
        ? lead.rawQuizData.map((value: unknown) => (typeof value === "number" ? value : -1))
        : [];

      const isOldFormat = answers.length === QUIZ_QUESTIONS.length;
      const matches = isOldFormat ? calculateMatches(answers) : [];
      const tier = lead.tier ?? 3;
      const topPeptideMatch = lead.topPeptideMatch ?? "unknown";
      const isGlp1Lead = topPeptideMatch === "semaglutide";
      const ipAddress =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        (ctx.req.socket as { remoteAddress?: string })?.remoteAddress ||
        "unknown";

      const ageRange = "not-captured";
      const primaryGoal = typeof answers[0] === "number" ? String(answers[0]) : "multi";
      const budget = "not-captured";

      const webhookPayload = {
        leadId,
        email: normalizedEmail,
        ageRange,
        primaryGoal,
        budget,
        topPeptideMatch,
        tier,
        ipAddress,
      };

      await sendMetaServerEvents(ctx.req, [
        {
          eventName: "CompleteRegistration",
          eventId: meta?.completeRegistrationEventId,
          email: normalizedEmail,
          clientIpAddress: ipAddress,
          clientUserAgent: ctx.req.headers["user-agent"] ?? null,
          sourceUrl: `${ENV.siteUrl}/results`,
          fbp: meta?.fbp ?? null,
          fbc: meta?.fbc ?? null,
          customData: {
            content_name: "Peptide Quiz",
            status: "completed",
          },
        },
        {
          eventName: "Lead",
          eventId: meta?.leadEventId,
          email: normalizedEmail,
          clientIpAddress: ipAddress,
          clientUserAgent: ctx.req.headers["user-agent"] ?? null,
          sourceUrl: `${ENV.siteUrl}/results`,
          fbp: meta?.fbp ?? null,
          fbc: meta?.fbc ?? null,
          customData: {
            content_name: matches[0]?.peptide.name ?? "Peptide Results",
            content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
            value: isGlp1Lead ? 50 : 10,
            currency: "USD",
          },
        },
        {
          eventName: "ViewContent",
          eventId: meta?.viewContentEventId,
          email: normalizedEmail,
          clientIpAddress: ipAddress,
          clientUserAgent: ctx.req.headers["user-agent"] ?? null,
          sourceUrl: `${ENV.siteUrl}/results`,
          fbp: meta?.fbp ?? null,
          fbc: meta?.fbc ?? null,
          customData: {
            content_name: matches[0]?.peptide.name ?? "Peptide Results",
            content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
            content_ids: matches[0]?.peptide.id ? [matches[0].peptide.id] : undefined,
          },
        },
      ]);

      if (tier === 1) {
        await sendWebhook(TIER1_WEBHOOK, webhookPayload);
      } else if (tier === 2) {
        await sendWebhook(TIER2_WEBHOOK, webhookPayload);
      } else {
        await sendWebhook(TIER3_WEBHOOK, webhookPayload);
      }

      await notifyOwner({
        title: `New PeptidePilot Lead — Tier ${tier}`,
        content: `Email: ${normalizedEmail}\nTop Match: ${topPeptideMatch}\nBudget: ${budget}\nAge: ${ageRange}`,
      });

      return { status: "success" as const };
    }),

  submitOffRampEmail: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureAffiliateWorkspaceSchema();

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available." });
      }

      const leadId = nanoid();
      const ipAddress =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        (ctx.req.socket as { remoteAddress?: string })?.remoteAddress ||
        "unknown";

      await db.execute(sql`
        insert into leads (
          id, email, ageRange, primaryGoal, budget, topPeptideMatch, tier,
          consentGiven, consentTimestamp, ipAddress, rawQuizData, source
        ) values (
          ${leadId},
          ${input.email.trim().toLowerCase()},
          'not-captured', 'offramp', 'not-captured', 'none', 2,
          true, ${new Date()},
          ${ipAddress},
          '[]',
          'glp1_offramp'
        )
      `);

      return { status: "success" as const, leadId };
    }),

  trackAffiliateClick: publicProcedure
    .input(
      z.object({
        leadId: z.string(),
        peptideId: z.string(),
        vendor: z.string(),
        experimentId: z.number().optional(),
        variantId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureAffiliateWorkspaceSchema();
      const db = await getDb();
      if (db) {
        const values: Record<string, unknown> = {
          leadId: input.leadId,
          peptideId: input.peptideId,
          vendor: input.vendor,
        };
        if (input.experimentId !== undefined) values.experimentId = input.experimentId;
        if (input.variantId !== undefined) values.variantId = input.variantId;
        await db.insert(affiliateClicks).values(values as any);
      }

      // Fire-and-forget Telegram notification — never blocks the response
      (async () => {
        try {
          // Look up the lead's email for a richer alert
          let email = "unknown";
          if (db) {
            const rows = await db
              .select({ email: leads.email })
              .from(leads)
              .where(eq(leads.id, input.leadId))
              .limit(1);
            if (rows[0]?.email) email = rows[0].email;
          }

          const now = new Date().toLocaleString("en-US", {
            timeZone: "America/New_York",
            dateStyle: "medium",
            timeStyle: "short",
          });

          const message = [
            `\u{1F517} <b>AFFILIATE CLICK</b>`,
            ``,
            `\u{1F48A} <b>${input.peptideId}</b> — ${input.vendor}`,
            `\u{1F464} ${email}`,
            `\u{1F4CD} Results page`,
            `\u{1F552} ${now} ET`,
          ].join("\n");

          await sendTelegramMessage(message);
        } catch (err) {
          console.error("[Telegram] Affiliate click notification failed:", err);
        }
      })();

      return { status: "ok" as const };
    }),

  listLeadsWithoutResultsView: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db.execute(sql`
      SELECT
        l.id,
        l.publicId,
        l.email,
        l.createdAt,
        l.ipAddress,
        l.source,
        l.rawQuizData,
        vs.userAgent,
        (SELECT pv.createdAt FROM page_visits pv WHERE pv.sessionId = l.sessionId AND pv.path LIKE concat('%', '/results', '%') ORDER BY pv.createdAt DESC LIMIT 1) AS lastResultsViewAt,
        (SELECT pv.path FROM page_visits pv WHERE pv.sessionId = l.sessionId ORDER BY pv.createdAt DESC LIMIT 1) AS lastPath
      FROM leads l
      LEFT JOIN visitor_sessions vs ON vs.id = l.sessionId
      WHERE l.email NOT LIKE 'anonymous+%'
        AND l.createdAt > DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY l.createdAt DESC
      LIMIT 200
    `);

    return rows.map((row: any) => ({
      leadId: row.id,
      publicId: row.publicId,
      email: row.email,
      createdAt: row.createdAt,
      ipAddress: row.ipAddress,
      source: row.source,
      userAgent: row.userAgent ?? null,
      lastResultsViewAt: row.lastResultsViewAt ?? null,
      lastPath: row.lastPath ?? null,
      sawResults: row.lastResultsViewAt !== null,
      resultsUrl: `/results/${row.publicId}`,
    }));
  }),
});
