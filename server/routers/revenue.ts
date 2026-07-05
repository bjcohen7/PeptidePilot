import { z } from "zod";
import { sql } from "drizzle-orm";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { conversions } from "../../drizzle/schema";
import { cancelSequenceForLead } from "../email/queue";
import { parseSubid, computeDedupe } from "../lib/subid";

function extractRows<T = any>(result: unknown): T[] {
  if (Array.isArray(result)) return (Array.isArray(result[0]) ? result[0] : result) as T[];
  return [];
}
const num = (v: unknown) => Number(v ?? 0);
const esc = (s: string) => s.replace(/'/g, "''");

// ─────────────────────────────────────────────
// Time-period window (mirrors the sessions dashboard's selector, plus custom).
// ─────────────────────────────────────────────
const periodEnum = z.enum(["today", "yesterday", "last7", "last30", "all", "custom"]);
const periodInput = z
  .object({
    range: periodEnum.default("last7"),
    from: z.string().optional(), // ISO date (yyyy-mm-dd) — custom only
    to: z.string().optional(),
  })
  .default({ range: "last7" });
type PeriodInput = z.infer<typeof periodInput>;
type Window = { start: Date | null; end: Date | null }; // end is exclusive

// Same day-boundary logic as analytics.timeConditions so the two dashboards agree.
function resolveWindow(p: PeriodInput): Window {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (p.range) {
    case "all":
      return { start: null, end: null };
    case "today":
      return { start: todayStart, end: null };
    case "yesterday":
      return { start: new Date(todayStart.getTime() - 86400000), end: todayStart };
    case "last7":
      return { start: new Date(now.getTime() - 7 * 86400000), end: null };
    case "last30":
      return { start: new Date(now.getTime() - 30 * 86400000), end: null };
    case "custom": {
      const s = p.from ? new Date(p.from) : null;
      // 'to' is inclusive of that whole day → +1 day for an exclusive upper bound.
      const eRaw = p.to ? new Date(p.to) : null;
      const e = eRaw && !isNaN(eRaw.getTime()) ? new Date(eRaw.getTime() + 86400000) : null;
      return {
        start: s && !isNaN(s.getTime()) ? s : null,
        end: e,
      };
    }
    default:
      return { start: null, end: null };
  }
}

// The prior equal-length window, for delta hints. Only defined for the ranges
// where a "previous period" is unambiguous.
function priorWindow(p: PeriodInput): Window | null {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (p.range) {
    case "today":
      return { start: new Date(todayStart.getTime() - 86400000), end: todayStart };
    case "last7":
      return { start: new Date(now.getTime() - 14 * 86400000), end: new Date(now.getTime() - 7 * 86400000) };
    case "last30":
      return { start: new Date(now.getTime() - 60 * 86400000), end: new Date(now.getTime() - 30 * 86400000) };
    default:
      return null;
  }
}

const fmtDT = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
const fmtDay = (d: Date) => d.toISOString().slice(0, 10);

/** SQL fragment like " AND c.occurred_at >= '...' AND c.occurred_at < '...'". */
function windowSql(col: string, w: Window): string {
  let s = "";
  if (w.start) s += ` AND ${col} >= '${fmtDT(w.start)}'`;
  if (w.end) s += ` AND ${col} < '${fmtDT(w.end)}'`;
  return s;
}

export const revenueRouter = router({
  /**
   * Headline totals for the selected window + the prior-period delta (when the
   * range has an unambiguous previous period). Revenue/conversions use
   * conversions.occurred_at; clicks use provider_click_logs.created_at.
   */
  summary: adminProcedure.input(periodInput).query(async ({ input }) => {
    const db = await getDb();
    const empty = { revenueCents: 0, conversions: 0, clicks: 0, epcCents: 0, prior: null as null | { revenueCents: number; conversions: number } };
    if (!db) return empty;

    const totalsFor = async (w: Window) => {
      const cRows = extractRows(await db.execute(sql.raw(
        `SELECT COUNT(*) AS conversions, COALESCE(SUM(amount_cents),0) AS revenueCents FROM conversions c WHERE 1=1${windowSql("c.occurred_at", w)}`
      )));
      const kRows = extractRows(await db.execute(sql.raw(
        `SELECT COUNT(*) AS clicks FROM provider_click_logs pcl WHERE 1=1${windowSql("pcl.created_at", w)}`
      )));
      const conversions = num((cRows[0] as any)?.conversions);
      const revenueCents = num((cRows[0] as any)?.revenueCents);
      const clicks = num((kRows[0] as any)?.clicks);
      return { conversions, revenueCents, clicks };
    };

    const cur = await totalsFor(resolveWindow(input));
    const pw = priorWindow(input);
    const prior = pw ? await totalsFor(pw) : null;

    return {
      revenueCents: cur.revenueCents,
      conversions: cur.conversions,
      clicks: cur.clicks,
      epcCents: cur.clicks ? Math.round(cur.revenueCents / cur.clicks) : 0,
      prior: prior ? { revenueCents: prior.revenueCents, conversions: prior.conversions } : null,
    };
  }),

  /** Revenue + conversions by day for the window — powers the trend strip. */
  trend: adminProcedure.input(periodInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { days: [] as { date: string; conversions: number; revenueCents: number }[] };
    const w = resolveWindow(input);

    const rows = extractRows(await db.execute(sql.raw(
      `SELECT DATE(c.occurred_at) AS d, COUNT(*) AS conversions, COALESCE(SUM(c.amount_cents),0) AS revenueCents
       FROM conversions c WHERE 1=1${windowSql("c.occurred_at", w)}
       GROUP BY d ORDER BY d ASC`
    )));
    const byDay = new Map<string, { conversions: number; revenueCents: number }>();
    for (const r of rows as any[]) {
      const key = typeof r.d === "string" ? r.d.slice(0, 10) : fmtDay(new Date(r.d));
      byDay.set(key, { conversions: num(r.conversions), revenueCents: num(r.revenueCents) });
    }

    // Fill the contiguous day range so the strip has no gaps.
    let startDay = w.start;
    if (!startDay) {
      const first = (rows[0] as any)?.d;
      startDay = first ? new Date(first) : new Date(Date.now() - 7 * 86400000);
    }
    const endExclusive = w.end ?? new Date(Date.now() + 86400000);
    const days: { date: string; conversions: number; revenueCents: number }[] = [];
    const cursor = new Date(Date.UTC(startDay.getUTCFullYear(), startDay.getUTCMonth(), startDay.getUTCDate()));
    const guard = 400; // hard cap so an "all"/huge-custom window can't explode
    while (cursor < endExclusive && days.length < guard) {
      const key = fmtDay(cursor);
      const hit = byDay.get(key);
      days.push({ date: key, conversions: hit?.conversions ?? 0, revenueCents: hit?.revenueCents ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return { days };
  }),

  /** Per-provider: clicks, conversions, conversion rate, revenue, EPC — windowed. */
  perProvider: adminProcedure.input(periodInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const w = resolveWindow(input);
    const rows = extractRows(await db.execute(sql.raw(`
      SELECT p.slug AS providerSlug, p.display_name AS displayName,
        (SELECT COUNT(*) FROM provider_click_logs pcl WHERE pcl.provider_slug = p.slug${windowSql("pcl.created_at", w)}) AS clicks,
        (SELECT COUNT(*) FROM conversions c WHERE c.provider_slug = p.slug${windowSql("c.occurred_at", w)}) AS conversions,
        (SELECT COALESCE(SUM(c.amount_cents),0) FROM conversions c WHERE c.provider_slug = p.slug${windowSql("c.occurred_at", w)}) AS revenueCents
      FROM providers p
      ORDER BY revenueCents DESC, clicks DESC
    `)));
    return rows.map((r: any) => {
      const clicks = num(r.clicks), convs = num(r.conversions), revenueCents = num(r.revenueCents);
      return {
        providerSlug: r.providerSlug,
        displayName: r.displayName,
        clicks,
        conversions: convs,
        conversionRate: clicks ? convs / clicks : 0,
        revenueCents,
        epcCents: clicks ? Math.round(revenueCents / clicks) : 0,
      };
    });
  }),

  /** Per acquisition source: revenue by utm_campaign / utm_content and entry surface — windowed. */
  perSource: adminProcedure.input(periodInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const w = resolveWindow(input);
    // One session per conversion (earliest with the lead) to avoid revenue fan-out.
    const rows = extractRows(await db.execute(sql.raw(`
      SELECT COALESCE(vs.utmCampaign,'(none)') AS utmCampaign,
             COALESCE(vs.utmContent,'(none)') AS utmContent,
             COALESCE(vs.source_surface,'unknown') AS entrySurface,
             COUNT(*) AS conversions,
             COALESCE(SUM(c.amount_cents),0) AS revenueCents
      FROM conversions c
      JOIN leads l ON l.id = c.lead_id
      LEFT JOIN visitor_sessions vs ON vs.id = (
        SELECT vs2.id FROM visitor_sessions vs2 WHERE vs2.leadId = l.id ORDER BY vs2.firstSeenAt ASC LIMIT 1
      )
      WHERE 1=1${windowSql("c.occurred_at", w)}
      GROUP BY utmCampaign, utmContent, entrySurface
      ORDER BY revenueCents DESC
    `)));
    return rows.map((r: any) => ({
      utmCampaign: r.utmCampaign,
      utmContent: r.utmContent,
      entrySurface: r.entrySurface,
      conversions: num(r.conversions),
      revenueCents: num(r.revenueCents),
    }));
  }),

  /**
   * Attribution split. Heuristic (documented in LEG-6-REPORT): a conversion is
   * "email_attributed" when the lead clicked an email (email_queue.clicked_at)
   * at/before the conversion time; otherwise "same_session". Unresolved subids
   * (no lead) are their own bucket. Windowed by conversion time.
   */
  attribution: adminProcedure.input(periodInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { buckets: [] as { bucket: string; conversions: number; revenueCents: number }[] };
    const w = resolveWindow(input);
    const rows = extractRows(await db.execute(sql.raw(`
      SELECT
        CASE
          WHEN c.lead_id IS NULL THEN 'unresolved'
          WHEN EXISTS (SELECT 1 FROM email_queue eq WHERE eq.lead_id = c.lead_id
                        AND eq.clicked_at IS NOT NULL AND eq.clicked_at <= c.occurred_at)
               THEN 'email_attributed'
          ELSE 'same_session'
        END AS bucket,
        COUNT(*) AS conversions,
        COALESCE(SUM(c.amount_cents),0) AS revenueCents
      FROM conversions c
      WHERE 1=1${windowSql("c.occurred_at", w)}
      GROUP BY bucket
    `)));
    return { buckets: rows.map((r: any) => ({ bucket: r.bucket, conversions: num(r.conversions), revenueCents: num(r.revenueCents) })) };
  }),

  /** Lead-quality hint: quiz-answer distributions for converting vs non-converting leads. Windowed by lead creation. */
  leadQuality: adminProcedure.input(periodInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return { goal: [], insurance: [], budget: [] };
    const w = resolveWindow(input);
    // QUIZ_INDEX: PRIMARY_GOAL=0, GLP1_INSURANCE=6, BUDGET=19.
    const dist = async (idx: number) => extractRows(await db.execute(sql.raw(`
      SELECT
        CASE WHEN cv.lead_id IS NOT NULL THEN 'converting' ELSE 'non_converting' END AS cohort,
        JSON_EXTRACT(l.rawQuizData, '$[${idx}]') AS answerIndex,
        COUNT(*) AS n
      FROM leads l
      LEFT JOIN (SELECT DISTINCT lead_id FROM conversions WHERE lead_id IS NOT NULL) cv ON cv.lead_id = l.id
      WHERE l.email NOT LIKE 'anonymous+%' AND JSON_LENGTH(l.rawQuizData) = 22${windowSql("l.createdAt", w)}
      GROUP BY cohort, answerIndex
      ORDER BY cohort, answerIndex
    `))).map((r: any) => ({ cohort: r.cohort, answerIndex: r.answerIndex, n: num(r.n) }));
    return { goal: await dist(0), insurance: await dist(6), budget: await dist(19) };
  }),

  /**
   * Alerting: conversions whose subid has no logged click, or whose
   * click→conversion gap exceeds the cookie window, plus outstanding shell
   * leads. Operational (current state) — intentionally NOT windowed.
   */
  alerts: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { noClick: [], staleGap: [], shellLeads: [] };
    const noClick = extractRows(await db.execute(sql.raw(`
      SELECT c.id, c.subid, c.provider_slug AS providerSlug, c.occurred_at AS occurredAt,
             c.amount_cents AS amountCents, (c.lead_id IS NOT NULL) AS resolved
      FROM conversions c
      WHERE NOT EXISTS (
        SELECT 1 FROM provider_click_logs pcl
        WHERE CONCAT(pcl.public_id, '-', pcl.provider_slug) = c.subid
      )
      ORDER BY c.occurred_at DESC
      LIMIT 100
    `))).map((r: any) => ({ ...r, amountCents: r.amountCents == null ? null : num(r.amountCents), resolved: Boolean(num(r.resolved)) }));

    const staleGap = extractRows(await db.execute(sql.raw(`
      SELECT c.id, c.subid, c.provider_slug AS providerSlug, c.occurred_at AS occurredAt,
             TIMESTAMPDIFF(DAY,
               (SELECT MAX(pcl.created_at) FROM provider_click_logs pcl
                WHERE CONCAT(pcl.public_id,'-',pcl.provider_slug) = c.subid), c.occurred_at) AS gapDays,
             COALESCE(p.cookie_window_days, 30) AS windowDays
      FROM conversions c
      LEFT JOIN providers p ON p.slug = c.provider_slug
      HAVING gapDays IS NOT NULL AND gapDays > windowDays
      ORDER BY gapDays DESC
      LIMIT 100
    `))).map((r: any) => ({ id: num(r.id), subid: r.subid, providerSlug: r.providerSlug, gapDays: num(r.gapDays), windowDays: num(r.windowDays) }));

    // Lead-capture leak: real, consented leads >1h old where the pipeline never
    // finished (NULL provider_matches or zero queued emails). The email cron
    // self-heals these hourly; this surfaces any currently outstanding so the
    // failure class is visible in the admin, not just the logs.
    const shellLeads = extractRows(await db.execute(sql.raw(`
      SELECT l.id, l.email, l.createdAt,
             (l.provider_matches IS NULL) AS nullMatches,
             ((SELECT COUNT(*) FROM email_queue q WHERE q.lead_id = l.id) = 0) AS noEmails
      FROM leads l
      WHERE l.createdAt <= NOW() - INTERVAL 1 HOUR
        AND l.createdAt >= NOW() - INTERVAL 30 DAY
        AND (l.quiz_stale IS NULL OR l.quiz_stale = 0)
        AND l.consentGiven = 1
        AND l.email NOT LIKE 'anonymous+%'
        AND l.email NOT LIKE '%@peptidepilot.local'
        AND l.email NOT LIKE '%@example.com'
        AND l.email <> 'test@test.com'
        AND l.email <> 'cohen.benjacob@gmail.com'
        AND (l.source IS NULL OR l.source NOT IN ('email_test', 'glp1_offramp'))
        AND (l.publicId IS NULL OR l.publicId NOT LIKE 'test-%')
        AND (
          l.provider_matches IS NULL
          OR (SELECT COUNT(*) FROM email_queue q WHERE q.lead_id = l.id) = 0
        )
      ORDER BY l.createdAt DESC
      LIMIT 100
    `))).map((r: any) => ({
      id: r.id,
      email: r.email,
      createdAt: r.createdAt,
      nullMatches: Boolean(num(r.nullMatches)),
      noEmails: Boolean(num(r.noEmails)),
    }));

    return { noClick, staleGap, shellLeads };
  }),

  /** Recent conversions (for the admin table; unresolved subids are flagged) — windowed. */
  recent: adminProcedure.input(periodInput).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    const w = resolveWindow(input);
    return extractRows(await db.execute(sql.raw(`
      SELECT c.id, c.subid, c.lead_id AS leadId, c.provider_slug AS providerSlug,
             c.amount_cents AS amountCents, c.occurred_at AS occurredAt, c.source,
             c.conversion_type AS conversionType, c.needs_review AS needsReview,
             c.transaction_id AS transactionId, l.email
      FROM conversions c
      LEFT JOIN leads l ON l.id = c.lead_id
      WHERE 1=1${windowSql("c.occurred_at", w)}
      ORDER BY c.occurred_at DESC
      LIMIT 100
    `))).map((r: any) => ({
      id: num(r.id), subid: r.subid, leadId: r.leadId, providerSlug: r.providerSlug,
      amountCents: r.amountCents == null ? null : num(r.amountCents),
      occurredAt: r.occurredAt, source: r.source, email: r.email ?? null,
      conversionType: r.conversionType ?? "unknown",
      needsReview: Boolean(num(r.needsReview)),
      transactionId: r.transactionId ?? null,
      resolved: Boolean(r.leadId),
    }));
  }),

  /** Manual conversion entry — same table, source='manual'. */
  createManual: adminProcedure
    .input(z.object({
      providerSlug: z.string().min(1).max(64),
      subid: z.string().max(128).optional(),
      leadEmail: z.string().email().optional(),
      amountDollars: z.number().nonnegative().optional(),
      date: z.string().optional(), // ISO; defaults to now
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let subid = input.subid?.trim() || "";
      let leadId: string | null = null;

      if (subid) {
        // Provider is known here (admin selected it) — match the subid suffix against it.
        const parsed = parseSubid(subid, [input.providerSlug]);
        if (parsed) {
          const rows = extractRows(await db.execute(sql.raw(
            `SELECT id FROM leads WHERE publicId = '${esc(parsed.publicId)}' LIMIT 1`
          )));
          leadId = (rows[0] as any)?.id ?? null;
        }
      } else if (input.leadEmail) {
        const rows = extractRows(await db.execute(sql.raw(
          `SELECT id, publicId FROM leads WHERE email = '${esc(input.leadEmail)}' ORDER BY createdAt DESC LIMIT 1`
        )));
        const lead = rows[0] as any;
        if (lead) {
          leadId = lead.id;
          subid = `${lead.publicId}-${input.providerSlug}`;
        }
      }
      if (!subid) throw new Error("Provide a subid or a lead email that resolves to a lead.");

      const amountCents = input.amountDollars != null ? Math.round(input.amountDollars * 100) : null;
      const occurredAt = input.date ? new Date(input.date) : new Date();
      if (isNaN(occurredAt.getTime())) throw new Error("Invalid date.");

      // Manual entries are namespaced ("man") so they never collide with postback
      // keys; idempotent on (provider_slug, dedupe_key) at the minute granularity.
      const { dedupeKey } = computeDedupe({ subid, occurredAt, keyspace: "man" });

      try {
        await db.insert(conversions).values({
          subid,
          leadId,
          providerSlug: input.providerSlug,
          amountCents,
          occurredAt,
          source: "manual",
          transactionId: null,
          conversionType: "initial",
          dedupeKey,
          needsReview: false,
          rawPayload: { manual: true },
        });
      } catch (err: any) {
        // Idempotent on (subid, occurred_at) — surface a friendly duplicate message.
        const code = err?.code ?? err?.cause?.code;
        if (code === "ER_DUP_ENTRY" || err?.errno === 1062 || err?.cause?.errno === 1062) {
          return { success: false, duplicate: true, subid, leadId } as const;
        }
        console.error("[Revenue] manual insert error:", err?.sqlMessage || err?.message, err?.cause?.sqlMessage);
        throw err;
      }

      if (leadId) {
        try { await cancelSequenceForLead(leadId); } catch (e: any) { console.error("[Revenue] cancelSequenceForLead failed:", e?.message); }
      }
      return { success: true, subid, leadId, resolved: Boolean(leadId) } as const;
    }),
});
