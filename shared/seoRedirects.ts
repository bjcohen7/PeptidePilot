// Cannibal-merge 301s (winners confirmed 2026-07-06 from GSC impressions).
// loser path -> winner (canonical) path. The winning URL is the higher-impression
// twin (mostly the blog version); 2 clean pairs keep /compare. Consumed by:
// the server (issues 301) and scripts/prerender-routes.ts (losers dropped from
// render + sitemap so only the winner is indexed).
export const SEO_REDIRECTS: Record<string, string> = {
  // flipped to the higher-impression twin
  "/compare/selank-vs-semax": "/blog/semax-vs-selank",
  "/compare/bpc-157-vs-tb-500": "/blog/bpc-157-vs-tb-500",
  "/compare/sermorelin-vs-ipamorelin": "/blog/ipamorelin-vs-sermorelin",
  "/compare/ipamorelin-vs-sermorelin": "/blog/ipamorelin-vs-sermorelin", // 3-way → blog
  "/compare/bpc-157-vs-ghk-cu": "/blog/bpc-157-vs-ghk-cu",
  "/compare/epithalon-vs-ghk-cu": "/compare/ghk-cu-vs-epithalon",
  "/compare/aod-9604-vs-semaglutide": "/blog/aod-9604-vs-semaglutide", // beachhead home
  "/compare/tirzepatide-vs-retatrutide": "/blog/tirzepatide-vs-retatrutide", // beachhead home
  // clean pairs — /compare stays canonical
  "/compare/kisspeptin-vs-pt-141": "/compare/pt-141-vs-kisspeptin",
  "/blog/semaglutide-vs-tirzepatide": "/compare/semaglutide-vs-tirzepatide",
};

export function redirectTarget(path: string): string | null {
  const clean = path.replace(/\/+$/, "") || "/";
  return SEO_REDIRECTS[clean] ?? null;
}
