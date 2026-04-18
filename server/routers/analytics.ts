import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { affiliateClicks, clickEvents, pageVisits, leads, visitorSessions } from "../../drizzle/schema";
import { QUIZ_QUESTIONS } from "../../shared/scoring";
import { getDb } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const pageViewInput = z.object({
  sessionId: z.string().min(8).max(64),
  path: z.string().min(1).max(512),
  durationMs: z.number().int().min(0).max(1000 * 60 * 60),
  referrer: z.string().max(1024).optional().nullable(),
});

const clickEventInput = z.object({
  sessionId: z.string().min(8).max(64),
  path: z.string().min(1).max(512),
  label: z.string().min(1).max(255),
  targetHref: z.string().max(1024).optional().nullable(),
  eventType: z.string().min(1).max(64),
});

const sessionStartInput = z.object({
  sessionId: z.string().min(8).max(64),
  landingPath: z.string().min(1).max(512),
  referrer: z.string().max(1024).optional().nullable(),
  utmSource: z.string().max(255).optional().nullable(),
  utmMedium: z.string().max(255).optional().nullable(),
  utmCampaign: z.string().max(255).optional().nullable(),
  utmContent: z.string().max(255).optional().nullable(),
  utmTerm: z.string().max(255).optional().nullable(),
  userAgent: z.string().max(5000).optional().nullable(),
});

type PageViewPayload = z.infer<typeof pageViewInput>;
type SessionStartPayload = z.infer<typeof sessionStartInput>;
type ClickEventPayload = z.infer<typeof clickEventInput>;

function normalizeReferrer(referrer?: string | null) {
  if (!referrer) return null;
  const trimmed = referrer.trim();
  return trimmed.length ? trimmed : null;
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export async function startVisitorSession(input: SessionStartPayload) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.id, input.sessionId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(visitorSessions)
      .set({
        lastSeenAt: new Date(),
        lastPath: normalizePath(input.landingPath),
      })
      .where(eq(visitorSessions.id, input.sessionId));
    return;
  }

  await db.insert(visitorSessions).values({
    id: input.sessionId,
    landingPath: normalizePath(input.landingPath),
    lastPath: normalizePath(input.landingPath),
    referrer: normalizeReferrer(input.referrer),
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    utmContent: input.utmContent ?? null,
    utmTerm: input.utmTerm ?? null,
    userAgent: input.userAgent ?? null,
  });
}

export async function recordPageView(input: PageViewPayload) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.id, input.sessionId))
    .limit(1);

  if (!existing[0]) {
    await db.insert(visitorSessions).values({
      id: input.sessionId,
      landingPath: normalizePath(input.path),
      lastPath: normalizePath(input.path),
      referrer: normalizeReferrer(input.referrer),
    });
  }

  await db
    .insert(pageVisits)
    .values({
      sessionId: input.sessionId,
      path: normalizePath(input.path),
      durationMs: input.durationMs,
      referrer: normalizeReferrer(input.referrer),
    });

  await db
    .update(visitorSessions)
    .set({
      lastSeenAt: new Date(),
      lastPath: normalizePath(input.path),
      pageViewCount: sql`${visitorSessions.pageViewCount} + 1`,
      totalDurationMs: sql`${visitorSessions.totalDurationMs} + ${input.durationMs}`,
    })
    .where(eq(visitorSessions.id, input.sessionId));
}

export async function recordClickEvent(input: ClickEventPayload) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(visitorSessions)
    .where(eq(visitorSessions.id, input.sessionId))
    .limit(1);

  const leadId = existing[0]?.leadId ?? null;

  if (!existing[0]) {
    await db.insert(visitorSessions).values({
      id: input.sessionId,
      landingPath: normalizePath(input.path),
      lastPath: normalizePath(input.path),
    });
  }

  await db.insert(clickEvents).values({
    sessionId: input.sessionId,
    leadId,
    path: normalizePath(input.path),
    label: input.label,
    targetHref: input.targetHref ?? null,
    eventType: input.eventType,
  });

  await db
    .update(visitorSessions)
    .set({
      lastSeenAt: new Date(),
      lastPath: normalizePath(input.path),
    })
    .where(eq(visitorSessions.id, input.sessionId));
}

function decodeQuizAnswers(rawQuizData: unknown) {
  if (!Array.isArray(rawQuizData)) return [];

  return QUIZ_QUESTIONS.map((question, index) => {
    const answerIndex = typeof rawQuizData[index] === "number" ? rawQuizData[index] : null;
    return {
      section: question.section,
      question: question.question,
      answerIndex,
      answer:
        answerIndex != null && question.options[answerIndex]
          ? question.options[answerIndex]
          : "No answer recorded",
    };
  });
}

