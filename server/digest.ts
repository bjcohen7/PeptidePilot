/**
 * Daily Telegram digest — one plain-English message at 8:00pm ET summarizing
 * TODAY (midnight ET → send time) vs the SAME window yesterday (honest
 * partial-vs-partial comparison, not today-partial vs yesterday-full).
 *
 * Scheduling follows the email-cron pattern: a setInterval ticker + ET
 * wall-clock check via toLocaleString (DST-aware), with a sent-today guard so
 * restarts don't double-send. Fire-and-forget; a digest failure never affects
 * the app.
 */
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { sendTelegramMessage } from "./_core/telegram";

const TZ = "America/New_York";
const SEND_HOUR_ET = 20; // 8pm

function etParts(d: Date) {
  const s = d.toLocaleString("en-US", { timeZone: TZ, hour12: false });
  const et = new Date(s);
  return { et, dateKey: d.toLocaleDateString("en-US", { timeZone: TZ }) };
}

/** UTC Date for ET-midnight `daysAgo` days back, plus the same-time-of-day end bound. */
function etWindow(now: Date, daysAgo: number): { start: Date; end: Date } {
  const { et } = etParts(now);
  const sinceMidnightMs =
    ((et.getHours() * 60 + et.getMinutes()) * 60 + et.getSeconds()) * 1000;
  const todayMidnightUtc = new Date(now.getTime() - sinceMidnightMs);
  const dayMs = 24 * 3600 * 1000;
  return {
    start: new Date(todayMidnightUtc.getTime() - daysAgo * dayMs),
    end: new Date(now.getTime() - daysAgo * dayMs),
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

export async function buildDigest(label?: string): Promise<string | null> {
  const now = new Date();
  const w0 = etWindow(now, 0);
  const w1 = etWindow(now, 1);
  const [today, yest] = await Promise.all([collect(w0.start, w0.end), collect(w1.start, w1.end)]);
  if (!today) return null;

  const db = await getDb();
  let listTotal = 0;
  if (db) {
    const res = (await db.execute(sql.raw(
      `SELECT COUNT(*) n FROM leads WHERE email NOT LIKE 'anonymous+%' AND email NOT LIKE 'test-%'`,
    ))) as any;
    const row = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0][0] : res[0]) : null;
    listTotal = Number(row?.n ?? 0);
  }

  const dateStr = now.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" });
  const openPct = today.emailsSent ? Math.round((today.emailsOpened / today.emailsSent) * 100) : 0;

  const lines: string[] = [];
  if (today.sales > 0) {
    lines.push(`\u{1F389} SALE${today.sales > 1 ? "S" : ""}: ${today.sales} · $${(today.salesCents / 100).toFixed(2)}`);
  }
  lines.push(`\u{1F4CA} ${label ? label : `Today (${dateStr})`}`);
  lines.push(`\u{1F4B8} Ad clicks: ${today.adClicks} (${today.adStart} → /start, ${today.adQuiz} → /quiz)`);
  lines.push(`\u{1F309} Sent to providers: ${today.handoffs} people`);
  lines.push(`\u{1F4E5} New leads: ${today.newLeads} (list now ${listTotal.toLocaleString("en-US")})`);
  lines.push(`\u{1F4E7} Emails: ${today.emailsSent} sent · ${openPct}% opened · ${today.emailsClicked} clicked`);
  if (today.sales === 0) lines.push(`\u{1F4B0} Sales: 0 ($0)`);
  if (yest) {
    lines.push(
      `vs yesterday: clicks ${arrow(today.adClicks, yest.adClicks)}, handoffs ${arrow(today.handoffs, yest.handoffs)}, leads ${arrow(today.newLeads, yest.newLeads)}`,
    );
  }
  // Broken-looking signals — one plain line each.
  if (today.adClicks === 0) lines.push(`⚠️ no ad clicks logged — check ads.`);
  if (today.emailsSent === 0) lines.push(`⚠️ no emails sent today — check the email cron.`);

  return lines.join("\n");
}

export async function sendDailyDigest(label?: string): Promise<void> {
  try {
    const msg = await buildDigest(label);
    if (msg) await sendTelegramMessage(msg);
  } catch (err) {
    console.error("[Digest] failed:", err);
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
      void sendDailyDigest();
    }
  }, 60 * 1000);
  if (_timer.unref) _timer.unref();
}
