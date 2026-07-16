import "dotenv/config";
import compression from "compression";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { ensureAffiliateWorkspaceSchema, ensureExperimentSchema } from "../db";
import { checkProviderFloorConsistency } from "../lib/providerFloorCheck";
import { isGone410 } from "../../shared/seoPruneList";
import { redirectTarget } from "../../shared/seoRedirects";
import { isInAppBrowser } from "../../shared/inAppBrowser";
import { sendTelegramMessage } from "./telegram";
import { createContext } from "./context";
import { ENV } from "./env";
import { recordClickEvent, recordFunnelEvent, recordPageView, startVisitorSession } from "../routers/analytics";
import { providers, providerClickLogs, leads, visitorSessions } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { serveStatic, setupVite } from "./vite";

// ── Homepage direct-flow (/go-direct/:provider) ────────────────────────────
// Per-provider outbound destination for the homepage direct experiment. subid is
// appended on the network's OWN click param. `suffix` separates the cohort in the
// network report (-gdirect / -dmdirect); `label` names the Telegram alert.
//
// IMPORTANT — direct_med has TWO distinct offers, do NOT cross-wire them:
//   • "DM-network": the RESULTS-PAGE /go/direct_med link (RevOffers offer 1304,
//     postback macro {subid1}). Its template lives in the providers table and is
//     UNTOUCHED by this file.
//   • "DM-direct": THIS homepage questionnaire link (directmeds.com/dm-offers-stc/…).
//     Separate offer on a SEPARATE Everflow account (confirmed by Ian 2026-07-15) —
//     standard Everflow conventions, so the click param is `sub1` and postbacks use
//     the standard Everflow macro set. `sub1` is the confirmed code default so a
//     missing Railway env on a fresh instance can't silently drop attribution (a
//     wrong/absent param is invisible to the network — same failure as sending none).
//     The env DM_DIRECT_SUBID_PARAM still OVERRIDES if the param ever changes, so a
//     correction stays a config change, not a code deploy.
const DM_DIRECT_BASE =
  "https://directmeds.com/dm-offers-stc/questionnaire-1.php?oid=12&uid=77&affid=864";
function dmDirectUrl(subid: string): string {
  const param = (process.env.DM_DIRECT_SUBID_PARAM ?? "").trim() || "sub1";
  return `${DM_DIRECT_BASE}&${encodeURIComponent(param)}=${encodeURIComponent(subid)}`;
}
const DIRECT_DESTINATIONS: Record<string, { suffix: string; label: string; url: (subid: string) => string }> = {
  gala: {
    suffix: "gdirect",
    label: "Gala",
    url: (subid) =>
      "https://galaglp1.com/funnel/start?a=price&_ef_transaction_id=&oid=1&affid=13" +
      "&utm_content=lp-glp1-v4&sub1=" + encodeURIComponent(subid),
  },
  direct_med: {
    suffix: "dmdirect",
    label: "DM-direct",
    url: dmDirectUrl,
  },
};

// Telegram alert dedupe: same (provider, session) again within 10 min doesn't
// re-notify (in-memory, best-effort, single-instance).
const GODIRECT_NOTIFY_MS = 10 * 60 * 1000;
const goDirectNotifiedAt = new Map<string, number>();

function classifyDevice(ua: string | undefined, inApp: boolean): string {
  if (inApp) return "\u{1F4F1} FB app";
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua ?? "")) return "\u{1F4F1} browser";
  return "\u{1F4BB}";
}

import capiRouter from "../routes/capi";
import { postbackRouter } from "../routes/postback";
import emailWebhookRouter from "../email/webhook";
import emailUnsubscribeRouter from "../email/unsubscribe";
import { ensureEmailSchema } from "../email/schema";
import { startEmailCron } from "../email/worker";
import { prerenderRoutes, SITE_URL } from "../../scripts/prerender-routes";

// Previously /quiz was listed here as a static sitemap path, but it is now a
// prerendered noindex route and is therefore excluded from the sitemap automatically.
const STATIC_SITEMAP_PATHS: string[] = [];

function getSiteUrl() {
  return (
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    SITE_URL
  ).replace(/\/$/, "");
}

