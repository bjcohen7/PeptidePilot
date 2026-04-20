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

async function main() {
  const template = await fs.readFile(TEMPLATE_PATH, "utf8");

  for (const route of prerenderRoutes) {
    const body = renderToString(<AppPrerender path={route.path} />);
    const head = buildHeadTags(route);
    const withHead = injectHead(template, head);
    const page = withHead.replace(
      '<div id="root"></div>',
      `<div id="root" data-prerendered="true">${body}</div>`,
    );
    await writeRouteHtml(route.path, page);
  }

  console.log(`[prerender] generated ${prerenderRoutes.length} routes`);
}

main().catch((error) => {
  console.error("[prerender] failed", error);
  process.exit(1);
});
