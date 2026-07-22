/**
 * Telegram digest — daily 8pm-ET push plus on-demand period reports.
 *
 * Inbound commands (long-poll getUpdates, restricted to TELEGRAM_CHAT_ID,
 * silent on everything else):
 *   /t, /report, report → today so far        (vs same window yesterday)
 *   /w                  → last 7 days incl today  (vs prior 7 days)
 *   /m                  → last 30 days incl today (vs prior 30 days)
 *   /help               → one-line usage
 *
 * The 8pm cron is /t. All periods share one digest builder — only the window
 * is parameterized. Comparisons are always like-for-like (equal-length prior
 * window ending exactly one period earlier). The scheduled send is deduped
 * through a tiny digest_log table so a second container can never double-send.
 */
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { sendTelegramMessage } from "./_core/telegram";
import { getAdsInsights } from "./metaAds";

/** ET calendar date (YYYY-MM-DD) for a Date. */
function etDateStr(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return p.format(d);
}

const TZ = "America/New_York";
const SEND_HOUR_ET = 20; // 8pm

function etParts(d: Date) {
  const s = d.toLocaleString("en-US", { timeZone: TZ, hour12: false });
  const et = new Date(s);
  return { et, dateKey: d.toLocaleDateString("en-US", { timeZone: TZ }) };
}

const DAY_MS = 24 * 3600 * 1000;

/** Window covering the last `days` ET days including today, ending now; shift moves it back whole periods. */
function periodWindow(now: Date, days: number, periodsBack = 0): { start: Date; end: Date } {
  const { et } = etParts(now);
  const sinceMidnightMs = ((et.getHours() * 60 + et.getMinutes()) * 60 + et.getSeconds()) * 1000;
  const todayMidnightUtc = new Date(now.getTime() - sinceMidnightMs);
  const shift = periodsBack * days * DAY_MS;
  return {
    start: new Date(todayMidnightUtc.getTime() - (days - 1) * DAY_MS - shift),
    end: new Date(now.getTime() - shift),
  };
}

type WindowStats = {
  adClicks: number;
  adStart: number;
  adQuiz: number;
  handoffs: number;
  newLeads: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  sales: number;
  salesCents: number;
};

async function collect(start: Date, end: Date): Promise<WindowStats | null> {
  const db = await getDb();
  if (!db) return null;
  // Bounds are server-generated Dates (never user input) formatted to UTC DATETIME literals.
  const A = `'${start.toISOString().slice(0, 19).replace("T", " ")}'`;
  const B = `'${end.toISOString().slice(0, 19).replace("T", " ")}'`;
  const one = async (q: string) => {
    const res = (await db.execute(sql.raw(q))) as any;
    return Array.isArray(res) ? (Array.isArray(res[0]) ? res[0][0] : res[0]) : null;
  };

  const ads = await one(
    `SELECT COUNT(*) n,
            COALESCE(SUM(landingPath LIKE '/start%'),0) s,
            COALESCE(SUM(landingPath LIKE '/quiz%'),0) q
     FROM visitor_sessions
     WHERE utmMedium='paid' AND id NOT LIKE 'test-%' AND firstSeenAt >= ${A} AND firstSeenAt < ${B}`,
  );
  const ho = await one(
    `SELECT COUNT(DISTINCT public_id) n FROM provider_click_logs
     WHERE public_id NOT LIKE 'test-%' AND created_at >= ${A} AND created_at < ${B}`,
  );
  const ld = await one(
    `SELECT COUNT(*) n FROM leads
     WHERE email NOT LIKE 'anonymous+%' AND email NOT LIKE 'test-%' AND createdAt >= ${A} AND createdAt < ${B}`,
  );
  const em = await one(
    `SELECT
       (SELECT COUNT(*) FROM email_queue WHERE sent_at >= ${A} AND sent_at < ${B}) sent,
       (SELECT COUNT(*) FROM email_queue WHERE opened_at >= ${A} AND opened_at < ${B}) opened,
       (SELECT COUNT(*) FROM email_queue WHERE clicked_at >= ${A} AND clicked_at < ${B}) clicked`,
  );
  const sa = await one(
    `SELECT COUNT(*) n, COALESCE(SUM(amount_cents),0) cents FROM conversions
     WHERE occurred_at >= ${A} AND occurred_at < ${B}`,
  );

  return {
    adClicks: Number(ads?.n ?? 0),
    adStart: Number(ads?.s ?? 0),
    adQuiz: Number(ads?.q ?? 0),
    handoffs: Number(ho?.n ?? 0),
    newLeads: Number(ld?.n ?? 0),
    emailsSent: Number(em?.sent ?? 0),
    emailsOpened: Number(em?.opened ?? 0),
    emailsClicked: Number(em?.clicked ?? 0),
    sales: Number(sa?.n ?? 0),
    salesCents: Number(sa?.cents ?? 0),
  };
}