function getPriorityForPath(path: string) {
  if (path === "/") return "1.0";
  if (path.startsWith("/peptides/") || path.startsWith("/compare/")) return "0.9";
  if (path.startsWith("/goals/") || path.startsWith("/for/")) return "0.85";
  if (path === "/learn" || path === "/blog" || path === "/peptides" || path === "/compare" || path === "/goals") {
    return "0.8";
  }
  if (path.startsWith("/guides/") || path.startsWith("/reviews/") || path.startsWith("/stacks/") || path.startsWith("/blog/")) {
    return "0.75";
  }
  if (path === "/privacy" || path === "/terms" || path === "/disclaimer") return "0.3";
  return "0.6";
}

function getChangefreqForPath(path: string) {
  if (path === "/" || path === "/learn" || path === "/blog") return "weekly";
  if (path.startsWith("/blog/")) return "monthly";
  return "monthly";
}

function buildSitemapXml() {
  const siteUrl = getSiteUrl();
  const prerenderedPaths = prerenderRoutes
    .filter((route) => !route.noindex)
    .map((route) => route.path);
  const paths = Array.from(new Set([...prerenderedPaths, ...STATIC_SITEMAP_PATHS]));
  const today = new Date().toISOString().slice(0, 10);

  const urls = paths
    .map((path) => {
      return [
        "  <url>",
        `    <loc>${siteUrl}${path === "/" ? "" : path}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${getChangefreqForPath(path)}</changefreq>`,
        `    <priority>${getPriorityForPath(path)}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("\n");
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  try {
    await ensureAffiliateWorkspaceSchema();
  } catch (error) {
    console.error("[Bootstrap] Failed to ensure affiliate workspace schema:", error);
  }

  try {
    await ensureExperimentSchema();
  } catch (error) {
    console.error("[Bootstrap] Failed to ensure experiment schema:", error);
  }

  try {
    await ensureEmailSchema();
  } catch (error) {
    console.error("[Bootstrap] Failed to ensure email schema:", error);
  }

  // Log email env var presence (never log values)
  console.log("[EmailEnv] RESEND_API_KEY:", Boolean(process.env.RESEND_API_KEY));
  console.log("[EmailEnv] RESEND_WEBHOOK_SECRET:", Boolean(process.env.RESEND_WEBHOOK_SECRET));
  console.log("[EmailEnv] EMAIL_FROM_ADDRESS:", Boolean(process.env.EMAIL_FROM_ADDRESS));
  console.log("[EmailEnv] EMAIL_DAILY_CAP:", Boolean(process.env.EMAIL_DAILY_CAP));
  console.log("[EmailEnv] UNSUBSCRIBE_SECRET:", Boolean(process.env.UNSUBSCRIBE_SECRET));
  console.log("[EmailEnv] EMAIL_PHYSICAL_ADDRESS:", Boolean(process.env.EMAIL_PHYSICAL_ADDRESS));

  // Start email cron worker after schema is ready
  startEmailCron();

  // Warn loudly if the static provider floor-price constant has drifted from the live table.
  void checkProviderFloorConsistency();

  const app = express();
  const server = createServer(app);
  app.use(
    compression({
      threshold: 1024,
    })
  );
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "development" && req.hostname === "peptidepilot.me") {
      return res.redirect(301, `https://www.peptidepilot.me${req.originalUrl}`);
    }
    if (req.path.length > 1 && req.path.endsWith("/")) {
      const query = req.url.slice(req.path.length);
      return res.redirect(301, `${req.path.replace(/\/+$/, "")}${query}`);
    }
    // SEO prune: retired pages return real HTTP 410 Gone; cannibal losers 301
    // to their canonical winner. Both run before the SPA catch-all.
    if (isGone410(req.path)) {
      return res.status(410).type("text/plain").send("410 Gone — this page has been permanently removed.");
    }
    const redirect = redirectTarget(req.path);
    if (redirect) {
      const query = req.url.slice(req.path.length);
      return res.redirect(301, `${redirect}${query}`);
    }
    return next();
  });
  // Body parser is applied per-route below so it does not interfere with
  // tRPC v11's raw body consumption via createBody() in incomingMessageToRequest.
  app.post("/api/analytics/session-start", express.json({ limit: "1mb" }), async (req, res) => {
    try {
      await startVisitorSession({
        sessionId: String(req.body?.sessionId ?? ""),
        landingPath: String(req.body?.landingPath ?? ""),
        referrer: typeof req.body?.referrer === "string" ? req.body.referrer : null,
        utmSource: typeof req.body?.utmSource === "string" ? req.body.utmSource : null,
        utmMedium: typeof req.body?.utmMedium === "string" ? req.body.utmMedium : null,
        utmCampaign: typeof req.body?.utmCampaign === "string" ? req.body.utmCampaign : null,
        utmContent: typeof req.body?.utmContent === "string" ? req.body.utmContent : null,
        utmTerm: typeof req.body?.utmTerm === "string" ? req.body.utmTerm : null,
        userAgent: typeof req.body?.userAgent === "string" ? req.body.userAgent : null,
      });
      res.status(204).end();
    } catch (error) {
      console.error("[Analytics] Failed to start session:", error);
      res.status(400).json({ error: "invalid_session_start" });
    }
  });
  app.post("/api/analytics/page-view", express.json({ limit: "1mb" }), async (req, res) => {
    try {
      await recordPageView({
        sessionId: String(req.body?.sessionId ?? ""),
        path: String(req.body?.path ?? ""),
        durationMs: Number(req.body?.durationMs ?? 0),
        referrer: typeof req.body?.referrer === "string" ? req.body.referrer : null,
      });
      res.status(204).end();
    } catch (error) {
      console.error("[Analytics] Failed to record page view:", error);
      res.status(400).json({ error: "invalid_page_view" });
    }
  });
  app.post("/api/analytics/click", express.json({ limit: "1mb" }), async (req, res) => {
    try {
      await recordClickEvent({
        sessionId: String(req.body?.sessionId ?? ""),
        path: String(req.body?.path ?? ""),
        label: String(req.body?.label ?? ""),
        targetHref: typeof req.body?.targetHref === "string" ? req.body.targetHref : null,
        eventType: String(req.body?.eventType ?? "click"),
      });
      res.status(204).end();
    } catch (error) {
      console.error("[Analytics] Failed to record click:", error);
      res.status(400).json({ error: "invalid_click_event" });
    }
  });

  // /start bridge answers — one tap-answer at a time, written to the visitor session
  // BEFORE the eventual /go-direct handoff so partial funnels (Q1-only, Q1+Q2) are
  // still captured. Idempotent: re-answering overwrites the same column. Body:
  // { sessionId, q: 1|2|3, value: "<option label>" }.
  app.post("/api/bridge", express.json({ limit: "1mb" }), async (req, res) => {
    try {
      const sessionId = String(req.body?.sessionId ?? "").slice(0, 64);
      const q = Number(req.body?.q);
      const value = String(req.body?.value ?? "").slice(0, 64);
      if (!sessionId || ![1, 2, 3].includes(q) || !value) {
        res.status(400).json({ error: "invalid_bridge_answer" });
        return;
      }
      const db = await getDb();
      if (db) {
        const col = q === 1 ? "bridge_q1" : q === 2 ? "bridge_q2" : "bridge_q3";
        // Only updates an existing session row (created by session-start on load); if the
        // session isn't there yet the update is a no-op — the pixel/click still fire.
        await db.execute(
          sql`UPDATE visitor_sessions SET ${sql.raw("`" + col + "`")} = ${value} WHERE id = ${sessionId}`,
        );
      }
      res.status(204).end();
    } catch (error: any) {
      // Never swallow the driver error (AGENTS.md).
      console.error(
        "[Bridge] answer write failed:",
        error?.code, error?.errno, error?.sqlState, error?.sqlMessage,
        error?.cause?.code, error?.cause?.sqlMessage, error?.cause?.message,
      );
      res.status(400).json({ error: "invalid_bridge_answer" });
    }
  });
  // One-shot seed endpoint: creates providers table + inserts 4 seed rows
  app.get("/api/seed-providers", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) { res.status(500).json({ error: "no db" }); return; }
      // Check if table exists and has rows
      let alreadySeeded = false;
      try {
        const [existing] = await db.execute(sql`SELECT COUNT(*) as cnt FROM providers`);
        if (Array.isArray(existing) && existing.length > 0 && (existing[0] as any).cnt > 0) {
          alreadySeeded = true;
        }
      } catch { /* table doesn't exist yet — will create below */ }
      if (alreadySeeded) {
        const [rows] = await db.execute(sql`SELECT slug, display_name, price_from_cents, promo_code, active, sort_priority FROM providers ORDER BY sort_priority`);
        res.json({ message: "Already seeded", providers: rows });
        return;
      }
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS providers (
          id INT AUTO_INCREMENT PRIMARY KEY,
          slug VARCHAR(64) NOT NULL UNIQUE,
          display_name VARCHAR(128) NOT NULL,
          price_from_cents INT NOT NULL,
          price_note VARCHAR(255),
          included JSON NOT NULL,
          meds_offered ENUM('oral','injectable','both') NOT NULL,
          states_available JSON NOT NULL,
          cash_pay_friendly BOOLEAN NOT NULL DEFAULT TRUE,
          ship_days_estimate INT,
          affiliate_url_template VARCHAR(1024) NOT NULL,
          bounty_cents INT,
          promo_code VARCHAR(64),
          active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_priority INT NOT NULL DEFAULT 50,
          compliance_note TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      await db.insert(providers).values([
        { slug: 'gala', displayName: 'Gala Health', priceFromCents: 12900, priceNote: null, included: ['Personalized provider match','Unlimited follow-up visits','Medication shipped to your door','Ongoing care coordination'], medsOffered: 'both', statesAvailable: '"ALL"', cashPayFriendly: true, shipDaysEstimate: 4, affiliateUrlTemplate: 'https://galaglp1.com/lp/glp1?a=price&_ef_transaction_id=&oid=1&affid=13&sub1={subid}', bountyCents: null, promoCode: null, active: true, sortPriority: 1, complianceNote: 'Compounded medications are not FDA-approved finished drug products.' },
        { slug: 'medvi', displayName: 'Medvi', priceFromCents: 19900, priceNote: null, included: ['Board-certified provider','Prescription management','Monthly follow-ups','Medication shipped free'], medsOffered: 'both', statesAvailable: '"ALL"', cashPayFriendly: true, shipDaysEstimate: 4, affiliateUrlTemplate: 'https://track.revoffers.com/aff_c?offer_id=1304&aff_id=12185&subid1={subid}', bountyCents: null, promoCode: null, active: false, sortPriority: 2, complianceNote: null },
        { slug: 'direct_med', displayName: 'Direct Meds', priceFromCents: 29700, priceNote: null, included: ['Board-certified MD oversight','Prescription management','Monthly follow-ups','Medication shipped free'], medsOffered: 'both', statesAvailable: '"ALL"', cashPayFriendly: true, shipDaysEstimate: 4, affiliateUrlTemplate: 'https://track.revoffers.com/aff_c?offer_id=1304&aff_id=12185&subid1={subid}', bountyCents: null, promoCode: null, active: true, sortPriority: 3, complianceNote: 'Compounded medications are not FDA-approved finished drug products.' },
        { slug: 'sprout', displayName: 'Sprout', priceFromCents: 31900, priceNote: null, included: ['Patient care team','Prescription management','No long-term contracts','Free shipping'], medsOffered: 'both', statesAvailable: '"ALL"', cashPayFriendly: true, shipDaysEstimate: 5, affiliateUrlTemplate: 'https://track.revoffers.com/aff_c?offer_id=1286&aff_id=12185&subid1={subid}', bountyCents: null, promoCode: null, active: true, sortPriority: 4, complianceNote: 'Compounded medications are not FDA-approved finished drug products.' },
      ]);
      const [rows] = await db.execute(sql`SELECT slug, display_name, price_from_cents, promo_code, active, sort_priority FROM providers ORDER BY sort_priority`);
      res.json({ message: "Seeded", providers: rows });
    } catch (err) {
      console.error("[Seed] Error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Affiliate go-link: logs click then redirects
  app.get("/go/:provider/:publicId", async (req, res) => {
    const { provider, publicId } = req.params;
    const position = (req.query.position as string) || "hero";
    // /go/ always redirects to a GLP-1 provider; surface says where the click
    // came from (results page = 'funnel', bridge page = 'bridge'). Default funnel.
    const surface = (req.query.surface as string) || "funnel";
    if (!provider || !publicId) {
      res.status(400).send("Missing provider or publicId");
      return;
    }
    try {
      const db = await getDb();
      if (db) {
        const pRows = await db
          .select()
          .from(providers)
          .where(eq(providers.slug, provider))
          .limit(1);
        const p = pRows[0];

        const leadRows = await db
          .select({ id: leads.id, experimentVariant: leads.experimentVariant })
          .from(leads)
          .where(eq(leads.publicId, publicId))
          .limit(1);
        const lead = leadRows[0];

        if (p) {
          const subid = `${publicId}-${provider}`;
          const url = p.affiliateUrlTemplate.replace(/\{subid\}/g, subid);

          // Log the click — tagged as a monetizable GLP-1 provider click.
          // Capture whether the click came from a FB/IG in-app WebView so we can
          // correlate real-browser clicks with downstream provider funnel-starts.
          await db.insert(providerClickLogs).values({
            leadId: lead?.id ?? null,
            publicId,
            providerSlug: provider,
            position,
            experimentVariant: lead?.experimentVariant ?? null,
            sourceSurface: surface,
            clickType: "glp1_provider",
            inAppBrowser: isInAppBrowser(req.headers["user-agent"]),
          });

          res.redirect(302, url);
          return;
        }
      }
    } catch (err) {
      console.error("[GoLink] Error:", err);
    }
    // Fallback: redirect to home
    res.redirect(302, "/");
  });

  // Homepage direct-flow experiment (HOMEPAGE_CTA_MODE). Session-keyed outbound
  // redirect — these visitors have NO lead/publicId. Log the click BEFORE the 302 so
  // the direct cohort is measurable, then send them into the provider's funnel with a
  // cohort suffix (-gdirect / -dmdirect) that separates this from quiz-flow in the
  // network report. Destination + subid param per provider: see DIRECT_DESTINATIONS.
  app.get("/go-direct/:provider", async (req, res) => {
    const providerSlug = req.params.provider;
    const dest = DIRECT_DESTINATIONS[providerSlug];
    // Unknown provider → home (keeps the route from redirecting to a broken URL).
    if (!dest) {
      res.redirect(302, "/");
      return;
    }
    const sessionId = (typeof req.query.sid === "string" && req.query.sid.slice(0, 36)) || "anon";
    const inApp = isInAppBrowser(req.headers["user-agent"]);
    // Which homepage CTA was clicked (hero vs a lower repeat). Encoded onto the
    // position column as home_direct_<suffix>; unknown/absent stays plain
    // 'home_direct'. position is varchar(16), so footer is stored as the 16-char
    // 'home_direct_foot' ('home_direct_footer' would overflow); hero fits as-is.
    // varchar(16): 'home_direct_hero'/'_foot'/'_brdg' all = 16 chars exactly; '_footer'
    // (18) would overflow and silently fail the insert. 'bridge' → 'brdg' for the /start flow.
    const posRaw = typeof req.query.pos === "string" ? req.query.pos : "";
    const posSuffix =
      posRaw === "hero" ? "hero" : posRaw === "footer" ? "foot" : posRaw === "bridge" ? "brdg" : "";
    const position = posSuffix ? `home_direct_${posSuffix}` : "home_direct";
    const subid = `${sessionId}-${dest.suffix}`;
    const url = dest.url(subid);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(providerClickLogs).values({
          leadId: null,
          publicId: sessionId,
          providerSlug,
          position,
          experimentVariant: null,
          sourceSurface: "funnel",
          clickType: "glp1_provider",
          inAppBrowser: inApp,
        });
      }
    } catch (err: any) {
      // Never block the outbound redirect on a logging failure. Full driver error per AGENTS.md.
      console.error(
        "[GoDirect] click-log failed:",
        err?.code, err?.errno, err?.sqlState, err?.sqlMessage,
        err?.cause?.code, err?.cause?.sqlMessage, err?.cause?.message,
      );
    }

    // Fire-and-forget Telegram alert on every homepage→direct click — detached so it
    // NEVER delays the 302, and a Telegram outage can't break the redirect. Dedupe:
    // same (provider, session) within 10 min doesn't re-notify.
    const dedupeKey = `${providerSlug}:${sessionId}`;
    const nowMs = Date.now();
    const lastNotify = goDirectNotifiedAt.get(dedupeKey);
    if (!lastNotify || nowMs - lastNotify > GODIRECT_NOTIFY_MS) {
      goDirectNotifiedAt.set(dedupeKey, nowMs);
      if (goDirectNotifiedAt.size > 5000) {
        const cutoff = nowMs - GODIRECT_NOTIFY_MS;
        goDirectNotifiedAt.forEach((v, k) => {
          if (v < cutoff) goDirectNotifiedAt.delete(k);
        });
      }
      const uaStr = req.headers["user-agent"];
      void (async () => {
        try {
          let utm = "organic";
          const tgDb = await getDb();
          if (tgDb && sessionId !== "anon") {
            const rows = await tgDb
              .select({ u: visitorSessions.utmContent })
              .from(visitorSessions)
              .where(eq(visitorSessions.id, sessionId))
              .limit(1);
            if (rows[0]?.u) utm = rows[0].u;
          }
          const t = new Date().toLocaleString("en-US", {
            timeZone: "America/New_York",
            hour: "numeric",
            minute: "2-digit",
          });
          const device = classifyDevice(uaStr, inApp);
          const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          await sendTelegramMessage(`\u{1F500} ${dest.label} click · ${t} ET · ${device} · ${esc(utm)}`);
        } catch (err) {
          console.error("[Telegram] go-direct notify failed:", err);
        }
      })();
    }

    res.redirect(302, url);
  });

  // Runtime homepage-CTA mode (quiz | gala | split), read per request so a Railway
  // env flip takes effect without a rebuild. Default gala (the live experiment).
  app.get("/api/cta-mode", (_req, res) => {
    const raw = (process.env.HOMEPAGE_CTA_MODE || "gala").toLowerCase();
    const mode = raw === "quiz" || raw === "split" ? raw : "gala";
    res.set("Cache-Control", "no-store");
    res.json({ mode });
  });

  app.post("/api/analytics/funnel-event", express.json({ limit: "1mb" }), async (req, res) => {
    try {
      await recordFunnelEvent({
        sessionId: String(req.body?.sessionId ?? ""),
        event: String(req.body?.event ?? ""),
        data: req.body?.data ?? null,
      });
      res.status(204).end();
    } catch (error) {
      console.error("[Analytics] Failed to record funnel event:", error);
      res.status(400).json({ error: "invalid_funnel_event" });
    }
  });
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      env: process.env.NODE_ENV || "development",
      configured: {
        database: Boolean(ENV.databaseUrl),
        adminEmails: ENV.adminEmails.length,
        oauthServer: Boolean(ENV.oAuthServerUrl),
        appId: Boolean(ENV.appId),
        jwtSecret: Boolean(ENV.cookieSecret),
        siteUrl: Boolean(process.env.SITE_URL || process.env.VITE_SITE_URL),
        metaCapi: Boolean(process.env.META_CAPI_TOKEN),
        resend: Boolean(process.env.RESEND_API_KEY),
        resendWebhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET),
        emailFromAddress: Boolean(process.env.EMAIL_FROM_ADDRESS),
        emailDailyCap: Boolean(process.env.EMAIL_DAILY_CAP),
        unsubscribeSecret: Boolean(process.env.UNSUBSCRIBE_SECRET),
        emailPhysicalAddress: Boolean(process.env.EMAIL_PHYSICAL_ADDRESS),
        tierWebhooks: {
          tier1: Boolean(process.env.WEBHOOK_TIER1_URL),
          tier2: Boolean(process.env.WEBHOOK_TIER2_URL),
          tier3: Boolean(process.env.WEBHOOK_TIER3_URL),
        },
      },
    });
  });
  app.get("/sitemap.xml", (_req, res) => {
    res.type("application/xml").send(buildSitemapXml());
  });
  app.get("/robots.txt", (_req, res) => {
    const siteUrl = getSiteUrl();
    res
      .type("text/plain")
      .send(["User-agent: *", "Allow: /", `Sitemap: ${siteUrl}/sitemap.xml`, ""].join("\n"));
  });
  // Facebook Conversions API — server-side affiliate click tracking
  app.use("/api/capi", express.json({ limit: "50mb" }), capiRouter);

  // Email webhook (Resend) and unsubscribe.
  // Svix signature verification needs the EXACT raw request bytes — parsing with
  // express.json() first and re-serializing produces different bytes and fails
  // verification (the old 0-opens bug). Capture the raw Buffer instead.
  app.use("/api/email/webhook", express.raw({ type: "*/*", limit: "1mb" }), emailWebhookRouter);
  app.use("/api/email/unsubscribe", emailUnsubscribeRouter);
  // Affiliate conversion postbacks (GET or POST; query or form-encoded body).
  app.use("/api/postback", express.urlencoded({ extended: false }), express.json(), postbackRouter);

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
