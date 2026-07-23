import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { affiliateClicks, clickEvents, pageVisits, leads, visitorSessions, providerClickLogs } from "../../drizzle/schema";
import { QUIZ_QUESTIONS, calculateAspectScores } from "../../shared/scoring";
import { getDb } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const timeRangeEnum = z.enum(["today", "yesterday", "last7", "last30", "all"]);
type TimeRange = z.infer<typeof timeRangeEnum>;

function timeConditions(range: TimeRange, column: any) {
  if (range === "all") return [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case "today":
      return [gte(column, todayStart)];
    case "yesterday": {
      const yesterdayStart = new Date(todayStart.getTime() - 86400000);
      return [gte(column, yesterdayStart), lt(column, todayStart)];
    }
    case "last7":
      return [gte(column, new Date(now.getTime() - 7 * 86400000))];
    case "last30":
      return [gte(column, new Date(now.getTime() - 30 * 86400000))];
    default:
      return [];
  }
}

// Ceiling for a single page view's reported dwell time (1 hour). Anything larger
// is a bot or a tab left open, so we clamp it: an absurd delta must never poison
// the accumulating visitor_sessions.totalDurationMs sum or overflow a column.
const MAX_PAGE_VIEW_DURATION_MS = 1000 * 60 * 60;

function clampDurationMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value), MAX_PAGE_VIEW_DURATION_MS);
}

const pageViewInput = z.object({
  sessionId: z.string().min(8).max(64),
  path: z.string().min(1).max(512),
  durationMs: z.number().int().min(0).max(MAX_PAGE_VIEW_DURATION_MS),
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

const LIBRARY_PREFIXES = ["/peptides", "/goals", "/compare", "/stacks", "/guides", "/for", "/reviews", "/blog", "/learn"];

/**
 * Classify the surface a session landed on so the dashboard can compare
 * bridge-entry vs direct-entry vs library-entry lead rates.
 * 'bridge' = the /match paid-traffic landing page (leg-5); 'library' = pSEO
 * content; 'funnel' = homepage/quiz/results/providers.
 */
function classifySurface(path: string): "funnel" | "library" | "bridge" {
  const p = normalizePath(path).toLowerCase();
  if (p === "/match" || p.startsWith("/match/") || p.startsWith("/peptides-for-weight-loss")) return "bridge";
  if (LIBRARY_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix + "/"))) return "library";
  return "funnel";
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
    sourceSurface: classifySurface(input.landingPath),
  });
}

