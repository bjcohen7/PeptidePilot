import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { initMetaPixel, loadMetaPixelScript } from "./lib/metaPixel";
import { preloadForPath } from "./lib/lazyRoutes";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  const loginUrl = getLoginUrl();
  if (!loginUrl) return;

  window.location.href = loginUrl;
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

initMetaPixel();

// LCP round 3: on the prerendered public landing routes (/, /start, /quiz,
// /match), await the active route's chunk BEFORE mounting React. The first
// render then finds the route component already resolved and never suspends —
// the prerendered hero is replaced by identical content in one commit instead
// of being wiped into the Suspense fallback while the chunk resolves. Capped
// at 3s so a stalled chunk can never block interactivity; on timeout we mount
// anyway and accept the old fallback behavior.
function mount() {
  createRoot(document.getElementById("root")!).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

// LCP round 4 (hardened in v3 follow-up): fbevents.js loads after idle so its
// main-thread cost stays off the tap-critical window — but scheduled from BOOT,
// not from mount, and raced with a hard setTimeout. Under heavy CPU contention
// mount can be late (route preload + vendor exec); tying the pixel to mount let
// Manus observe an 18.9s first request. The fbq stub queues every event fired
// before the script arrives, so nothing is lost either way; loadMetaPixelScript
// is idempotent, so the rIC + timeout double-fire is safe. PageView now lands
// within a few seconds even on a busy page.
if ("requestIdleCallback" in window) {
  window.requestIdleCallback(() => loadMetaPixelScript(), { timeout: 3000 });
}
setTimeout(() => loadMetaPixelScript(), 3500);

const routePreload = preloadForPath(window.location.pathname);
if (routePreload) {
  Promise.race([
    routePreload,
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ])
    .catch(() => {})
    .then(mount);
} else {
  mount();
}