function arrow(today: number, yesterday: number): string {
  if (today > yesterday) return "↑";
  if (today < yesterday) return "↓";
  return "→";
}

export type DigestPeriod = "t" | "w" | "m";

const PERIODS: Record<DigestPeriod, { days: number; noun: string }> = {
  t: { days: 1, noun: "today" },
  w: { days: 7, noun: "this week" },
  m: { days: 30, noun: "this month" },
};

function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
}

function periodLabel(period: DigestPeriod, now: Date, start: Date): string {
  if (period === "t") {
    const time = now.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
    return `Today so far (as of ${time})`;
  }
  const sameMonth =
    start.toLocaleDateString("en-US", { timeZone: TZ, month: "short" }) ===
    now.toLocaleDateString("en-US", { timeZone: TZ, month: "short" });
  const range = `${fmtDay(start)}–${sameMonth ? now.toLocaleDateString("en-US", { timeZone: TZ, day: "numeric" }) : fmtDay(now)}`;
  return period === "w" ? `This week (${range})` : `This month (${range})`;
}

export async function buildDigest(period: DigestPeriod = "t", labelOverride?: string): Promise<string | null> {
  const now = new Date();
  const { days, noun } = PERIODS[period];
  const cur = periodWindow(now, days, 0);
  const prior = periodWindow(now, days, 1);
  const [stats, prev] = await Promise.all([collect(cur.start, cur.end), collect(prior.start, prior.end)]);
  if (!stats) return null;

  const db = await getDb();
  let listTotal = 0;
  if (db) {
    const res = (await db.execute(sql.raw(
      `SELECT COUNT(*) n FROM leads WHERE email NOT LIKE 'anonymous+%' AND email NOT LIKE 'test-%'`,
    ))) as any;
    const row = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0][0] : res[0]) : null;
    listTotal = Number(row?.n ?? 0);
  }

  const openPct = stats.emailsSent ? Math.round((stats.emailsOpened / stats.emailsSent) * 100) : 0;
  const priorNoun = period === "t" ? "yesterday" : period === "w" ? "prior 7 days" : "prior 30 days";

  const lines: string[] = [];
  if (stats.sales > 0) {
    lines.push(`\u{1F389} SALE${stats.sales > 1 ? "S" : ""}: ${stats.sales} · $${(stats.salesCents / 100).toFixed(2)}`);
  }
  lines.push(`\u{1F4CA} ${labelOverride ?? periodLabel(period, now, cur.start)}`);
  lines.push(`\u{1F4B8} Ad clicks: ${stats.adClicks} (${stats.adStart} → /start, ${stats.adQuiz} → /quiz)`);
  // Spend from the Marketing API; leads from OUR DB (our count is truth, Meta's is attribution).
  const ins = await getAdsInsights(etDateStr(cur.start), etDateStr(now));
  if (ins) {
    const perLead = stats.newLeads > 0 ? ` · $${(ins.spend / stats.newLeads).toFixed(2)} per lead` : "";
    lines.push(`\u{1F4B8} Spent: $${ins.spend.toFixed(2)}${perLead}`);
  } else {
    lines.push(`\u{1F4B8} Spent: n/a`);
  }
  lines.push(`\u{1F309} Sent to providers: ${stats.handoffs} people`);
  lines.push(
    period === "t"
      ? `\u{1F4E5} New leads: ${stats.newLeads} (list now ${listTotal.toLocaleString("en-US")})`
      : `\u{1F4E5} New leads: +${stats.newLeads} ${noun} · list now ${listTotal.toLocaleString("en-US")}`,
  );
  lines.push(`\u{1F4E7} Emails: ${stats.emailsSent} sent · ${openPct}% opened · ${stats.emailsClicked} clicked`);
  if (stats.sales === 0) lines.push(`\u{1F4B0} Sales: 0 ($0)`);
  if (prev) {
    lines.push(
      `vs ${priorNoun}: clicks ${arrow(stats.adClicks, prev.adClicks)}, handoffs ${arrow(stats.handoffs, prev.handoffs)}, leads ${arrow(stats.newLeads, prev.newLeads)}`,
    );
  }
  if (stats.adClicks === 0) lines.push(`⚠️ no ad clicks logged — check ads.`);
  if (stats.emailsSent === 0) lines.push(`⚠️ no emails sent ${noun} — check the email cron.`);

  return lines.join("\n");
}

