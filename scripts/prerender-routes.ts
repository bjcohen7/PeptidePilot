import { blogPosts } from "../shared/blog";
import {
  comparisonPages,
  forConditionPages,
  goalPages,
  guidePages,
  peptidePages,
  reviewPages,
  stackPages,
} from "../shared/pseoData";
import { pseoSections } from "../shared/pseo";
import { QUIZ_MINUTES } from "../shared/quizConfig";
import { isGone410, isNoindexed } from "../shared/seoPruneList";
import { SEO_REDIRECTS } from "../shared/seoRedirects";

export const SITE_URL = "https://www.peptidepilot.me";
const DEFAULT_OG_IMAGE = `${SITE_URL}/apple-touch-icon.png`;

export type PrerenderRoute = {
  path: string;
  title: string;
  description: string;
  type?: "website" | "article";
  noindex?: boolean;
};

const staticRoutes: PrerenderRoute[] = [
  {
    path: "/",
    title: "PeptidePilot — Compare GLP-1 providers in minutes. 100% independent.",
    description:
      "See which GLP-1 provider fits your budget and goals. A short quiz matches you to licensed telehealth options — no waiting room, no surprises. 100% independent.",
    type: "website",
  },
  {
    path: "/match",
    title: "Peptides for Weight Loss — Start With the One That's Clinically Proven",
    description:
      `Semaglutide and tirzepatide are the peptides with large-scale clinical trials behind them. Take a free ${QUIZ_MINUTES}-minute quiz and see which licensed GLP-1 provider fits your body and budget.`,
    type: "website",
  },
  {
    // Ad alias of /match. noindex to avoid duplicate content; /match is canonical.
    path: "/peptides-for-weight-loss",
    title: "Peptides for Weight Loss — Start With the One That's Clinically Proven",
    description:
      `Semaglutide and tirzepatide are the peptides with large-scale clinical trials behind them. Take a free ${QUIZ_MINUTES}-minute quiz and see which licensed GLP-1 provider fits your body and budget.`,
    type: "website",
    noindex: true,
  },
  {
    path: "/about",
    title: "About PeptidePilot",
    description:
      "Learn how PeptidePilot helps you compare GLP-1 providers and find the right fit for your health goals.",
    type: "website",
  },
  {
    path: "/blog",
    title: "Learn | PeptidePilot",
    description:
      "GLP-1 guides, treatment overviews, and practical tips from PeptidePilot.",
    type: "website",
  },
  {
    path: "/learn",
    title: "Learn | PeptidePilot",
    description:
      "Explore PeptidePilot guides for GLP-1 treatments, provider comparisons, reviews, and educational resources.",
    type: "website",
  },
  {
    path: "/faq",
    title: "Frequently Asked Questions | PeptidePilot",
    description:
      "Answers to common questions about GLP-1 provider comparison, pricing, telehealth qualifications, and how PeptidePilot works.",
    type: "website",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | PeptidePilot",
    description: "Read the PeptidePilot privacy policy and learn how lead and analytics data are handled.",
    type: "website",
  },
  {
    path: "/terms",
    title: "Terms of Service | PeptidePilot",
    description: "Read the PeptidePilot terms of service for use of the site and recommendation platform.",
    type: "website",
  },
  {
    path: "/disclaimer",
    title: "Medical Disclaimer | PeptidePilot",
    description: "Read the full PeptidePilot medical disclaimer and educational-use framing.",
    type: "website",
  },
  // Noindex routes: prerendered so they get their own HTML with correct noindex/canonical
  // instead of falling back to the home page index.html
  {
    path: "/quiz",
    title: "GLP-1 Provider Quiz | PeptidePilot",
    description: `Take the free ${QUIZ_MINUTES}-minute PeptidePilot quiz to find your best GLP-1 provider match.`,
    type: "website",
    noindex: true,
  },
  {
    path: "/processing",
    title: "Finding Your Match | PeptidePilot",
    description: "PeptidePilot is matching you with GLP-1 providers.",
    type: "website",
    noindex: true,
  },
  {
    path: "/results",
    title: "Your Matches | PeptidePilot",
    description: "Your personalized GLP-1 provider matches from PeptidePilot.",
    type: "website",
    noindex: true,
  },
  // Custom 404 page — prerendered so the server can serve it with status 404
  // for unknown pseo paths (prevents soft 404s / canonical pollution).
  {
    path: "/404",
    title: "Page Not Found | PeptidePilot",
    description: "The page you are looking for could not be found.",
    type: "website",
    noindex: true,
  },
];

