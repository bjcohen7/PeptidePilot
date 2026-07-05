import { sql, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { matchProviders } from "../../shared/providerMatching";
import { QUIZ_QUESTION_COUNT } from "../../shared/quizConfig";
import { enqueueEmailSequence, enqueueBackfillCampaign } from "./queue";

// Only leads captured within this window get the standard "your match is ready"
// drip. Older (cold) shells are still healed + recovered, but with the gentler
// backfill_c ("we owe you your results") framing instead of the urgent drip —
// so a cron backlog/outage can never blast a stale sequence at old leads.
const WARM_ENQUEUE_HOURS = 96;

// Circuit breaker: a healthy system produces a trickle of shells (a rare
// transient enqueue miss). A large batch means something is broken upstream —
// healing them would auto-send email to many people on a bad assumption. Above
// this count we heal NONE, fire the alarm, and wait for a human.
const MAX_HEALS_PER_SWEEP = 10;

// Lead ids are nanoids. They flow into raw-SQL enqueue helpers (queue.ts), so
// validate the charset before any id is used — defense against a malformed id
// ever reaching an interpolated query. (Integer validation would be wrong here:
// ids are strings like "6QsM-lJ-DYZzky39UW37j".)
const LEAD_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// ─────────────────────────────────────────────
// Lead-capture leak: detect + self-heal + self-announce
//
// A "shell" lead is one where the email was captured but the pipeline never
// finished: provider_matches is NULL and/or the drip sequence was never
// enqueued. This used to happen when submitQuiz's best-effort post-insert
// steps failed silently on a transient DB blip. The insert is now atomic
// (provider_matches + variant land with the row), but a failed enqueue — or
// any future regression — can still strand a lead. This sweep is the safety
// net: it finds shells older than 1h, heals the scorable ones, and LOUDLY
// logs everything so the failure class can never again go unnoticed.
// ─────────────────────────────────────────────

export type ShellLead = {
  id: string;
  email: string;
  createdAt: Date;
  publicId: string | null;
  rawQuizData: unknown;
  nullMatches: boolean;
  noEmails: boolean;
  scorable: boolean;
};

const REAL_LEAD_SQL = `
  l.consentGiven = 1
  AND l.email NOT LIKE 'anonymous+%'
  AND l.email NOT LIKE '%@peptidepilot.local'
  AND l.email NOT LIKE '%@example.com'
  AND l.email <> 'test@test.com'
  AND l.email <> 'cohen.benjacob@gmail.com'
  AND (l.source IS NULL OR l.source NOT IN ('email_test', 'glp1_offramp'))
  AND (l.publicId IS NULL OR l.publicId NOT LIKE 'test-%')
`;

/**
 * Find real, consented leads captured >1h ago (and <30d, to stay in the warm
 * window) whose pipeline never completed: NULL provider_matches OR zero
 * email_queue rows. Read-only — powers both the admin alarm and the healer.
 */
export async function findShellLeads(): Promise<ShellLead[]> {
  const db = await getDb();
  if (!db) return [];

  const [raw] = await db.execute(sql.raw(`
    SELECT
      l.id, l.email, l.createdAt, l.publicId, l.rawQuizData,
      (l.provider_matches IS NULL) AS null_matches,
      (SELECT COUNT(*) FROM email_queue q WHERE q.lead_id = l.id) AS qrows
    FROM leads l
    WHERE l.createdAt <= NOW() - INTERVAL 1 HOUR
      AND l.createdAt >= NOW() - INTERVAL 30 DAY
      AND (l.quiz_stale IS NULL OR l.quiz_stale = 0)
      AND ${REAL_LEAD_SQL}
      AND (
        l.provider_matches IS NULL
        OR (SELECT COUNT(*) FROM email_queue q WHERE q.lead_id = l.id) = 0
      )
    ORDER BY l.createdAt ASC
  `));

  const rows = Array.isArray(raw) ? (Array.isArray(raw[0]) ? raw[0] : raw) : [];
  return (rows as any[]).map((r) => {
    const answers = Array.isArray(r.rawQuizData) ? r.rawQuizData : [];
    return {
      id: r.id,
      email: r.email,
      createdAt: new Date(r.createdAt),
      publicId: r.publicId ?? null,
      rawQuizData: r.rawQuizData,
      nullMatches: Number(r.null_matches) === 1,
      noEmails: Number(r.qrows) === 0,
      scorable: answers.length === QUIZ_QUESTION_COUNT,
    } as ShellLead;
  });
}

/**
 * Heal shell leads: compute provider_matches from their stored answers, assign
 * an experiment variant, backfill a publicId where missing, and (re)enqueue the
 * drip starting at email_0. Unscorable shells (answers that can't be scored)
 * are left for manual/retake handling and reported, never auto-sent with bad
 * data. Safe to run repeatedly — each step is guarded so nothing double-fires.
 */
export async function reconcileIncompleteLeads(): Promise<{
  scanned: number;
  healed: string[];
  cold: string[];
  unscorable: string[];
  circuitBroken: boolean;
}> {
  const db = await getDb();
  if (!db) return { scanned: 0, healed: [], cold: [], unscorable: [], circuitBroken: false };

  const shells = await findShellLeads();
  if (shells.length === 0) return { scanned: 0, healed: [], cold: [], unscorable: [], circuitBroken: false };

  // The leak alarm — this MUST be loud. If it fires, a capture path is broken.
  console.error(
    `[LeakAlarm] ${shells.length} shell lead(s) detected ` +
      `(email captured, pipeline incomplete): ${shells.map((s) => s.email).join(", ")}`
  );

  // Circuit breaker — refuse to mass-heal. A spike means an upstream regression;
  // auto-sending to everyone in it would compound the mistake. Heal nothing and
  // escalate.
  if (shells.length > MAX_HEALS_PER_SWEEP) {
    console.error(
      `[LeakAlarm] CIRCUIT BREAKER TRIPPED — ${shells.length} shells exceeds the ` +
        `${MAX_HEALS_PER_SWEEP}/sweep limit. Healing NONE; a human must investigate ` +
        `the capture pipeline before recovery runs.`
    );
    return { scanned: shells.length, healed: [], cold: [], unscorable: [], circuitBroken: true };
  }

  // Active providers, fetched once for the whole sweep.
  const [praw] = await db.execute(sql.raw(
    "SELECT slug, display_name, price_from_cents, meds_offered, cash_pay_friendly, sort_priority " +
      "FROM providers WHERE active = 1 ORDER BY sort_priority"
  ));
  const prows = Array.isArray(praw) ? (Array.isArray(praw[0]) ? praw[0] : praw) : [];
  const providers = (prows as any[]).map((p) => ({
    slug: p.slug,
    displayName: p.display_name,
    priceFromCents: p.price_from_cents,
    medsOffered: p.meds_offered,
    cashPayFriendly: !!p.cash_pay_friendly,
    sortPriority: p.sort_priority,
  }));

  const healed: string[] = [];
  const cold: string[] = [];
  const unscorable: string[] = [];

  for (const lead of shells) {
    try {
      // Guard the id before it reaches any raw-SQL enqueue helper downstream.
      if (!LEAD_ID_RE.test(lead.id)) {
        console.error(`[LeakAlarm] skipping lead with malformed id ${JSON.stringify(lead.id)} (${lead.email})`);
        continue;
      }

      // Unscorable answers = an older quiz version's shape. We can't compute a
      // current match, so we don't auto-send. Instead we tag quiz_stale so the
      // lead joins the Segment C backfill cohort (retake / "your answers need a
      // refresh") and stops re-alarming on every sweep.
      if (!lead.scorable) {
        await db.update(leads).set({ quizStale: true }).where(eq(leads.id, lead.id));
        unscorable.push(lead.email);
        console.error(
          `[LeakAlarm] lead ${lead.id} (${lead.email}) has unscorable answers ` +
            `(old quiz shape) — tagged quiz_stale for Segment C retake, not auto-sent`
        );
        continue;
      }

      const answers = (lead.rawQuizData as unknown[]).map((v) =>
        typeof v === "number" ? v : -1
      );

      // 1) Backfill matches + variant + publicId (only what's missing). This is
      //    always safe — it repairs data, sends nothing.
      if (lead.nullMatches || !lead.publicId) {
        const updateData: Record<string, unknown> = {};
        if (lead.nullMatches) {
          const scored = matchProviders(answers as number[], providers as any);
          const hash = lead.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
          updateData.providerMatches = scored;
          updateData.experimentVariant = hash % 2 === 0 ? "control" : "verdict";
        }
        if (!lead.publicId) updateData.publicId = nanoid(12);
        await db.update(leads).set(updateData).where(eq(leads.id, lead.id));
      }

      // 2) Enqueue recovery — warm leads get the standard drip from email_0;
      //    cold leads get a single gentle backfill_c ("we owe you your results").
      if (lead.noEmails) {
        const ageHours = (Date.now() - lead.createdAt.getTime()) / 3_600_000;
        if (ageHours <= WARM_ENQUEUE_HOURS) {
          await enqueueEmailSequence(lead.id, new Date());
          healed.push(lead.email);
          console.error(`[LeakAlarm] self-healed (warm drip) lead ${lead.id} (${lead.email})`);
        } else {
          await enqueueBackfillCampaign(lead.id, "backfill_c", lead.createdAt);
          cold.push(lead.email);
          console.error(
            `[LeakAlarm] self-healed (cold, backfill_c) lead ${lead.id} (${lead.email}) — ${Math.round(ageHours / 24)}d old`
          );
        }
      } else {
        // Matches were missing but the drip already existed — data repaired only.
        healed.push(lead.email);
        console.error(`[LeakAlarm] repaired matches (drip already queued) lead ${lead.id} (${lead.email})`);
      }
    } catch (err) {
      console.error(`[LeakAlarm] failed to heal lead ${lead.id} (${lead.email}):`, err);
    }
  }

  console.error(
    `[LeakAlarm] reconcile complete — scanned=${shells.length} warm=${healed.length} cold=${cold.length} unscorable=${unscorable.length}`
  );
  return { scanned: shells.length, healed, cold, unscorable, circuitBroken: false };
}
