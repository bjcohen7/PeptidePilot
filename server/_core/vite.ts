import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import { prerenderRoutes } from "../../scripts/prerender-routes";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  const prerenderedPaths = new Set(prerenderRoutes.map((route) => route.path));
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use((req, res, next) => {
    const [pathname, search = ""] = req.url.split("?");
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

    // Lead results pages carry personal data — noindex must ride EVERY /results
    // response pre-JS. Set here (ahead of express.static) because bare /results
    // is prerendered and static serving bypasses the SPA fall-through where the
    // header was originally set (which still covers /results/:publicId).
    if (normalizedPath === "/results" || normalizedPath.startsWith("/results/")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }

    if (
      normalizedPath !== "/" &&
      prerenderedPaths.has(normalizedPath) &&
      !normalizedPath.endsWith(".html")
    ) {
      req.url = `${normalizedPath}/index.html${search ? `?${search}` : ""}`;
    }

    next();
  });

  app.use(
    express.static(distPath, {
      redirect: false,
      setHeaders(res, filePath) {
        const normalizedPath = filePath.split(path.sep).join("/");

        if (normalizedPath.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          return;
        }

        if (normalizedPath.endsWith(".html")) {
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
          return;
        }

        if (normalizedPath.includes("/data/") && normalizedPath.endsWith(".json")) {
          res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
          return;
        }

        if (/\.(?:png|jpe?g|gif|svg|webp|ico|woff2?)$/i.test(normalizedPath)) {
          res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
        }
      },
    })
  );

  // Fall through handler: serve the prerendered file if it exists, otherwise
  // serve the SPA shell (index.html) for client-side routing.
  //
  // IMPORTANT: For known path prefixes that only have prerendered pages
  // (e.g. /peptides/:slug, /compare/:slug), if no prerendered file exists
  // we return a 404 with the NotFound page rather than silently serving the
  // home page HTML. This prevents Google from seeing the home page content
  // at unknown URLs (soft 404s / canonical pollution).
  const PSEO_PREFIXES = [
    "/peptides/",
    "/compare/",
    "/goals/",
    "/stacks/",
    "/guides/",
    "/for/",
    "/reviews/",
    "/blog/",
  ];

  app.use("*", (req, res) => {
    // Every response from this fall-through is HTML (prerendered page, SPA shell,
    // or 404). express.static's setHeaders does NOT apply to res.sendFile() here,
    // so set the HTML cache policy explicitly: revalidate on every request so a
    // deploy is never masked by an edge/browser-cached stale page. Hashed assets
    // (served by express.static above) keep long max-age + immutable.
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    // Under an app.use("*") mount, req.path is "/" (stripped of the matched
    // mount) — use req.originalUrl to recover the real request path.
    const rawPath = (req.originalUrl || req.url || "/").split("?")[0];
    const normalizedPath = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;
    // Lead results pages carry personal data (name, body stats). The SPA shell's
    // meta is generic, so the noindex must ride a header the crawler sees pre-JS.
    if (normalizedPath === "/results" || normalizedPath.startsWith("/results/")) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    }
    const prerenderedFile =
      normalizedPath === "/"
        ? path.resolve(distPath, "index.html")
        : path.resolve(distPath, normalizedPath.slice(1), "index.html");

    if (fs.existsSync(prerenderedFile)) {
      return res.sendFile(prerenderedFile);
    }

    // For pseo path prefixes with no prerendered file, return 404 instead of
    // the home page HTML to avoid soft 404s and canonical pollution.
    const isPseoPath = PSEO_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
    if (isPseoPath) {
      const notFoundFile = path.resolve(distPath, "404", "index.html");
      if (fs.existsSync(notFoundFile)) {
        return res.status(404).sendFile(notFoundFile);
      }
      return res.status(404).send("Not Found");
    }

    // Dynamic client-rendered routes (e.g. /results/:publicId) get the clean SPA
    // shell (empty #root) rather than the prerendered home page, so they never
    // flash home-page content before the SPA renders the correct route.
    const appShell = path.resolve(distPath, "app-shell.html");
    if (fs.existsSync(appShell)) {
      return res.sendFile(appShell);
    }
    return res.sendFile(path.resolve(distPath, "index.html"));
  });
}
