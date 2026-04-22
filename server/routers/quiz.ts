import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { ensureAffiliateWorkspaceSchema, getDb } from "../db";
import { leads, affiliateClicks, visitorSessions } from "../../drizzle/schema";
import {
  AGE_RANGE_OPTIONS,
  BUDGET_OPTIONS,
  calculateMatches,
  determineTier,
  PRIMARY_GOAL_OPTIONS,
  QUIZ_INDEX,
  QUIZ_QUESTIONS,
  toReturningMatchSummary,
} from "../../shared/scoring";
import { nanoid } from "nanoid";
import { notifyOwner } from "../_core/notification";
import { eq, sql } from "drizzle-orm";
import { sendMetaServerEvents } from "../_core/meta";
import { ENV } from "../_core/env";
import { randomBytes } from "crypto";

const TIER1_WEBHOOK = process.env.WEBHOOK_TIER1_URL;
const TIER2_WEBHOOK = process.env.WEBHOOK_TIER2_URL;
const TIER3_WEBHOOK = process.env.WEBHOOK_TIER3_URL;

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
  values: Pick<
    typeof leads.$inferInsert,
    | "id"
    | "email"
    | "sessionId"
    | "returningToken"
    | "tokenExpiresAt"
    | "ageRange"
    | "primaryGoal"
    | "budget"
    | "topPeptideMatch"
    | "tier"
    | "consentGiven"
    | "consentTimestamp"
    | "ipAddress"
    | "rawQuizData"
  >
) {
  const db = await getDb();
  if (!db) return false;

  const result = await db.execute(sql.raw("SHOW COLUMNS FROM leads"));
  const rows = Array.isArray(result) ? result : ((result as any).rows ?? []);
  const availableColumns = new Set(
    rows
      .map((row: Record<string, unknown>) => row.Field)
      .filter((value: unknown): value is string => typeof value === "string"),
  );

  const insertValues: Record<string, unknown> = {
    id: values.id,
    email: values.email,
    ageRange: values.ageRange,
    primaryGoal: values.primaryGoal,
    budget: values.budget,
    topPeptideMatch: values.topPeptideMatch,
    tier: values.tier,
    consentGiven: values.consentGiven,
    consentTimestamp: values.consentTimestamp,
    ipAddress: values.ipAddress,
    rawQuizData: values.rawQuizData,
  };

  if (availableColumns.has("sessionId")) {
    insertValues.sessionId = values.sessionId ?? null;
  }

  if (availableColumns.has("returningToken")) {
    insertValues.returningToken = values.returningToken ?? null;
  }

  if (availableColumns.has("tokenExpiresAt")) {
    insertValues.tokenExpiresAt = values.tokenExpiresAt ?? null;
  }

  await db.insert(leads).values(insertValues as typeof leads.$inferInsert);
  return availableColumns.has("returningToken") && availableColumns.has("tokenExpiresAt");
}

function createReturningToken() {
  return randomBytes(32).toString("hex");
}

function createTokenExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 180);
  return expiresAt;
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
        throw new Error("Database not available.");
      }

      const rows = await db
        .select()
        .from(leads)
        .where(eq(leads.returningToken, input.token))
        .limit(1);

      const lead = rows[0];
      if (!lead) {
        throw new Error("Returning results not found.");
      }

      if (lead.tokenExpiresAt && lead.tokenExpiresAt.getTime() < Date.now()) {
        throw new Error("Returning results expired.");
      }

      const answers = Array.isArray(lead.rawQuizData)
        ? lead.rawQuizData.map((value) =>
            typeof value === "number" && Number.isFinite(value) ? value : -1,
          )
        : [];
      const topMatches = calculateMatches(answers)
        .slice(0, 5)
        .map(toReturningMatchSummary);

      return {
        token: lead.returningToken,
        leadId: lead.id,
        createdAt: lead.createdAt,
        topMatches,
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
      const { email, consentGiven, answers, sessionId, meta } = input;

      if (!consentGiven) {
        throw new Error("Consent is required to submit.");
      }

      await ensureAffiliateWorkspaceSchema();

      const matches = calculateMatches(answers);
      const topMatches = matches.slice(0, 5).map((m) => m.peptide.id);
      const topPeptideMatch = topMatches[0] ?? "unknown";
      const tier = determineTier(answers);

      const ageRange = AGE_RANGE_OPTIONS[answers[QUIZ_INDEX.AGE_RANGE] ?? -1] ?? "unknown";
      const primaryGoal =
        PRIMARY_GOAL_OPTIONS[answers[QUIZ_INDEX.PRIMARY_GOAL] ?? -1] ?? "unknown";
      const budget = BUDGET_OPTIONS[answers[QUIZ_INDEX.BUDGET] ?? -1] ?? "unknown";
      const isGlp1Lead = topPeptideMatch === "semaglutide";

      const ipAddress =
        (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        (ctx.req.socket as { remoteAddress?: string })?.remoteAddress ||
        "unknown";

      const leadId = nanoid();
      const consentTimestamp = new Date();
      const returningToken = createReturningToken();
      const tokenExpiresAt = createTokenExpiry();

      const db = await getDb();
      if (db) {
        await insertLead({
          id: leadId,
          email,
          sessionId: sessionId ?? undefined,
          returningToken,
          tokenExpiresAt,
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

      const webhookPayload = {
        leadId,
        email,
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

      if (tier === 1) {
        await sendWebhook(TIER1_WEBHOOK, webhookPayload);
      } else if (tier === 2) {
        await sendWebhook(TIER2_WEBHOOK, webhookPayload);
      } else {
        await sendWebhook(TIER3_WEBHOOK, webhookPayload);
      }

      await notifyOwner({
        title: `New PeptidePilot Lead — Tier ${tier}`,
        content: `Email: ${email}\nTop Match: ${topPeptideMatch}\nBudget: ${budget}\nAge: ${ageRange}`,
      });

      return {
        status: "success" as const,
        leadId,
        topMatches,
        returningToken,
        returningResults: matches.slice(0, 5).map(toReturningMatchSummary),
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
