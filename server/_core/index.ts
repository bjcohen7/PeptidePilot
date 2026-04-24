import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { ensureAffiliateWorkspaceSchema } from "../db";
import { createContext } from "./context";
import { ENV } from "./env";
import { recordClickEvent, recordPageView, startVisitorSession } from "../routers/analytics";
import { serveStatic, setupVite } from "./vite";
import capiRouter from "../routes/capi";
import { prerenderRoutes, SITE_URL } from "../../scripts/prerender-routes";

const STATIC_SITEMAP_PATHS = [
  "/quiz",
];

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
  if (path === "/quiz") return "0.7";
  if (path === "/privacy" || path === "/terms" || path === "/disclaimer") return "0.3";
  return "0.6";
}

function getChangefreqForPath(path: string) {
  if (path === "/" || path === "/quiz" || path === "/learn" || path === "/blog") return "weekly";
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

  const app = express();
  const server = createServer(app);
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "development" && req.hostname === "peptidepilot.me") {
      return res.redirect(301, `https://www.peptidepilot.me${req.originalUrl}`);
    }
    if (req.path.length > 1 && req.path.endsWith("/")) {
      const query = req.url.slice(req.path.length);
      return res.redirect(301, `${req.path.replace(/\/+$/, "")}${query}`);
    }
    return next();
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
  app.use("/api/capi", capiRouter);

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
