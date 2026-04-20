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

  app.use((req, _res, next) => {
    const [pathname, search = ""] = req.url.split("?");
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

    if (
      normalizedPath !== "/" &&
      prerenderedPaths.has(normalizedPath) &&
      !normalizedPath.endsWith(".html")
    ) {
      req.url = `${normalizedPath}/index.html${search ? `?${search}` : ""}`;
    }

    next();
  });

  app.use(express.static(distPath, { redirect: false }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    const normalizedPath = req.path.length > 1 ? req.path.replace(/\/+$/, "") : req.path;
    const prerenderedFile =
      normalizedPath === "/"
        ? path.resolve(distPath, "index.html")
        : path.resolve(distPath, normalizedPath.slice(1), "index.html");

    if (fs.existsSync(prerenderedFile)) {
      return res.sendFile(prerenderedFile);
    }

    return res.sendFile(path.resolve(distPath, "index.html"));
  });
}
