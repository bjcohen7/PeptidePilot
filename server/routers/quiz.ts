import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { ensureAffiliateWorkspaceSchema, ensureReturningUserLeadSchema, getDb } from "../db";
import { leads, affiliateClicks, visitorSessions } from "../../drizzle/schema";
import {
  AGE_RANGE_OPTIONS,
  BUDGET_OPTIONS,
  calculateMatches,
  determineTier,
  PRIMARY_GOAL_OPTIONS,
  QUIZ_INDEX,
  QUIZ_QUESTIONS,
} from "../../shared/scoring";
import { nanoid } from "nanoid";
import { notifyOwner } from "../_core/notification";
import { eq, sql } from "drizzle-orm";
import { sendMetaServerEvents } from "../_core/meta";
import { ENV } from "../_core/env";

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
  await db.execute(sql`
    insert into leads (
      id,
      email,
      ageRange,
      primaryGoal,
      budget,
      topPeptideMatch,
      tier,
      consentGiven,
      consentTimestamp,
      ipAddress,
      rawQuizData
    ) values (
      ${values.id},
      ${values.email},
      ${values.ageRange},
      ${values.primaryGoal},
      ${values.budget},
      ${values.topPeptideMatch},
      ${values.tier},
      ${values.consentGiven},
      ${values.consentTimestamp},
      ${values.ipAddress},
      ${JSON.stringify(values.rawQuizData)}
    )
  `);
  return true;
}

function decodeLeadAnswers(rawQuizData: unknown) {
  if (!Array.isArray(rawQuizData)) return [];
  return rawQuizData.map((value) => (typeof value === "number" ? value : -1));
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

function isMissingReturningSchemaError(error: unknown) {
  let current = error as { code?: string; sqlMessage?: string; message?: string; cause?: unknown } | undefined;

  while (current && typeof current === "object") {
    const message = [current.sqlMessage, current.message].filter(Boolean).join(" ");
    if (current.code === "ER_BAD_FIELD_ERROR" && message.includes("returningToken")) {
      return true;
    }

    current = current.cause as
      | { code?: string; sqlMessage?: string; message?: string; cause?: unknown }
      | undefined;
  }

  return false;
}

async function generateAndStoreReturningToken(leadId: string) {
  const db = await getDb();
  if (!db) return null;

  const returningToken = randomUUID();
  const tokenExpiresAt = new Date(Date.now() + RETURNING_TOKEN_TTL_MS);

  const persistToken = async () => {
    await db
      .update(leads)
      .set({
        returningToken,
        tokenExpiresAt,
      })
      .where(eq(leads.id, leadId));
  };

  await ensureReturningUserLeadSchema();

  try {
    await persistToken();
  } catch (error) {
    if (!isMissingReturningSchemaError(error)) {
      throw error;
    }

    await ensureReturningUserLeadSchema({ force: true });
    await persistToken();
  }

  return returningToken;
}

export const quizRouter = router({
  getReturningResultsByToken: publicProcedure
    .input(returningLookupInput)
    .query(async ({ input }) => {
      await ensureAffiliateWorkspaceSchema();
      await ensureReturningUserLeadSchema();

      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available." });
      }

      const lead = await db
        .select({
          id: leads.id,
          returningToken: leads.returningToken,
          tokenExpiresAt: leads.tokenExpiresAt,
          rawQuizData: leads.rawQuizData,
        })
        .from(leads)
        .where(eq(leads.returningToken, input.token))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!lead || !lead.returningToken) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Returning session not found." });
      }

      if (lead.tokenExpiresAt && lead.tokenExpiresAt.getTime() < Date.now()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Returning session not found." });
      }

      return {
        token: lead.returningToken,
        topMatches: buildReturningTopMatches(lead.rawQuizData),
      };
    }),

  submitQuiz: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        consentGiven: z.boolean(),
        answers: z.array(z.number().int().min(-1)).length(QUIZ_QUESTIONS.length),
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

      if (!consentGiven) {
        throw new Error("Consent is required to submit.");
      }

      // Run scoring algorithm
      const matches = calculateMatches(answers);
      const topMatches = matches.slice(0, 5).map((m) => m.peptide.id);
      const topPeptideMatch = topMatches[0] ?? "unknown";

      // Determine tier
      const tier = determineTier(answers);

      const ageRange = AGE_RANGE_OPTIONS[answers[QUIZ_INDEX.AGE_RANGE] ?? -1] ?? "unknown";
      const primaryGoal =
        PRIMARY_GOAL_OPTIONS[answers[QUIZ_INDEX.PRIMARY_GOAL] ?? -1] ?? "unknown";
      const budget = BUDGET_OPTIONS[answers[QUIZ_INDEX.BUDGET] ?? -1] ?? "unknown";
      const isGlp1Lead = topPeptideMatch === "semaglutide";

      // Get IP address
      const ipAddress =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        (ctx.req.socket as { remoteAddress?: string })?.remoteAddress ||
        "unknown";

      const leadId = nanoid();
      const consentTimestamp = new Date();

      // Store lead in database
      const db = await getDb();
      if (db) {
        await insertLead({
          id: leadId,
          email,
          ageRange,
          primaryGoal,
          budget,
          topPeptideMatch,
          tier,
          consentGiven,
          consentTimestamp,
          ipAddress,
          rawQuizData: answers,
        });

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

      let returningToken: string | null = null;
      try {
        returningToken = await generateAndStoreReturningToken(leadId);
      } catch (error) {
        console.error("[ReturningUser] Failed to generate/store token:", error);
      }

      // Build webhook payload
      const webhookPayload = {
        leadId,
        email,
        ageRange,
        primaryGoal,
        budget,
        topPeptideMatch,
        tier,
        topMatches,
        consentTimestamp: consentTimestamp.toISOString(),
        ipAddress,
      };

      await sendMetaServerEvents(ctx.req, [
        {
          eventName: "CompleteRegistration",
          eventId: meta?.completeRegistrationEventId,
          email,
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
          email,
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
          email,
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

      // Route to appropriate webhook based on tier
      if (tier === 1) {
        await sendWebhook(TIER1_WEBHOOK, webhookPayload);
      } else if (tier === 2) {
        await sendWebhook(TIER2_WEBHOOK, webhookPayload);
      } else {
        await sendWebhook(TIER3_WEBHOOK, webhookPayload);
      }

      // Notify owner of new lead
      await notifyOwner({
        title: `New PeptidePilot Lead — Tier ${tier}`,
        content: `Email: ${email}\nTop Match: ${topPeptideMatch}\nBudget: ${budget}\nAge: ${ageRange}`,
      });

      return {
        status: "success" as const,
        leadId,
        topMatches,
        returningToken,
      };
    }),

  trackAffiliateClick: publicProcedure
    .input(
      z.object({
        leadId: z.string(),
        peptideId: z.string(),
        vendor: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (db) {
        await db.insert(affiliateClicks).values({
          leadId: input.leadId,
          peptideId: input.peptideId,
          vendor: input.vendor,
        });
      }
      return { status: "ok" as const };
    }),
});
