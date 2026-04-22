import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReturningSession } from "@/contexts/UserSessionContext";

const DISMISS_KEY = "peptidepilot_recommendation_bar_dismissed";

function shouldShowOnPath(path: string) {
  return [
    "/learn",
    "/blog",
    "/peptides",
    "/goals",
    "/compare",
    "/stacks",
    "/guides",
    "/for",
    "/reviews",
  ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export default function PersistentRecommendationBar() {
  const [location] = useLocation();
  const { session } = useReturningSession();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
  }, [session?.token]);

  if (!session || dismissed || !shouldShowOnPath(location)) {
    return null;
  }

  const topMatch = session.topMatches[0];
  if (!topMatch) return null;

  return (
    <div className="border-b border-accent/15 bg-accent/5">
      <div className="container py-3">
        <div className="flex flex-col gap-3 rounded-xl border border-accent/15 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              Your Saved Recommendation
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              We still have your personalized results. Your top match is{" "}
              <span className="font-semibold text-foreground">{topMatch.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/results">
              <Button size="sm" className="gap-2">
                View My Results
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.sessionStorage.setItem(DISMISS_KEY, "1");
                }
                setDismissed(true);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss saved recommendation bar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
