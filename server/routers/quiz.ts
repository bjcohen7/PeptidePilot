import { TRPCError } from "@trpc/server";
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
import { sendTelegramMessage } from "../_core/telegram";

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
      await ensureAffiliateWorkspaceSchema();

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

        // Update sessionId separately
        if (sessionId) {
          try {
            await db.update(leads).set({ sessionId }).where(eq(leads.id, leadId));
          } catch (e) {
            console.error("[submitQuiz] Failed to set sessionId:", e);
          }
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
});
