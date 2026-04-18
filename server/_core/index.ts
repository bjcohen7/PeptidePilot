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
import { recordPageView } from "../routers/analytics";
import { serveStatic, setupVite } from "./vite";
import { blogPosts } from "../../shared/blog";
import { pseoSections } from "../../shared/pseo";

const STATIC_SITEMAP_PATHS = [
  "/",
  "/quiz",
  "/results",
  "/about",
  "/blog",
  "/faq",
  "/disclaimer",
  "/privacy",
  "/terms",
  "/learn",
];

function getSiteUrl() {
  return (
    process.env.SITE_URL ||
    process.env.VITE_SITE_URL ||
    "https://peptidepilot.me"
  ).replace(/\/$/, "");
}

function buildSitemapXml() {
  const siteUrl = getSiteUrl();
  const pseoPaths = pseoSections.flatMap((section) => [
    section.path,
    ...section.entries.map((entry) => entry.path),
  ]);
  const blogPaths = blogPosts.map((post) => `/blog/${post.slug}`);
  const paths = Array.from(new Set([...STATIC_SITEMAP_PATHS, ...pseoPaths, ...blogPaths]));
  const today = new Date().toISOString().slice(0, 10);

  const urls = paths
    .map((path) => {
      const priority = path === "/" ? "1.0" : path.split("/").filter(Boolean).length === 1 ? "0.9" : "0.7";
      const changefreq = path.split("/").filter(Boolean).length <= 1 ? "weekly" : "monthly";
      return [
        "  <url>",
        `    <loc>${siteUrl}${path === "/" ? "" : path}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
