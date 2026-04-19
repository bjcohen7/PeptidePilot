import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { affiliateClicks, clickEvents, pageVisits, leads, visitorSessions } from "../../drizzle/schema";
import { QUIZ_QUESTIONS, calculateAspectScores } from "../../shared/scoring";
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

function buildDimensionScores(rawQuizData: unknown) {
  if (!Array.isArray(rawQuizData)) return [];

  const numericAnswers = rawQuizData.map((value) => (typeof value === "number" ? value : 0));
  const aspects = calculateAspectScores(numericAnswers);

  const groups = [
    { label: "Physical", max: 24, score: aspects.muscle + aspects.recovery + aspects.endurance + aspects.healing + aspects.injury + aspects.joints },
    { label: "Metabolic", max: 24, score: aspects.fatloss + aspects.metabolic + aspects.appetite + aspects.energy },
    { label: "Recovery", max: 24, score: aspects.recovery + aspects.inflammation + aspects.healing + aspects.sleep },
    { label: "Cognitive", max: 24, score: aspects.cognitive + aspects.focus + aspects.neuroprotection + aspects.mood + aspects.anxiety },
    { label: "Hormonal", max: 24, score: aspects.hormone + aspects.libido + aspects.confidence + aspects.energy },
    { label: "Appearance", max: 24, score: aspects.skin + aspects.hair + aspects.collagen + aspects.antiaging + aspects.longevity },
  ];

  return groups.map((group) => {
    const normalized = Math.min(group.max, Math.max(0, Math.round(group.score)));
    const severity =
      normalized >= 16 ? "High" : normalized >= 10 ? "Medium" : "Low";

    return {
      dimension: group.label,
      score: normalized,
      max: group.max,
      severity,
      pct: Math.round((normalized / group.max) * 100),
    };
  });
}

async function buildSessionPayloads(sessionRows: Array<typeof visitorSessions.$inferSelect>) {
  const db = await getDb();
  if (!db || !sessionRows.length) return [];

  const sessionIds = sessionRows.map((session) => session.id);
  const leadIds = sessionRows.map((session) => session.leadId).filter((value): value is string => Boolean(value));

  const sessionLeadRows = leadIds.length
    ? await db.select().from(leads).where(inArray(leads.id, leadIds))
    : [];
  let fallbackLeadRows: Array<typeof leads.$inferSelect> = [];
  if (sessionIds.length) {
    try {
      fallbackLeadRows = await db.select().from(leads).where(inArray(leads.sessionId, sessionIds));
    } catch (error) {
      console.warn("[Analytics] Falling back without leads.sessionId linkage:", error);
      fallbackLeadRows = [];
    }
  }
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
  const leadBySessionId = new Map(
    fallbackLeadRows
      .filter((lead) => Boolean(lead.sessionId))
      .map((lead) => [lead.sessionId as string, lead]),
  );
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

  return sessionRows.map((session) => {
    const lead =
      (session.leadId ? leadById.get(session.leadId) : null) ??
      leadBySessionId.get(session.id) ??
      null;
    const decodedAnswers = lead ? decodeQuizAnswers(lead.rawQuizData) : [];
    const dimensionScores = lead ? buildDimensionScores(lead.rawQuizData) : [];

    return {
      ...session,
      lead: lead
        ? {
            ...lead,
            decodedAnswers,
            dimensionScores,
          }
        : null,
      visits: visitsBySession.get(session.id) ?? [],
      clicks: clicksBySession.get(session.id) ?? [],
      affiliateClicks: lead ? affiliateByLead.get(lead.id) ?? [] : [],
    };
  });
}

async function buildBasicSessionPayloads(sessionRows: Array<typeof visitorSessions.$inferSelect>) {
  const db = await getDb();
  if (!db || !sessionRows.length) return [];

  const leadIds = sessionRows
    .map((session) => session.leadId)
    .filter((value): value is string => Boolean(value));
  const sessionLeadRows = leadIds.length
    ? await db.select().from(leads).where(inArray(leads.id, leadIds))
    : [];
  const leadById = new Map(sessionLeadRows.map((lead) => [lead.id, lead]));

  return sessionRows.map((session) => {
    const lead = session.leadId ? leadById.get(session.leadId) ?? null : null;
    return {
      ...session,
      lead: lead
        ? {
            ...lead,
            decodedAnswers: decodeQuizAnswers(lead.rawQuizData),
            dimensionScores: buildDimensionScores(lead.rawQuizData),
          }
        : null,
      clickCount: 0,
      visits: [],
      clicks: [],
      affiliateClicks: [],
    };
  });
}

async function buildSessionTableRows(sessionRows: Array<typeof visitorSessions.$inferSelect>) {
  const db = await getDb();
  if (!db || !sessionRows.length) return [];

  const sessionIds = sessionRows.map((session) => session.id);
  const leadIds = sessionRows
    .map((session) => session.leadId)
    .filter((value): value is string => Boolean(value));

  const sessionLeadRows = leadIds.length
    ? await db
        .select({
          id: leads.id,
          email: leads.email,
          topPeptideMatch: leads.topPeptideMatch,
          budget: leads.budget,
        })
        .from(leads)
        .where(inArray(leads.id, leadIds))
    : [];

  const clickCountRows = sessionIds.length
    ? await db
        .select({
          sessionId: clickEvents.sessionId,
          count: sql<number>`count(*)`,
        })
        .from(clickEvents)
        .where(inArray(clickEvents.sessionId, sessionIds))
        .groupBy(clickEvents.sessionId)
    : [];

  const affiliateCountRows = leadIds.length
    ? await db
        .select({
          leadId: affiliateClicks.leadId,
          count: sql<number>`count(*)`,
        })
        .from(affiliateClicks)
        .where(inArray(affiliateClicks.leadId, leadIds))
        .groupBy(affiliateClicks.leadId)
    : [];

  const leadById = new Map(sessionLeadRows.map((lead) => [lead.id, lead]));
  const clickCountBySessionId = new Map(clickCountRows.map((row) => [row.sessionId, Number(row.count ?? 0)]));
  const affiliateCountByLeadId = new Map(affiliateCountRows.map((row) => [row.leadId, Number(row.count ?? 0)]));

  return sessionRows.map((session) => {
    const lead = session.leadId ? leadById.get(session.leadId) ?? null : null;

    return {
      ...session,
      lead: lead ? { ...lead } : null,
      clickCount:
        (clickCountBySessionId.get(session.id) ?? 0) +
        (lead ? affiliateCountByLeadId.get(lead.id) ?? 0 : 0),
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
        totalQuizStarts: 0,
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

    const [quizStartStats] = await db
      .select({
        totalQuizStarts: sql<number>`count(distinct ${pageVisits.sessionId})`,
      })
      .from(pageVisits)
      .where(eq(pageVisits.path, "/quiz/flow"));

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
      totalQuizStarts: Number(quizStartStats?.totalQuizStarts ?? 0),
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
      .limit(250);

    return buildSessionTableRows(sessions);
  }),

  sessionById: adminProcedure.input(z.object({ sessionId: z.string().min(8).max(64) })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;

    const sessions = await db
      .select()
      .from(visitorSessions)
      .where(eq(visitorSessions.id, input.sessionId))
      .limit(1);

    if (!sessions[0]) return null;

    try {
      const hydrated = await buildSessionPayloads(sessions);
      return hydrated[0] ?? null;
    } catch (error) {
      console.warn("[Analytics] Falling back to basic session detail payload:", error);
      const fallback = await buildBasicSessionPayloads(sessions);
      return fallback[0] ?? null;
    }
  }),
});
