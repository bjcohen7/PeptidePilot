/**
 * Shared preloadable route components for the PUBLIC landing routes (LCP round 3).
 *
 * Why: "/" and "/start" are prerendered with real content, but on boot React's
 * mount wiped that DOM into the router's Suspense fallback while lazy() route
 * chunks resolved — mobile LCP was gated on the post-hydration repaint (~8.5s
 * on 4G), not the first paint. Chunks were already modulepreloaded; the gap
 * was lazy() still resolving asynchronously on first render.
 *
 * Fix: main.tsx awaits the active route's preload() BEFORE mounting React.
 * Once preloaded, the component renders DIRECTLY (no lazy, no Suspense) — so
 * the first render never suspends and the prerendered hero is replaced by
 * identical content in one commit, never by a blank fallback. If preload
 * hasn't happened (client-side navigation from another route), it falls back
 * to normal lazy() behavior and RouteFallback shows as a real loading state.
 *
 * INVARIANT (the ship bar): a user on 4G must never see the prerendered hero
 * replaced by a blank fallback.
 *
 * Scope: public landing routes only (/, /start, /quiz entry, /match). Admin
 * and dynamic routes keep standard lazy() in App.tsx.
 */
import { lazy, type ComponentType } from "react";

type PreloadableRoute = (() => React.JSX.Element) & {
  preload: () => Promise<unknown>;
};

function preloadableRoute(factory: () => Promise<{ default: ComponentType }>): PreloadableRoute {
  let promise: Promise<{ default: ComponentType }> | null = null;
  let Resolved: ComponentType | null = null;
  const load = () => (promise ??= factory());
  const Lazy = lazy(load);
  return Object.assign(
    () => {
      // Render the resolved module directly when the boot preloader already
      // fetched it — this path cannot suspend. Lazy path only on client-side nav.
      if (Resolved) {
        const C = Resolved;
        return <C />;
      }
      return <Lazy />;
    },
    {
      preload: () =>
        load().then((m) => {
          Resolved = m.default;
        }),
    },
  );
}

export const HomeRoute = preloadableRoute(() => import("../pages/Home"));
export const StartRoute = preloadableRoute(() => import("../pages/Start"));
export const QuizFlowRoute = preloadableRoute(() => import("../pages/QuizFlow"));
export const MatchRoute = preloadableRoute(() => import("../pages/Match"));

/** Map the boot pathname to the route chunk that must be ready before mount. */
export function preloadForPath(pathname: string): Promise<unknown> | null {
  if (pathname === "/") return HomeRoute.preload();
  if (pathname === "/start") return StartRoute.preload();
  if (pathname === "/quiz" || pathname.startsWith("/quiz/")) return QuizFlowRoute.preload();
  if (pathname === "/match" || pathname === "/peptides-for-weight-loss") return MatchRoute.preload();
  return null;
}
