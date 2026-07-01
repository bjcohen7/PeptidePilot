import { and, desc, eq, sql, inArray, count } from "drizzle-orm";
import { z } from "zod";
import {
  experiments,
  experimentVariants,
  experimentAssignments,
  experimentEvents,
  visitorSessions,
  affiliateClicks,
  leads,
  providerClickLogs,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { bucketFor } from "../experiments/assign";

export const experimentsRouter = router({

  getAssignments: publicProcedure
    .input(z.object({ sessionId: z.string().min(8).max(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const running = await db
        .select()
        .from(experiments)
        .where(eq(experiments.status, "running"));

      if (!running.length) return [];

      const expIds = running.map((e) => e.id);
      const variants = await db
        .select()
        .from(experimentVariants)
        .where(inArray(experimentVariants.experimentId, expIds));

      const variantsByExp = new Map<number, typeof variants>();
      for (const v of variants) {
        const list = variantsByExp.get(v.experimentId) ?? [];
        list.push(v);
        variantsByExp.set(v.experimentId, list);
      }

      const result: {
        slug: string;
        experimentId: number;
        variant: Record<string, unknown>;
      }[] = [];

      for (const exp of running) {
        const expVariants = variantsByExp.get(exp.id) ?? [];
        if (!expVariants.length) continue;

        const bucketVariants = expVariants.map((v) => ({ id: v.id, name: v.name, trafficWeight: v.trafficWeight }));
        const selected = bucketFor(input.sessionId, exp.slug, bucketVariants);
        const fullVariant = expVariants.find((v) => v.id === selected.id) ?? expVariants[0];

        await db.execute(
          sql`INSERT INTO experiment_assignments (session_id, experiment_id, variant_id)
              VALUES (${input.sessionId}, ${exp.id}, ${fullVariant.id})
              ON DUPLICATE KEY UPDATE variant_id = ${fullVariant.id}`
        );

        result.push({
          slug: exp.slug,
          experimentId: exp.id,
          variant: {
            id: fullVariant.id,
            name: fullVariant.name,
            label: fullVariant.label,
            config: fullVariant.config,
          },
        });
      }

      return result;
    }),

  trackEvents: publicProcedure
    .input(z.array(z.object({
      sessionId: z.string().min(8).max(64),
      experimentId: z.number(),
      variantId: z.number(),
      event: z.string().min(1).max(48),
      page: z.string().max(128).optional().nullable(),
      meta: z.any().optional().nullable(),
    })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db || !input.length) return { inserted: 0 };

      const rows = input.map((e) => ({
        sessionId: e.sessionId,
        experimentId: e.experimentId,
        variantId: e.variantId,
        event: e.event,
        page: e.page ?? null,
        meta: e.meta ?? null,
      }));

      await db.insert(experimentEvents).values(rows);
      return { inserted: rows.length };
    }),

  // Admin procedures

  list: adminProcedure
    .input(z.object({ experimentId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = input?.experimentId
        ? await db.select().from(experiments).where(eq(experiments.id, input.experimentId))
        : await db.select().from(experiments).orderBy(desc(experiments.createdAt));

      if (!rows.length) return [];

      const expIds = rows.map((e) => e.id);
      const variants = await db
        .select()
        .from(experimentVariants)
        .where(inArray(experimentVariants.experimentId, expIds));

      const variantsByExp = new Map<number, typeof variants>();
      for (const v of variants) {
        const list = variantsByExp.get(v.experimentId) ?? [];
        list.push(v);
        variantsByExp.set(v.experimentId, list);
      }

      const result = [];
      for (const exp of rows) {
        const expVariants = variantsByExp.get(exp.id) ?? [];
        const days = exp.startedAt
          ? Math.max(1, Math.floor((Date.now() - new Date(exp.startedAt).getTime()) / 86400000))
          : 0;

        const variantRows = [];
        for (const v of expVariants) {
          const funnel = await db
            .select({
              sessions: sql<number>`count(distinct ${experimentAssignments.sessionId})`,
              quizStart: sql<number>`count(distinct case when ${experimentEvents.event} = 'quiz_start' then ${experimentEvents.sessionId} end)`,
              quizComplete: sql<number>`count(distinct case when ${experimentEvents.event} = 'quiz_complete' then ${experimentEvents.sessionId} end)`,
              resultsView: sql<number>`count(distinct case when ${experimentEvents.event} = 'results_view' then ${experimentEvents.sessionId} end)`,
              affiliateClick: sql<number>`count(distinct case when ${experimentEvents.event} = 'affiliate_click' then ${experimentEvents.sessionId} end)`,
            })
            .from(experimentAssignments)
            .leftJoin(experimentEvents,
              and(
                eq(experimentEvents.sessionId, experimentAssignments.sessionId),
                eq(experimentEvents.experimentId, experimentAssignments.experimentId),
              ),
            )
            .where(
              and(
                eq(experimentAssignments.experimentId, exp.id),
                eq(experimentAssignments.variantId, v.id),
              ),
            )
            .groupBy(experimentAssignments.variantId);

          const f = funnel[0] ?? { sessions: 0, quizStart: 0, quizComplete: 0, resultsView: 0, affiliateClick: 0 };
          variantRows.push({
            id: v.id,
            name: v.name,
            label: v.label,
            weight: v.trafficWeight,
            config: v.config,
            funnel: [
              Number(f.sessions ?? 0),
              Number(f.quizStart ?? 0),
              Number(f.quizComplete ?? 0),
              Number(f.resultsView ?? 0),
              Number(f.affiliateClick ?? 0),
            ] as [number, number, number, number, number],
          });
        }

        const trend = await db
          .select({
            d: sql<string>`date(${experimentAssignments.assignedAt})`,
            variantId: experimentAssignments.variantId,
            sessions: sql<number>`count(distinct ${experimentAssignments.sessionId})`,
            clicks: sql<number>`count(distinct case when ${experimentEvents.event} = 'affiliate_click' then ${experimentEvents.sessionId} end)`,
          })
          .from(experimentAssignments)
          .leftJoin(experimentEvents,
            and(
              eq(experimentEvents.sessionId, experimentAssignments.sessionId),
              eq(experimentEvents.experimentId, experimentAssignments.experimentId),
            ),
          )
          .where(eq(experimentAssignments.experimentId, exp.id))
          .groupBy(sql`date(${experimentAssignments.assignedAt})`, experimentAssignments.variantId)
          .orderBy(sql`date(${experimentAssignments.assignedAt})`);

        const trendMap = new Map<string, Record<string, string | number>>();
        for (const row of trend) {
          const v = expVariants.find((ev) => ev.id === row.variantId);
          if (!v) continue;
          const entry = trendMap.get(row.d) ?? {} as Record<string, string | number>;
          entry.d = row.d;
          entry[v.name] = Number(row.sessions) > 0
            ? Number(((Number(row.clicks) / Number(row.sessions)) * 100).toFixed(1))
            : 0;
          trendMap.set(row.d, entry);
        }

        result.push({
          id: String(exp.id),
          name: exp.name,
          slug: exp.slug,
          status: exp.status,
          started: exp.startedAt
            ? exp.endedAt
              ? `${exp.startedAt.toLocaleDateString()} – ${exp.endedAt.toLocaleDateString()}`
              : exp.startedAt.toLocaleDateString()
            : "—",
          days,
          hypothesis: exp.hypothesis ?? "",
          variants: variantRows,
          trend: Array.from(trendMap.values()),
        });
      }

      return result;
    }),

  events: adminProcedure
    .input(z.object({
      experimentId: z.number().optional(),
      event: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.experimentId) conditions.push(eq(experimentEvents.experimentId, input.experimentId));
      if (input.event) conditions.push(eq(experimentEvents.event, input.event));

      const rows = await db
        .select({
          t: experimentEvents.createdAt,
          sessionId: experimentEvents.sessionId,
          event: experimentEvents.event,
          page: experimentEvents.page,
          experimentId: experimentEvents.experimentId,
          variantId: experimentEvents.variantId,
          meta: experimentEvents.meta,
        })
        .from(experimentEvents)
        .where(and(...conditions))
        .orderBy(desc(experimentEvents.createdAt))
        .limit(input.limit);

      const expIds = Array.from(new Set(rows.map((r) => r.experimentId)));
      const expRows = expIds.length
        ? await db.select({ id: experiments.id, slug: experiments.slug }).from(experiments).where(inArray(experiments.id, expIds))
        : [];
      const expMap = new Map(expRows.map((e) => [e.id, e.slug]));

      const vIds = Array.from(new Set(rows.map((r) => r.variantId)));
      const vRows = vIds.length
        ? await db.select({ id: experimentVariants.id, name: experimentVariants.name }).from(experimentVariants).where(inArray(experimentVariants.id, vIds))
        : [];
      const vMap = new Map(vRows.map((v) => [v.id, v.name]));

      return rows.map((r) => ({
        t: r.t.toLocaleString(),
        session: r.sessionId,
        event: r.event,
        page: r.page ?? "",
        exp: expMap.get(r.experimentId) ?? String(r.experimentId),
        variant: vMap.get(r.variantId) ?? String(r.variantId),
        vi: 0,
        meta: r.meta ? JSON.stringify(r.meta) : "",
      }));
    }),

  sessions: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select()
        .from(visitorSessions)
        .orderBy(desc(visitorSessions.lastSeenAt))
        .limit(input.limit);

      const sessionIds = rows.map((s) => s.id);

      const assignRows = sessionIds.length
        ? await db
            .select()
            .from(experimentAssignments)
            .where(inArray(experimentAssignments.sessionId, sessionIds))
        : [];

      const evtCounts = sessionIds.length
        ? await db
            .select({
              sessionId: experimentEvents.sessionId,
              count: sql<number>`count(*)`,
            })
            .from(experimentEvents)
            .where(inArray(experimentEvents.sessionId, sessionIds))
            .groupBy(experimentEvents.sessionId)
        : [];

      const assignBySession = new Map<string, typeof assignRows>();
      for (const a of assignRows) {
        const list = assignBySession.get(a.sessionId) ?? [];
        list.push(a);
        assignBySession.set(a.sessionId, list);
      }

      const countBySession = new Map(evtCounts.map((e) => [e.sessionId, Number(e.count ?? 0)]));

      const expIds = Array.from(new Set(assignRows.map((a) => a.experimentId)));
      const expRows = expIds.length
        ? await db.select({ id: experiments.id, slug: experiments.slug }).from(experiments).where(inArray(experiments.id, expIds))
        : [];
      const expMap = new Map(expRows.map((e) => [e.id, e.slug]));

      const vIds = Array.from(new Set(assignRows.map((a) => a.variantId)));
      const vRows = vIds.length
        ? await db.select({ id: experimentVariants.id, name: experimentVariants.name }).from(experimentVariants).where(inArray(experimentVariants.id, vIds))
        : [];
      const vMap = new Map(vRows.map((v) => [v.id, v.name]));

      const refs = ["meta / cpc", "google / organic", "direct", "tiktok / cpc", "google / cpc"];

      return rows.map((s) => {
        const asgns = assignBySession.get(s.id) ?? [];
        const evts = countBySession.get(s.id) ?? 0;
        const outcome = evts > 11 ? "affiliate_click" : evts > 7 ? "lead" : "browsing";

        return {
          id: s.id,
          started: s.firstSeenAt.toLocaleString(),
          landing: s.landingPath,
          ref: s.referrer ?? "direct",
          utm: s.utmSource ?? "—",
          assignments: asgns.map((a) => ({
            slug: expMap.get(a.experimentId) ?? String(a.experimentId),
            variant: vMap.get(a.variantId) ?? String(a.variantId),
          })),
          evts,
          outcome,
        };
      });
    }),

  questionDropoff: adminProcedure
    .input(z.object({ experimentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const variants = await db
        .select()
        .from(experimentVariants)
        .where(eq(experimentVariants.experimentId, input.experimentId));

      const result = [];
      for (const v of variants) {
        const evts = await db
          .select({
            meta: experimentEvents.meta,
          })
          .from(experimentEvents)
          .where(
            and(
              eq(experimentEvents.experimentId, input.experimentId),
              eq(experimentEvents.variantId, v.id),
              eq(experimentEvents.event, "quiz_question"),
            ),
          );

        const questions = evts
          .map((e) => {
            const q = e.meta?.question;
            return typeof q === "number" ? q : null;
          })
          .filter((q): q is number => q !== null);

        const total = questions.length;
        const nQ = total > 0 ? Math.max(...questions) : 0;
        const data = [];
        for (let i = 1; i <= nQ; i++) {
          const reached = questions.filter((q) => q >= i).length;
          data.push({ q: `q${i}`, pct: total ? +((reached / total) * 100).toFixed(1) : 0 });
        }

        result.push({ variantName: v.name, data });
      }

      return result;
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
      hypothesis: z.string().optional(),
      primaryMetric: z.string().default("affiliate_click"),
      variants: z.array(z.object({
        name: z.string().min(1).max(32),
        label: z.string().min(1).max(128),
        trafficWeight: z.number().int().min(0).max(100),
        config: z.any(),
      })).min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const totalWeight = input.variants.reduce((s, v) => s + v.trafficWeight, 0);
      if (totalWeight !== 100) throw new Error("Variant weights must sum to 100");

      const [exp] = await db.insert(experiments).values({
        slug: input.slug,
        name: input.name,
        hypothesis: input.hypothesis ?? null,
        primaryMetric: input.primaryMetric,
        status: "draft",
      });

      const expId = Number(exp.insertId);

      for (const v of input.variants) {
        await db.insert(experimentVariants).values({
          experimentId: expId,
          name: v.name,
          label: v.label,
          trafficWeight: v.trafficWeight,
          config: v.config,
        });
      }

      return { id: expId };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(128).optional(),
      hypothesis: z.string().optional(),
      status: z.enum(["draft", "running", "paused", "winner", "archived"]).optional(),
      winnerVariantId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const update: Record<string, unknown> = {};
      if (input.name) update.name = input.name;
      if (input.hypothesis !== undefined) update.hypothesis = input.hypothesis;
      if (input.status) update.status = input.status;
      if (input.winnerVariantId) update.winnerVariantId = input.winnerVariantId;
      if (input.status === "running") update.startedAt = new Date();
      if (input.status === "winner" || input.status === "archived") update.endedAt = new Date();

      await db.update(experiments).set(update).where(eq(experiments.id, input.id));
      return { success: true };
    }),

  setStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "running", "paused", "winner", "archived"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const update: Record<string, unknown> = { status: input.status };
      if (input.status === "running") update.startedAt = new Date();
      if (input.status === "winner" || input.status === "archived") update.endedAt = new Date();

      await db.update(experiments).set(update).where(eq(experiments.id, input.id));
      return { success: true };
    }),

  providerClickStats: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      // Per-variant click stats from providerClickLogs + leads
      const leadCounts = await db
        .select({
          variant: leads.experimentVariant,
          total: sql<number>`COUNT(*)`,
        })
        .from(leads)
        .where(sql`${leads.experimentVariant} IS NOT NULL`)
        .groupBy(leads.experimentVariant);

      const clickStats = await db
        .select({
          variant: providerClickLogs.experimentVariant,
          totalClicks: sql<number>`COUNT(*)`,
          uniqueClickers: sql<number>`COUNT(DISTINCT ${providerClickLogs.publicId})`,
        })
        .from(providerClickLogs)
        .where(sql`${providerClickLogs.experimentVariant} IS NOT NULL`)
        .groupBy(providerClickLogs.experimentVariant);

      const allVariants = ["control", "verdict"];
      return allVariants.map((v) => {
        const lc = leadCounts.find((l) => l.variant === v);
        const cs = clickStats.find((c) => c.variant === v);
        const total = Number(lc?.total ?? 0);
        const clicks = Number(cs?.totalClicks ?? 0);
        const uniqueClickers = Number(cs?.uniqueClickers ?? 0);
        return {
          variant: v,
          totalLeads: total,
          totalClicks: clicks,
          uniqueClickers: uniqueClickers,
          clickRate: total ? (clicks / total) * 100 : 0,
          clicksPerClicker: uniqueClickers ? (clicks / uniqueClickers) : 0,
        };
      });
    }),
});