/** /ads [w] — per-ad table: Meta spend/clicks joined with OUR sessions+handoffs via utm_content=ad_id. */
export async function buildAdsReport(period: "t" | "w" = "t"): Promise<string> {
  const now = new Date();
  const days = period === "w" ? 7 : 1;
  const cur = periodWindow(now, days, 0);
  const ins = await getAdsInsights(etDateStr(cur.start), etDateStr(now));
  if (!ins) return "Ads data n/a — set META_ADS_TOKEN + META_AD_ACCOUNT_ID (or token expired).";

  // Our DB per ad id (utm_content): sessions + handoffs (bridge via session id, results via lead publicId).
  const db = await getDb();
  const bySession = new Map<string, { sessions: number; handoffs: number }>();
  if (db) {
    const A = `'${cur.start.toISOString().slice(0, 19).replace("T", " ")}'`;
    const B = `'${cur.end.toISOString().slice(0, 19).replace("T", " ")}'`;
    const res = (await db.execute(sql.raw(
      `SELECT vs.utmContent ad,
              COUNT(DISTINCT vs.id) sessions,
              COUNT(DISTINCT pcl.public_id) handoffs
       FROM visitor_sessions vs
       LEFT JOIN leads l ON l.sessionId = vs.id
       LEFT JOIN provider_click_logs pcl
         ON (pcl.public_id = vs.id OR pcl.public_id = l.publicId)
        AND pcl.created_at >= ${A} AND pcl.created_at < ${B}
       WHERE vs.utmMedium='paid' AND vs.id NOT LIKE 'test-%'
         AND vs.firstSeenAt >= ${A} AND vs.firstSeenAt < ${B}
       GROUP BY vs.utmContent`,
    ))) as any;
    const rows = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : [];
    for (const r of rows) if (r.ad) bySession.set(String(r.ad), { sessions: Number(r.sessions), handoffs: Number(r.handoffs) });
  }

  const label = period === "w" ? `This week (${fmtDay(cur.start)}–${fmtDay(now)})` : `Today (${fmtDay(now)})`;
  const lines = [`\u{1F4E3} Ads — ${label}`];
  for (const ad of ins.ads.slice(0, 8)) {
    const ours = bySession.get(ad.adId);
    const name = ad.adName.length > 20 ? ad.adName.slice(0, 19) + "…" : ad.adName;
    lines.push(`${name} · $${ad.spend.toFixed(0)} · ${ad.linkClicks} clicks · ${ours?.sessions ?? 0} sessions · ${ours?.handoffs ?? 0} handoffs`);
  }
  if (ins.ads.length === 0) lines.push("(no ads with delivery in this window)");
  lines.push(`Total: $${ins.spend.toFixed(2)} · CPM $${ins.cpm.toFixed(2)}`);
  return lines.slice(0, 12).join("\n");
}

