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
  // LCP round 4: fbevents.js loads AFTER hydration + idle so the pixel's
  // main-thread cost never lands in the tap-critical window. The fbq stub
  // (installed by initMetaPixel above) queues every event fired before the
  // script arrives — nothing is lost, it flushes on load. 4s cap so events
  // still transmit promptly even on a busy main thread.
  const loadPixel = () => loadMetaPixelScript();
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadPixel, { timeout: 4000 });
  } else {
    setTimeout(loadPixel, 2500);
  }
}

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