export async function recordPageView(input: PageViewPayload) {
  const db = await getDb();
  if (!db) return;

  // The /api/analytics/page-view beacon calls this directly (no zod validation),
  // so clamp here to keep a single absurd value out of page_visits.durationMs and
  // the accumulating visitor_sessions.totalDurationMs sum.
  const durationMs = clampDurationMs(input.durationMs);

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
      durationMs,
      referrer: normalizeReferrer(input.referrer),
    });

  await db
    .update(visitorSessions)
    .set({
      lastSeenAt: new Date(),
      lastPath: normalizePath(input.path),
      pageViewCount: sql`${visitorSessions.pageViewCount} + 1`,
      totalDurationMs: sql`${visitorSessions.totalDurationMs} + ${durationMs}`,
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

type FunnelEventPayload = {
  sessionId: string;
  event: string;
  data: Record<string, unknown> | null;
};

export async function recordFunnelEvent(input: FunnelEventPayload) {
  const db = await getDb();
  if (!db) return;
  try {
    const existing = await db
      .select()
      .from(visitorSessions)
      .where(eq(visitorSessions.id, input.sessionId))
      .limit(1);
    const leadId = existing[0]?.leadId ?? null;

    await db.insert(clickEvents).values({
      sessionId: input.sessionId,
      leadId,
      path: `/processing/${input.event}`,
      label: input.event,
      targetHref: input.data ? JSON.stringify(input.data) : null,
      eventType: "funnel",
    });
  } catch (err) {
    console.error("[Analytics] Failed to record funnel event:", err);
  }
}

function decodeQuizAnswers(rawQuizData: unknown) {
  if (!Array.isArray(rawQuizData)) return [];

  return QUIZ_QUESTIONS.map((question, index) => {
    const answerIndex = typeof rawQuizData[index] === "number" ? rawQuizData[index] : null;
    let answer =
      answerIndex != null && question.options[answerIndex]
        ? question.options[answerIndex]
        : "No answer recorded";
    // q5 idx 0 semantic break (2026-07-23): pre-change leads answered "Under 25
    // (normal weight)"; post-change idx 0 is the calculator's "Prefer not to say"
    // skip. Label both meanings so historical leads aren't mislabeled in admin.
    if (index === 5 && answerIndex === 0) {
      answer = "Prefer not to say (post-7/23) / Under 25 (pre-7/23)";
    }
    return {
      section: question.section,
      question: question.question,
      answerIndex,
      answer,
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

  const sessionIds = sessionRows.map((session) => session.id);
  const leadIds = sessionRows
    .map((session) => session.leadId)
    .filter((value): value is string => Boolean(value));
  const sessionLeadRows = leadIds.length
    ? await db.select().from(leads).where(inArray(leads.id, leadIds))
    : [];
  let fallbackLeadRows: typeof sessionLeadRows = [];
  try {
    fallbackLeadRows = sessionIds.length
      ? await db.select().from(leads).where(inArray(leads.sessionId, sessionIds))
      : [];
  } catch (error) {
    console.warn("[Analytics] Basic payload fallback without leads.sessionId linkage:", error);
  }

  const leadById = new Map(sessionLeadRows.map((lead) => [lead.id, lead]));
  const leadBySessionId = new Map(
    fallbackLeadRows
      .filter((lead) => Boolean(lead.sessionId))
      .map((lead) => [lead.sessionId as string, lead]),
  );

  return sessionRows.map((session) => {
    const lead =
      (session.leadId ? leadById.get(session.leadId) ?? null : null) ??
      leadBySessionId.get(session.id) ??
      null;
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
  const affiliateVendorRows = leadIds.length
    ? await db
        .select({
          leadId: affiliateClicks.leadId,
          vendor: affiliateClicks.vendor,
        })
        .from(affiliateClicks)
        .where(inArray(affiliateClicks.leadId, leadIds))
        .orderBy(desc(affiliateClicks.clickedAt))
    : [];

  const leadById = new Map(sessionLeadRows.map((lead) => [lead.id, lead]));
  const clickCountBySessionId = new Map(clickCountRows.map((row) => [row.sessionId, Number(row.count ?? 0)]));
  const affiliateCountByLeadId = new Map(affiliateCountRows.map((row) => [row.leadId, Number(row.count ?? 0)]));
  const affiliateVendorsByLeadId = new Map<string, string[]>();

  affiliateVendorRows.forEach((row) => {
    const current = affiliateVendorsByLeadId.get(row.leadId) ?? [];
    if (!current.includes(row.vendor)) current.push(row.vendor);
    affiliateVendorsByLeadId.set(row.leadId, current);
  });

  return sessionRows.map((session) => {
    const lead = session.leadId ? leadById.get(session.leadId) ?? null : null;
    const affiliateClickCount = lead ? affiliateCountByLeadId.get(lead.id) ?? 0 : 0;
    const affiliateVendors = lead ? affiliateVendorsByLeadId.get(lead.id) ?? [] : [];

    return {
      ...session,
      lead: lead ? { ...lead } : null,
      clickCount: clickCountBySessionId.get(session.id) ?? 0,
      affiliateClickCount,
      affiliateVendors,
    };
  });
}

const funnelEventInput = z.object({
  sessionId: z.string().min(1).max(64),
  event: z.string().min(1).max(128),
  data: z.record(z.unknown()).optional(),
});

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

  trackFunnelEvent: publicProcedure.input(funnelEventInput).mutation(async ({ input }) => {
    await recordFunnelEvent({
      sessionId: input.sessionId,
      event: input.event,
      data: input.data ?? null,
    });
    return { status: "ok" as const };
  }),

  summary: adminProcedure
    .input(z.object({ timeRange: timeRangeEnum.optional().default("all") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          totalSessions: 0,
          totalLeads: 0,
          totalQuizStarts: 0,
          totalAffiliateClicks: 0,
          leadsWithAffiliateClicks: 0,
          quizCompletionRate: 0,
          avgEngagementSeconds: 0,
          topReferrers: [],
          totalClicks: 0,
          clickBreakdown: { glp1Provider: 0, peptideVendor: 0, other: 0 },
        };
      }

      const tc = (col: any) => timeConditions(input.timeRange, col);

      const [sessionStats] = await db
        .select({
          totalSessions: sql<number>`count(*)`,
          totalDurationMs: sql<number>`coalesce(sum(${visitorSessions.totalDurationMs}), 0)`,
          completedSessions: sql<number>`count(case when ${visitorSessions.leadId} is not null then 1 end)`,
        })
        .from(visitorSessions)
        .where(and(...tc(visitorSessions.firstSeenAt)));

      const [leadStats] = await db
        .select({
          totalLeads: sql<number>`count(*)`,
        })
        .from(leads)
        .where(and(...tc(leads.createdAt)));

      const [clickStats] = await db
        .select({
          totalClicks: sql<number>`count(*)`,
        })
        .from(clickEvents)
        .where(and(...tc(clickEvents.createdAt)));

      const [affiliateClickStats] = await db
        .select({
          totalAffiliateClicks: sql<number>`count(*)`,
          leadsWithAffiliateClicks: sql<number>`count(distinct ${affiliateClicks.leadId})`,
        })
        .from(affiliateClicks)
        .where(and(...tc(affiliateClicks.clickedAt)));

      const [quizStartStats] = await db
        .select({
          totalQuizStarts: sql<number>`count(distinct ${pageVisits.sessionId})`,
        })
        .from(pageVisits)
        .where(and(eq(pageVisits.path, "/quiz/flow"), ...tc(pageVisits.createdAt)));

      // GLP-1-vs-peptide click split so the dashboard separates monetizable
      // GLP-1 provider clicks from research-peptide vendor noise.
      const affiliateByType = await db
        .select({
          clickType: sql<string>`coalesce(${affiliateClicks.clickType}, 'glp1_provider')`,
          count: sql<number>`count(*)`,
        })
        .from(affiliateClicks)
        .where(and(...tc(affiliateClicks.clickedAt)))
        .groupBy(sql`1`);

      const [providerLogCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(providerClickLogs)
        .where(and(...tc(providerClickLogs.createdAt)));

      const byType = new Map<string, number>();
      for (const row of affiliateByType) byType.set(String(row.clickType), Number(row.count ?? 0));
      const clickBreakdown = {
        // provider_click_logs are all monetizable GLP-1 provider clicks (/go/ redirects)
        glp1Provider: (byType.get("glp1_provider") ?? 0) + Number(providerLogCount?.count ?? 0),
        peptideVendor: byType.get("peptide_vendor") ?? 0,
        other: byType.get("other") ?? 0,
      };

      const referrerRows = await db
        .select({
          referrer: visitorSessions.referrer,
          count: sql<number>`count(*)`,
        })
        .from(visitorSessions)
        .where(
          and(
            sql`${visitorSessions.referrer} is not null and ${visitorSessions.referrer} <> ''`,
            ...tc(visitorSessions.firstSeenAt),
          ),
        )
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
        totalAffiliateClicks: Number(affiliateClickStats?.totalAffiliateClicks ?? 0),
        leadsWithAffiliateClicks: Number(affiliateClickStats?.leadsWithAffiliateClicks ?? 0),
        totalClicks: Number(clickStats?.totalClicks ?? 0),
        clickBreakdown,
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

  deleteSession: adminProcedure
    .input(z.object({ sessionId: z.string().min(8).max(64) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database is not available.");
      }

      const sessions = await db
        .select()
        .from(visitorSessions)
        .where(eq(visitorSessions.id, input.sessionId))
        .limit(1);

      const session = sessions[0];
      if (!session) {
        throw new Error("Session not found.");
      }

      const leadIds = new Set<string>();
      if (session.leadId) leadIds.add(session.leadId);

      try {
        const linkedLeads = await db
          .select({ id: leads.id })
          .from(leads)
          .where(eq(leads.sessionId, input.sessionId));
        linkedLeads.forEach((lead) => leadIds.add(lead.id));
      } catch (error) {
        console.warn("[Analytics] Delete session fallback without leads.sessionId linkage:", error);
      }

      const leadIdList = Array.from(leadIds);

      await db.transaction(async (tx) => {
        await tx.delete(pageVisits).where(eq(pageVisits.sessionId, input.sessionId));
        await tx.delete(clickEvents).where(eq(clickEvents.sessionId, input.sessionId));

        if (leadIdList.length) {
          await tx.delete(affiliateClicks).where(inArray(affiliateClicks.leadId, leadIdList));
          await tx.delete(clickEvents).where(inArray(clickEvents.leadId, leadIdList));
          await tx.delete(leads).where(inArray(leads.id, leadIdList));
        }

        await tx.delete(visitorSessions).where(eq(visitorSessions.id, input.sessionId));
      });

      return {
        deletedSessionId: input.sessionId,
        deletedLeadCount: leadIdList.length,
      };
    }),

  funnel: adminProcedure
    .input(z.object({ timeRange: timeRangeEnum.optional().default("all") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { stages: [], totalSessions: 0 };

      const tc = (col: any) => timeConditions(input.timeRange, col);

      const stages: Array<{
        label: string;
        path: string;
        count: number;
        pctOfTotal: number;
        droppedFromPrevious: number;
        pctDropped: number;
      }> = [];

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(visitorSessions)
        .where(and(...tc(visitorSessions.firstSeenAt)));
      const totalSessions = Number(totalResult?.count ?? 0);

    stages.push({
      label: "All Sessions",
      path: "",
      count: totalSessions,
      pctOfTotal: 100,
      droppedFromPrevious: 0,
      pctDropped: 0,
    });

    const funnelPaths = [
      { path: "/quiz", label: "Quiz Intro" },
      { path: "/quiz/flow", label: "Started Quiz" },
      { path: "/processing", label: "Processing" },
      { path: "/results", label: "Results" },
    ];

    for (const { path, label } of funnelPaths) {
      // Results views land on /results/{publicId} (Processing redirects there),
      // so an exact match on "/results" silently reads 0 while downstream
      // stages (leads, clicks) are non-zero. Prefix-match the results stage.
      const pathCond =
        path === "/results"
          ? sql`(${pageVisits.path} = '/results' OR ${pageVisits.path} LIKE '/results/%')`
          : eq(pageVisits.path, path);
      const [result] = await db
        .select({ count: sql<number>`count(distinct ${pageVisits.sessionId})` })
        .from(pageVisits)
        .where(and(pathCond, ...tc(pageVisits.createdAt)));
      const count = Number(result?.count ?? 0);
      const prevCount = stages[stages.length - 1].count;
      stages.push({
        label,
        path,
        count,
        pctOfTotal: totalSessions ? Math.round((count / totalSessions) * 100) : 0,
        droppedFromPrevious: prevCount - count,
        pctDropped: prevCount ? Math.round(((prevCount - count) / prevCount) * 100) : 0,
      });
    }

    const [leadResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(visitorSessions)
      .where(and(sql`${visitorSessions.leadId} is not null`, ...tc(visitorSessions.firstSeenAt)));
    const leadCount = Number(leadResult?.count ?? 0);
    const prevLead = stages[stages.length - 1].count;
    stages.push({
      label: "Lead Created",
      path: "lead",
      count: leadCount,
      pctOfTotal: totalSessions ? Math.round((leadCount / totalSessions) * 100) : 0,
      droppedFromPrevious: prevLead - leadCount,
      pctDropped: prevLead ? Math.round(((prevLead - leadCount) / prevLead) * 100) : 0,
    });

    const leadsWithClicks = await db
      .selectDistinct({ leadId: affiliateClicks.leadId })
      .from(affiliateClicks)
      .where(and(...tc(affiliateClicks.clickedAt)));

    const clickLeadIds = leadsWithClicks.map((r) => r.leadId).filter(Boolean) as string[];
    let affCount = 0;

    if (clickLeadIds.length) {
      const fkSessions = await db
        .select({ id: visitorSessions.id })
        .from(visitorSessions)
        .where(and(inArray(visitorSessions.leadId, clickLeadIds), ...tc(visitorSessions.firstSeenAt)));

      const revLeads = await db
        .select({ sessionId: leads.sessionId })
        .from(leads)
        .where(and(inArray(leads.id, clickLeadIds), sql`${leads.sessionId} is not null`, ...tc(leads.createdAt)));

      const allIds = new Set([
        ...fkSessions.map((s) => s.id),
        ...revLeads.filter((l) => l.sessionId).map((l) => l.sessionId as string),
      ]);
      affCount = allIds.size;
    }

    const prevAff = stages[stages.length - 1].count;
    stages.push({
      label: "Affiliate Click",
      path: "affiliate_click",
      count: affCount,
      pctOfTotal: totalSessions ? Math.round((affCount / totalSessions) * 100) : 0,
      droppedFromPrevious: prevAff - affCount,
      pctDropped: prevAff ? Math.round(((prevAff - affCount) / prevAff) * 100) : 0,
    });

    // ── "Homepage → Gala" card ────────────────────────────────────────────────
    // Homepage visitors = distinct sessions with a page view on "/"; clickers =
    // distinct sessions with a home_direct provider_click_logs row; CTR = clickers/
    // visitors; plus an in-app-browser split and a per-day trajectory. All scoped to
    // the selected period via tc(). Grouping uses date(col) (same TZ as the rest of
    // the dashboard's time filters).
    // The homepage→Gala direct experiment launched 2026-07-11. Clamp the card's
    // window to >= this so pre-experiment days (structurally 0 clicks) don't poison
    // the CTR — applied on top of the period selector, so effective start =
    // max(period start, EXPERIMENT_START). The period selector is left alone.
    const EXPERIMENT_START = new Date("2026-07-11T00:00:00Z");
    const sinceLabel = EXPERIMENT_START.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

    const [hv] = await db
      .select({ count: sql<number>`count(distinct ${pageVisits.sessionId})` })
      .from(pageVisits)
      .where(and(eq(pageVisits.path, "/"), gte(pageVisits.createdAt, EXPERIMENT_START), ...tc(pageVisits.createdAt)));
    const homepageVisitors = Number(hv?.count ?? 0);

    // Count every home_direct* click (placement is encoded as home_direct_<pos>);
    // pre-placement rows are plain 'home_direct' (unknown slot).
    const [hc] = await db
      .select({
        // Homepage-direct CTR metrics EXCLUDE the /start bridge slot (home_direct_brdg) —
        // those clicks belong to the bridge funnel, not the homepage→direct CTR numerator.
        clicks: sql<number>`count(distinct case when ${providerClickLogs.position} <> 'home_direct_brdg' then ${providerClickLogs.publicId} end)`,
        inApp: sql<number>`count(distinct case when ${providerClickLogs.inAppBrowser} = 1 and ${providerClickLogs.position} <> 'home_direct_brdg' then ${providerClickLogs.publicId} end)`,
        hero: sql<number>`count(distinct case when ${providerClickLogs.position} = 'home_direct_hero' then ${providerClickLogs.publicId} end)`,
        footer: sql<number>`count(distinct case when ${providerClickLogs.position} = 'home_direct_foot' then ${providerClickLogs.publicId} end)`,
        bridge: sql<number>`count(distinct case when ${providerClickLogs.position} = 'home_direct_brdg' then ${providerClickLogs.publicId} end)`,
        // Three legs, partitioned by provider + date: Gala-v1 (Jul 11–14, homepage→gala
        // direct), DM (Jul 15–20, direct_med), Gala-v2 (Jul 20→, homepage→/start bridge→
        // gala, new landing src=lp-glp1-top5-mirror-c4e9). Gala had no clicks Jul 15–19,
        // so the date split is unambiguous.
        galaV1: sql<number>`count(distinct case when ${providerClickLogs.providerSlug} = 'gala' and ${providerClickLogs.createdAt} < '2026-07-15' then ${providerClickLogs.publicId} end)`,
        dm: sql<number>`count(distinct case when ${providerClickLogs.providerSlug} = 'direct_med' and ${providerClickLogs.createdAt} >= '2026-07-15' and ${providerClickLogs.createdAt} < '2026-07-21' then ${providerClickLogs.publicId} end)`,
        galaV2: sql<number>`count(distinct case when ${providerClickLogs.providerSlug} = 'gala' and ${providerClickLogs.createdAt} >= '2026-07-20' then ${providerClickLogs.publicId} end)`,
      })
      .from(providerClickLogs)
      .where(and(sql`${providerClickLogs.position} like 'home_direct%'`, gte(providerClickLogs.createdAt, EXPERIMENT_START), ...tc(providerClickLogs.createdAt)));
    const homeClicks = Number(hc?.clicks ?? 0);
    const inAppClicks = Number(hc?.inApp ?? 0);
    const heroClicks = Number(hc?.hero ?? 0);
    const footerClicks = Number(hc?.footer ?? 0);
    const bridgeClicks = Number(hc?.bridge ?? 0);
    const galaV1Clicks = Number(hc?.galaV1 ?? 0);
    const dmClicks = Number(hc?.dm ?? 0);
    const galaV2Clicks = Number(hc?.galaV2 ?? 0);

    const visByDay = await db
      .select({
        d: sql<string>`date(${pageVisits.createdAt})`,
        v: sql<number>`count(distinct ${pageVisits.sessionId})`,
      })
      .from(pageVisits)
      .where(and(eq(pageVisits.path, "/"), gte(pageVisits.createdAt, EXPERIMENT_START), ...tc(pageVisits.createdAt)))
      .groupBy(sql`date(${pageVisits.createdAt})`);
    const clkByDay = await db
      .select({
        d: sql<string>`date(${providerClickLogs.createdAt})`,
        c: sql<number>`count(distinct ${providerClickLogs.publicId})`,
      })
      .from(providerClickLogs)
      .where(and(sql`${providerClickLogs.position} like 'home_direct%'`, sql`${providerClickLogs.position} <> 'home_direct_brdg'`, gte(providerClickLogs.createdAt, EXPERIMENT_START), ...tc(providerClickLogs.createdAt)))
      .groupBy(sql`date(${providerClickLogs.createdAt})`);

    const dayKey = (d: unknown) =>
      typeof d === "string" ? d.slice(0, 10) : new Date(d as string).toISOString().slice(0, 10);
    const dayMap = new Map<string, { date: string; visitors: number; clicks: number; ctr: number }>();
    for (const r of visByDay) {
      const k = dayKey(r.d);
      dayMap.set(k, { date: k, visitors: Number(r.v), clicks: 0, ctr: 0 });
    }
    for (const r of clkByDay) {
      const k = dayKey(r.d);
      const e = dayMap.get(k) ?? { date: k, visitors: 0, clicks: 0, ctr: 0 };
      e.clicks = Number(r.c);
      dayMap.set(k, e);
    }
    const byDay = Array.from(dayMap.values())
      .map((e) => ({ ...e, ctr: e.visitors ? Math.round((e.clicks / e.visitors) * 100) : 0 }))
      .sort((a, b) => b.date.localeCompare(a.date)) // newest first (today at top)
      .slice(0, 14); // last 14 days only — the card is a pulse, not an archive

    // ── Bridge funnel (/start → Q1 → Q2 → Q3 → handoff) ──────────────────────
    // Paid-traffic warm-up bridge. Starts = distinct '/start' page-view sessions;
    // Q1..Q3 = distinct sessions with each bridge answer stored; handoff = distinct
    // clickers on the bridge slot (home_direct_brdg). Same EXPERIMENT_START clamp + tc().
    const [bs] = await db
      .select({ c: sql<number>`count(distinct ${pageVisits.sessionId})` })
      .from(pageVisits)
      .where(and(eq(pageVisits.path, "/start"), gte(pageVisits.createdAt, EXPERIMENT_START), ...tc(pageVisits.createdAt)));
    const [bq] = await db
      .select({
        q1: sql<number>`count(distinct case when ${visitorSessions.bridgeQ1} is not null then ${visitorSessions.id} end)`,
        q2: sql<number>`count(distinct case when ${visitorSessions.bridgeQ2} is not null then ${visitorSessions.id} end)`,
        q3: sql<number>`count(distinct case when ${visitorSessions.bridgeQ3} is not null then ${visitorSessions.id} end)`,
      })
      .from(visitorSessions)
      .where(and(gte(visitorSessions.createdAt, EXPERIMENT_START), ...tc(visitorSessions.createdAt)));
    const [bh] = await db
      .select({ c: sql<number>`count(distinct ${providerClickLogs.publicId})` })
      .from(providerClickLogs)
      .where(and(eq(providerClickLogs.position, "home_direct_brdg"), gte(providerClickLogs.createdAt, EXPERIMENT_START), ...tc(providerClickLogs.createdAt)));

    const bStartDay = await db
      .select({ d: sql<string>`date(${pageVisits.createdAt})`, n: sql<number>`count(distinct ${pageVisits.sessionId})` })
      .from(pageVisits)
      .where(and(eq(pageVisits.path, "/start"), gte(pageVisits.createdAt, EXPERIMENT_START), ...tc(pageVisits.createdAt)))
      .groupBy(sql`date(${pageVisits.createdAt})`);
    const bQ3Day = await db
      .select({ d: sql<string>`date(${visitorSessions.createdAt})`, n: sql<number>`count(distinct ${visitorSessions.id})` })
      .from(visitorSessions)
      .where(and(sql`${visitorSessions.bridgeQ3} is not null`, gte(visitorSessions.createdAt, EXPERIMENT_START), ...tc(visitorSessions.createdAt)))
      .groupBy(sql`date(${visitorSessions.createdAt})`);
    const bHandDay = await db
      .select({ d: sql<string>`date(${providerClickLogs.createdAt})`, n: sql<number>`count(distinct ${providerClickLogs.publicId})` })
      .from(providerClickLogs)
      .where(and(eq(providerClickLogs.position, "home_direct_brdg"), gte(providerClickLogs.createdAt, EXPERIMENT_START), ...tc(providerClickLogs.createdAt)))
      .groupBy(sql`date(${providerClickLogs.createdAt})`);
    const bMap = new Map<string, { date: string; starts: number; q3: number; handoffs: number }>();
    const bAdd = (rows: any[], key: "starts" | "q3" | "handoffs") => {
      for (const r of rows) {
        const k = dayKey(r.d);
        const e = bMap.get(k) ?? { date: k, starts: 0, q3: 0, handoffs: 0 };
        e[key] = Number(r.n);
        bMap.set(k, e);
      }
    };
    bAdd(bStartDay, "starts");
    bAdd(bQ3Day, "q3");
    bAdd(bHandDay, "handoffs");
    const bridgeByDay = Array.from(bMap.values()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

    const bridgeFunnel = {
      startVisits: Number(bs?.c ?? 0),
      q1: Number(bq?.q1 ?? 0),
      q2: Number(bq?.q2 ?? 0),
      q3: Number(bq?.q3 ?? 0),
      handoffClicks: Number(bh?.c ?? 0),
      byDay: bridgeByDay,
    };

    const directFlow = {
      homepageVisitors,
      clicks: homeClicks,
      ctr: homepageVisitors ? Math.round((homeClicks / homepageVisitors) * 100) : 0,
      inAppClicks,
      browserClicks: Math.max(0, homeClicks - inAppClicks),
      heroClicks,
      footerClicks,
      bridgeClicks,
      // Three legs (Gala-v1 Jul 11–14 · DM Jul 15–20 · Gala-v2 Jul 20→). Kept side by
      // side; Gala-v2 uses a different landing variant so it is NOT 1:1 comparable to v1.
      galaV1Clicks,
      dmClicks,
      galaV2Clicks,
      sinceLabel,
      byDay,
    };

    return { stages, totalSessions, directFlow, bridgeFunnel };
  }),
});