export async function sendDailyDigest(labelOverride?: string): Promise<void> {
  try {
    const msg = await buildDigest("t", labelOverride);
    if (msg) await sendTelegramMessage(msg);
  } catch (err) {
    console.error("[Digest] failed:", err);
  }
}

/** DB-side dedupe so the 8pm send fires once even with multiple containers. */
async function claimScheduledSend(dateKey: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true; // no DB → fall back to in-memory guard only
  try {
    await db.execute(sql.raw(
      `CREATE TABLE IF NOT EXISTS \`digest_log\` (\`day\` varchar(16) NOT NULL, PRIMARY KEY (\`day\`))
       ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
    ));
    await db.execute(sql.raw(`INSERT INTO \`digest_log\` (\`day\`) VALUES ('${dateKey.replace(/[^0-9/\-]/g, "")}')`));
    return true;
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY" || err?.errno === 1062 || err?.cause?.errno === 1062) return false;
    console.error("[Digest] claim error (sending anyway):", err?.code ?? err);
    return true;
  }
}

let _timer: ReturnType<typeof setInterval> | null = null;
let _lastSentKey = "";

export function startDigestCron() {
  if (_timer) return;
  console.log(`[Digest] Daily digest scheduled for ${SEND_HOUR_ET}:00 ${TZ}`);
  _timer = setInterval(() => {
    const now = new Date();
    const { et, dateKey } = etParts(now);
    if (et.getHours() === SEND_HOUR_ET && _lastSentKey !== dateKey) {
      _lastSentKey = dateKey;
      void (async () => {
        if (await claimScheduledSend(dateKey)) await sendDailyDigest();
      })();
    }
  }, 60 * 1000);
  if (_timer.unref) _timer.unref();

  startCommandPoller();
}

// ── Inbound commands (long-poll) ────────────────────────────────────────────
let _polling = false;
let _offset = 0;

function startCommandPoller() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || _polling) return;
  _polling = true;
  console.log("[Digest] Telegram command poller started (/t /w /m /help)");
  void pollLoop(token, chatId);
}

async function pollLoop(token: string, chatId: string) {
  for (;;) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?timeout=25&offset=${_offset}&allowed_updates=%5B%22message%22%5D`,
      );
      if (res.status === 409) {
        // Another poller instance owns getUpdates; back off and retry quietly.
        await new Promise((r) => setTimeout(r, 30_000));
        continue;
      }
      const body = (await res.json()) as { ok: boolean; result?: Array<{ update_id: number; message?: { chat?: { id: number }; text?: string } }> };
      for (const u of body.result ?? []) {
        _offset = u.update_id + 1;
        const msg = u.message;
        if (!msg?.text || String(msg.chat?.id) !== String(chatId)) continue; // silence for anyone else
        const parts = msg.text.trim().toLowerCase().replace(/^\//, "").replace(/@\w+/, "").split(/\s+/);
        const cmd = parts[0];
        if (cmd === "ads") {
          await sendTelegramMessage(await buildAdsReport(parts[1] === "w" ? "w" : "t"));
        } else if (cmd === "t" || cmd === "report") {
          const out = await buildDigest("t");
          if (out) await sendTelegramMessage(out);
        } else if (cmd === "w") {
          const out = await buildDigest("w");
          if (out) await sendTelegramMessage(out);
        } else if (cmd === "m") {
          const out = await buildDigest("m");
          if (out) await sendTelegramMessage(out);
        } else if (cmd === "help") {
          await sendTelegramMessage("/t today · /w week · /m month · /ads ad spend (add w for week)");
        }
        // anything else: stay silent
      }
    } catch (err) {
      console.error("[Digest] poll error:", err);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
}