export const analyticsRouter = router({
  startSession: publicProcedure.input(sessionStartInput).mutation(async ({ input }) => {
    await startVisitorSession(input);
    return { status: "ok" as const };
  }),

  trackPageView: publicProcedure.input(pageViewInput).mutation(async ({ input }) => {
    await recordPageView(input);
    return { status: "ok" as const };
  }),

  trackClick: publicProcedure.input(clickEventInput).mutation(async ({ input }) => {
    await recordClickEvent(input);
    return { status: "ok" as const };
  }),

  summary: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        totalSessions: 0,
        totalLeads: 0,
        quizCompletionRate: 0,
        avgEngagementSeconds: 0,
        topReferrers: [],
        totalClicks: 0,
      };
    }

    const [sessionStats] = await db
      .select({
        totalSessions: sql<number>`count(*)`,
        totalDurationMs: sql<number>`coalesce(sum(${visitorSessions.totalDurationMs}), 0)`,
        completedSessions: sql<number>`count(case when ${visitorSessions.leadId} is not null then 1 end)`,
      })
      .from(visitorSessions);

    const [leadStats] = await db
      .select({
        totalLeads: sql<number>`count(*)`,
      })
      .from(leads);

    const [clickStats] = await db
      .select({
        totalClicks: sql<number>`count(*)`,
      })
      .from(clickEvents);

    const referrerRows = await db
      .select({
        referrer: visitorSessions.referrer,
        count: sql<number>`count(*)`,
      })
      .from(visitorSessions)
      .where(sql`${visitorSessions.referrer} is not null and ${visitorSessions.referrer} <> ''`)
      .groupBy(visitorSessions.referrer)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    const totalSessions = Number(sessionStats?.totalSessions ?? 0);
    const totalDurationMs = Number(sessionStats?.totalDurationMs ?? 0);
    const completedSessions = Number(sessionStats?.completedSessions ?? 0);
    const totalLeads = Number(leadStats?.totalLeads ?? 0);

    return {
      totalSessions,
      totalLeads,
      totalClicks: Number(clickStats?.totalClicks ?? 0),
      quizCompletionRate: totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0,
      avgEngagementSeconds: totalSessions ? Math.round(totalDurationMs / totalSessions / 1000) : 0,
      topReferrers: referrerRows.map((row) => ({
        referrer: row.referrer,
        count: Number(row.count ?? 0),
      })),
    };
  }),

  recentSessions: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const sessions = await db
      .select()
      .from(visitorSessions)
      .orderBy(desc(visitorSessions.lastSeenAt))
      .limit(50);

    const leadIds = sessions.map((session) => session.leadId).filter((value): value is string => Boolean(value));
    const sessionIds = sessions.map((session) => session.id);

    const sessionLeadRows = leadIds.length
      ? await db.select().from(leads).where(inArray(leads.id, leadIds))
      : [];
    const visitRows = sessionIds.length
      ? await db
          .select()
          .from(pageVisits)
          .where(inArray(pageVisits.sessionId, sessionIds))
          .orderBy(desc(pageVisits.createdAt))
      : [];
    const clickRows = sessionIds.length
      ? await db
          .select()
          .from(clickEvents)
          .where(inArray(clickEvents.sessionId, sessionIds))
          .orderBy(desc(clickEvents.createdAt))
      : [];
    const affiliateRows = leadIds.length
      ? await db
          .select()
          .from(affiliateClicks)
          .where(inArray(affiliateClicks.leadId, leadIds))
          .orderBy(desc(affiliateClicks.clickedAt))
      : [];

    const leadById = new Map(sessionLeadRows.map((lead) => [lead.id, lead]));
    const visitsBySession = new Map<string, typeof visitRows>();
    const clicksBySession = new Map<string, typeof clickRows>();
    const affiliateByLead = new Map<string, typeof affiliateRows>();

    visitRows.forEach((visit) => {
      const current = visitsBySession.get(visit.sessionId) ?? [];
      current.push(visit);
      visitsBySession.set(visit.sessionId, current);
    });
    clickRows.forEach((event) => {
      const current = clicksBySession.get(event.sessionId) ?? [];
      current.push(event);
      clicksBySession.set(event.sessionId, current);
    });
    affiliateRows.forEach((event) => {
      const current = affiliateByLead.get(event.leadId) ?? [];
      current.push(event);
      affiliateByLead.set(event.leadId, current);
    });

    return sessions.map((session) => {
      const lead = session.leadId ? leadById.get(session.leadId) : null;

      return {
        ...session,
        lead: lead
          ? {
              ...lead,
              decodedAnswers: decodeQuizAnswers(lead.rawQuizData),
            }
          : null,
        visits: (visitsBySession.get(session.id) ?? []).slice(0, 10),
        clicks: (clicksBySession.get(session.id) ?? []).slice(0, 20),
        affiliateClicks: lead ? (affiliateByLead.get(lead.id) ?? []).slice(0, 20) : [],
      };
    });
  }),
});
