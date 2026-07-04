import { sql, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { matchProviders } from "../../shared/providerMatching";
import { QUIZ_QUESTION_COUNT } from "../../shared/quizConfig";
import { enqueueEmailSequence } from "./queue";

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
  unscorable: string[];
}> {
  const db = await getDb();
  if (!db) return { scanned: 0, healed: [], unscorable: [] };

  const shells = await findShellLeads();
  if (shells.length === 0) return { scanned: 0, healed: [], unscorable: [] };

  // The leak alarm — this MUST be loud. If it fires, a capture path is broken.
  console.error(
    `[LeakAlarm] ${shells.length} shell lead(s) detected ` +
      `(email captured, pipeline incomplete): ${shells.map((s) => s.email).join(", ")}`
  );

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
  const unscorable: string[] = [];

  for (const lead of shells) {
    try {
      if (!lead.scorable) {
        unscorable.push(lead.email);
        console.error(
          `[LeakAlarm] lead ${lead.id} (${lead.email}) has unscorable answers ` +
            `— needs manual review / retake flow, NOT auto-healed`
        );
        continue;
      }

      const answers = (lead.rawQuizData as unknown[]).map((v) =>
        typeof v === "number" ? v : -1
      );

      // 1) Backfill matches + variant + publicId (only what's missing).
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

      // 2) (Re)enqueue the drip from email_0, restarting the cadence from now.
      if (lead.noEmails) {
        await enqueueEmailSequence(lead.id, new Date());
      }

      healed.push(lead.email);
      console.error(`[LeakAlarm] self-healed lead ${lead.id} (${lead.email})`);
    } catch (err) {
      console.error(`[LeakAlarm] failed to heal lead ${lead.id} (${lead.email}):`, err);
    }
  }

  console.error(
    `[LeakAlarm] reconcile complete — scanned=${shells.length} healed=${healed.length} unscorable=${unscorable.length}`
  );
  return { scanned: shells.length, healed, unscorable };
}
