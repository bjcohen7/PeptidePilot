import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import AppPrerender from "../client/src/AppPrerender";
import { buildHeadTags, prerenderRoutes } from "./prerender-routes";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const DIST_PUBLIC = path.join(PROJECT_ROOT, "dist", "public");
const TEMPLATE_PATH = path.join(DIST_PUBLIC, "index.html");

function injectHead(template: string, headTags: string) {
  const titleRegex = /<title>[\s\S]*?<\/title>/i;
  let html = template.replace(titleRegex, headTags.includes("<title>") ? headTags.match(titleRegex)?.[0] ?? "" : "");

  const replacements: Array<[RegExp, string]> = [
    [/<title>[\s\S]*?<\/title>/i, headTags.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? ""],
    [/<meta name="description"[\s\S]*?\/>/i, headTags.match(/<meta name="description"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta name="robots"[\s\S]*?\/>/i, headTags.match(/<meta name="robots"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta property="og:site_name"[\s\S]*?\/>/i, headTags.match(/<meta property="og:site_name"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta property="og:title"[\s\S]*?\/>/i, headTags.match(/<meta property="og:title"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta property="og:description"[\s\S]*?\/>/i, headTags.match(/<meta property="og:description"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta property="og:image"[\s\S]*?\/>/i, headTags.match(/<meta property="og:image"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta name="twitter:image"[\s\S]*?\/>/i, headTags.match(/<meta name="twitter:image"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta property="og:type"[\s\S]*?\/>/i, headTags.match(/<meta property="og:type"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta name="twitter:card"[\s\S]*?\/>/i, headTags.match(/<meta name="twitter:card"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta name="twitter:title"[\s\S]*?\/>/i, headTags.match(/<meta name="twitter:title"[\s\S]*?\/>/i)?.[0] ?? ""],
    [/<meta name="twitter:description"[\s\S]*?\/>/i, headTags.match(/<meta name="twitter:description"[\s\S]*?\/>/i)?.[0] ?? ""],
  ];

  for (const [regex, replacement] of replacements) {
    if (replacement) html = html.replace(regex, replacement);
  }

  if (!html.includes('rel="canonical"')) {
    html = html.replace("</head>", `    ${headTags.match(/<link rel="canonical"[\s\S]*?\/>/i)?.[0] ?? ""}\n  </head>`);
  } else {
    html = html.replace(/<link rel="canonical"[\s\S]*?\/>/i, headTags.match(/<link rel="canonical"[\s\S]*?\/>/i)?.[0] ?? "");
  }

  if (!html.includes('property="og:url"')) {
    html = html.replace("</head>", `    ${headTags.match(/<meta property="og:url"[\s\S]*?\/>/i)?.[0] ?? ""}\n  </head>`);
  } else {
    html = html.replace(/<meta property="og:url"[\s\S]*?\/>/i, headTags.match(/<meta property="og:url"[\s\S]*?\/>/i)?.[0] ?? "");
  }

  return html;
}

async function writeRouteHtml(routePath: string, html: string) {
  if (routePath === "/") {
    await fs.writeFile(TEMPLATE_PATH, html, "utf8");
    return;
  }

  const outputDir = path.join(DIST_PUBLIC, routePath.replace(/^\//, ""));
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "index.html"), html, "utf8");
}

// Route → lazy route-chunk prefix. These route components are lazy()-imported in App.tsx,
// so Vite does NOT modulepreload their chunk — the browser only discovers the dynamic
// import after the vendor chain executes, serializing the post-hydration route paint (the
// LCP repaint). We inject a modulepreload for the route's own chunk so it downloads in
// parallel with the vendors. Limited to the high-traffic ad/landing routes; their deps
// (framework/ui-kit/data-client/app-shared) are already preloaded by the static graph.
const ROUTE_CHUNK_PREFIX: Record<string, string> = {
  "/": "Home",
  "/quiz": "QuizFlow",
  "/start": "Start",
  "/match": "Match",
  "/peptides-for-weight-loss": "Match",
};

// Pre-hydration tap buffer for /start Q1 (LCP round 4). Buttons are visible from
// first paint but React isn't mounted yet — without this, early taps feel dead.
// The inline script (<1KB, zero deps) captures pre-hydration taps on the Q1
// option buttons: pressed visual state immediately + the answer stashed in
// sessionStorage. Start.tsx reads the stash on mount and advances to Q2 as if
// the tap just landed. window.__ppHyd (set by Start on mount) disables it.
const START_TAP_BUFFER = `<script>(function(){document.addEventListener("click",function(e){if(window.__ppHyd)return;var b=e.target&&e.target.closest?e.target.closest("main button"):null;if(!b)return;var t=(b.textContent||"").replace(/\\s+/g," ").trim();if(!t)return;try{sessionStorage.setItem("pp_prehyd_q1",t)}catch(x){}try{b.style.borderColor="#047857";b.style.boxShadow="0 0 0 2px rgba(4,120,87,.25)"}catch(x){}},true)})();</script>`;

function routeChunkPreload(routePath: string, assetFiles: string[]): string {
  const prefix = ROUTE_CHUNK_PREFIX[routePath];
  if (!prefix) return "";
  const file = assetFiles.find((f) => f.startsWith(`${prefix}-`) && f.endsWith(".js"));
  return file ? `<link rel="modulepreload" crossorigin href="/assets/${file}" />` : "";
}

async function main() {
  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  const assetFiles = await fs.readdir(path.join(DIST_PUBLIC, "assets"));

  // Preserve the clean SPA shell (empty #root) BEFORE index.html is overwritten
  // with the prerendered home page. Dynamic app routes (e.g. /results/:publicId)
  // are served this shell so they never flash home-page content before the SPA
  // boots — they paint blank → the client renders the correct route.
  await fs.writeFile(path.join(DIST_PUBLIC, "app-shell.html"), template, "utf8");

  for (const route of prerenderRoutes) {
    const body = renderToString(<AppPrerender path={route.path} />);
    const head = buildHeadTags(route);
    let withHead = injectHead(template, head);
    const preload = routeChunkPreload(route.path, assetFiles);
    if (preload) withHead = withHead.replace("</head>", `    ${preload}\n  </head>`);
    let page = withHead.replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="true">${body}</div>`,
    );
    if (route.path === "/start") {
      page = page.replace("</body>", `${START_TAP_BUFFER}\n  </body>`);
    }
    await writeRouteHtml(route.path, page);
  }

  console.log(`[prerender] generated ${prerenderRoutes.length} routes`);
}

main().catch((error) => {
  console.error("[prerender] failed", error);
  process.exit(1);
});
