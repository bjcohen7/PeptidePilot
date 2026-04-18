import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { leads, affiliateClicks, visitorSessions } from "../../drizzle/schema";
import { calculateMatches, determineTier } from "../../shared/scoring";
import { nanoid } from "nanoid";
import { notifyOwner } from "../_core/notification";
import { eq } from "drizzle-orm";
import { sendMetaServerEvents } from "../_core/meta";
import { ENV } from "../_core/env";

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

async function insertLeadWithCompatibilityFallback(
  values: typeof leads.$inferInsert
) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(leads).values(values);
    return true;
  } catch (error) {
    if (!values.sessionId) {
      throw error;
    }

    console.warn("[Quiz] Lead insert with sessionId failed, retrying without sessionId:", error);

    const { sessionId: _sessionId, ...legacyValues } = values;
    await db.insert(leads).values(legacyValues);
    return true;
  }
}

export const quizRouter = router({
  submitQuiz: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        consentGiven: z.boolean(),
        answers: z.array(z.number().int().min(0)).length(20),
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

      // Run scoring algorithm
      const matches = calculateMatches(answers);
      const topMatches = matches.slice(0, 5).map((m) => m.peptide.id);
      const topPeptideMatch = topMatches[0] ?? "unknown";

      // Determine tier
      const tier = determineTier(answers);

      // Q6 (index 5): age range
      const AGE_RANGES = ["18–25", "26–35", "36–45", "46–55", "56–65", "65+"];
      const ageRange = AGE_RANGES[answers[5]] ?? "unknown";

      // Q1 (index 0): primary goal
      const PRIMARY_GOALS = [
        "Build muscle and increase strength",
        "Lose body fat and improve body composition",
        "Boost daily energy and mental clarity",
        "Slow aging and optimize longevity",
        "Improve sleep quality and depth",
        "Heal an injury or chronic pain",
        "Enhance libido and sexual vitality",
        "Speed up recovery and reduce soreness",
      ];
      const primaryGoal = PRIMARY_GOALS[answers[0]] ?? "unknown";

      // Q18 (index 17): budget
      const BUDGETS = [
        "Under $50/month",
        "$50–$100/month",
        "$100–$200/month",
        "$200–$500/month",
        "$500+/month",
      ];
      const budget = BUDGETS[answers[17]] ?? "unknown";

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
        await insertLeadWithCompatibilityFallback({
          id: leadId,
          email,
          sessionId: sessionId ?? null,
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
            content_category: "quiz-results",
            value: budget,
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
            content_category: "quiz-results",
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
