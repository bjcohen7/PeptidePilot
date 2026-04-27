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
    title: "Personalized Peptide Recommendations | PeptidePilot",
    description:
      "Take the free 5-minute PeptidePilot quiz to get independent, science-backed peptide recommendations tailored to your goals, biology, and lifestyle.",
    type: "website",
  },
  {
    path: "/about",
    title: "About PeptidePilot",
    description:
      "Learn how PeptidePilot approaches independent, science-backed peptide education and personalized recommendation guidance.",
    type: "website",
  },
  {
    path: "/blog",
    title: "Learn | PeptidePilot",
    description:
      "Peptide science, evidence reviews, and practical educational guides from PeptidePilot.",
    type: "website",
  },
  {
    path: "/learn",
    title: "Learn | PeptidePilot",
    description:
      "Explore PeptidePilot research hubs for peptides, goals, stacks, comparisons, reviews, and educational guides.",
    type: "website",
  },
  {
    path: "/faq",
    title: "Frequently Asked Questions | PeptidePilot",
    description:
      "Answers to common questions about peptide matching, safety framing, sourcing, and how PeptidePilot works.",
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
    title: "Personalized Peptide Quiz | PeptidePilot",
    description: "Take the free 5-minute PeptidePilot quiz to get personalized peptide recommendations.",
    type: "website",
    noindex: true,
  },
  {
    path: "/processing",
    title: "Processing | PeptidePilot",
    description: "PeptidePilot is processing your quiz responses.",
    type: "website",
    noindex: true,
  },
  {
    path: "/results",
    title: "Your Results | PeptidePilot",
    description: "Your personalized PeptidePilot peptide recommendations.",
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
export const prerenderRoutes = allRoutes.filter((route) => {
  if (seen.has(route.path)) return false;
  seen.add(route.path);
  return true;
});

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