const sectionRoutes: PrerenderRoute[] = pseoSections.map((section) => ({
  path: section.path,
  title: `${section.label} | PeptidePilot`,
  description: `Browse ${section.label.toLowerCase()} on PeptidePilot.`,
  type: "website",
}));

const blogRoutes: PrerenderRoute[] = blogPosts.map((post) => ({
  path: `/blog/${post.slug}`,
  title: post.title,
  description: post.excerpt,
  type: "article",
}));

const peptideRoutes: PrerenderRoute[] = peptidePages.map((page) => ({
  path: `/peptides/${page.slug}`,
  title: `${page.name}: Independent Guide | PeptidePilot`,
  description: page.metaDescription,
  type: "article",
}));

const goalRoutes: PrerenderRoute[] = goalPages.map((page) => ({
  path: `/goals/${page.slug}`,
  title: page.h1,
  description: page.metaDescription,
  type: "article",
}));

const comparisonRoutes: PrerenderRoute[] = comparisonPages.map((page) => ({
  path: `/compare/${page.slug}`,
  title: page.h1,
  description: page.metaDescription,
  type: "article",
}));

const stackRoutes: PrerenderRoute[] = stackPages.map((page) => ({
  path: `/stacks/${page.slug}`,
  title: page.h1,
  description: page.metaDescription,
  type: "article",
}));

const guideRoutes: PrerenderRoute[] = guidePages.map((page) => ({
  path: `/guides/${page.slug}`,
  title: page.h1,
  description: page.metaDescription,
  type: "article",
}));

const conditionRoutes: PrerenderRoute[] = forConditionPages.map((page) => ({
  path: `/for/${page.slug}`,
  title: page.h1,
  description: page.metaDescription,
  type: "article",
}));

const reviewRoutes: PrerenderRoute[] = reviewPages.map((page) => ({
  path: `/reviews/${page.slug}`,
  title: page.h1,
  description: page.metaDescription,
  type: "article",
}));

const allRoutes = [
  ...staticRoutes,
  ...sectionRoutes,
  ...blogRoutes,
  ...peptideRoutes,
  ...goalRoutes,
  ...comparisonRoutes,
  ...stackRoutes,
  ...guideRoutes,
  ...conditionRoutes,
  ...reviewRoutes,
];

const seen = new Set<string>();
export const prerenderRoutes = allRoutes
  .filter((route) => {
    if (seen.has(route.path)) return false;
    seen.add(route.path);
    // SEO prune: drop retired (410) pages and cannibal losers (301'd) entirely —
    // no HTML, no sitemap entry; only the canonical winner survives.
    if (isGone410(route.path)) return false;
    if (SEO_REDIRECTS[route.path]) return false;
    return true;
  })
  // noindex pages stay rendered + served, but get meta robots noindex and drop
  // out of the sitemap (the builder already excludes noindex routes).
  .map((route) => (isNoindexed(route.path) ? { ...route, noindex: true } : route));

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildHeadTags(route: PrerenderRoute) {
  const canonical = `${SITE_URL}${route.path === "/" ? "" : route.path}`;
  const robots = route.noindex ? "noindex, nofollow" : "index, follow";

  return [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:site_name" content="PeptidePilot" />`,
    `<meta property="og:title" content="${escapeHtml(route.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:type" content="${route.type ?? "website"}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${DEFAULT_OG_IMAGE}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />`,
  ].join("\n    ");
}
