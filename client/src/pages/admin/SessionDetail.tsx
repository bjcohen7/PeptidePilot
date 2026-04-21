import { Activity, ArrowLeft, Clock3, ExternalLink, Mail, MousePointerClick, Search, Timer, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

function cardClass() {
  return "rounded-xl border border-border bg-white p-5";
}

function formatDuration(ms: number) {
  if (!ms) return "0s";
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!minutes) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatReferrer(referrer?: string | null) {
  if (!referrer) return "direct";
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer;
  }
}

function getSessionStatus(session: {
  lead: unknown | null;
  lastSeenAt: string | Date;
}) {
  if (session.lead) return "completed";
  const lastSeen = new Date(session.lastSeenAt).getTime();
  const minutesAgo = (Date.now() - lastSeen) / 1000 / 60;
  return minutesAgo > 30 ? "abandoned" : "active";
}

function statusPill(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "abandoned") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

type Props = {
  sessionId: string;
};

function FallbackSessionDetail({ session }: { session: any }) {
  const status = getSessionStatus(session);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/sessions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Sessions
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Session Detail</h1>
          <p className="mt-2 text-sm text-muted-foreground font-mono">{session.id}</p>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${statusPill(status)}`}>
          {status}
        </span>
      </div>

      <div className={cardClass()}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
            <div className="mt-2 text-sm font-medium text-foreground">{session.lead?.email ?? "Anonymous visitor"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Top Match</div>
            <div className="mt-2 text-sm font-medium text-foreground">{session.lead?.topPeptideMatch ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Budget</div>
            <div className="mt-2 text-sm font-medium text-foreground">{session.lead?.budget ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Started</div>
            <div className="mt-2 text-sm font-medium text-foreground">{new Date(session.firstSeenAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Duration</div>
            <div className="mt-2 text-sm font-medium text-foreground">{formatDuration(session.totalDurationMs)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Views</div>
            <div className="mt-2 text-sm font-medium text-foreground">{session.pageViewCount}</div>
          </div>
        </div>
      </div>

      <div className={cardClass()}>
        <h2 className="text-lg font-semibold">Detail still loading from tracking data</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We found the session row, but the richer event timeline for this session isn&apos;t available from the detail endpoint yet. The summary above is live from the sessions table, so you can still confirm the lead and basic activity immediately.
        </p>
      </div>
    </div>
  );
}

export default function SessionDetail({ sessionId }: Props) {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const query = trpc.analytics.sessionById.useQuery({ sessionId }, { retry: false, refetchOnWindowFocus: false });
  const recentSessions = trpc.analytics.recentSessions.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const fallbackSession = (recentSessions.data ?? []).find((session) => session.id === sessionId);
  const deleteSession = trpc.analytics.deleteSession.useMutation({
    onSuccess: async ({ deletedLeadCount }) => {
      toast.success(deletedLeadCount ? "Session and linked lead deleted." : "Session deleted.");
      await Promise.all([
        utils.analytics.summary.invalidate(),
        utils.analytics.recentSessions.invalidate(),
        utils.analytics.sessionById.invalidate({ sessionId }),
      ]);
      setLocation("/admin/sessions");
    },
    onError: (error) => toast.error(error.message),
  });

  if (query.isLoading && !fallbackSession) {
    return <div className="text-sm text-muted-foreground">Loading session…</div>;
  }

  if (!query.data && !fallbackSession) {
    return (
      <div className="space-y-4">
        <Link href="/admin/sessions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Link>
        <div className={cardClass()}>
          <h1 className="text-2xl font-semibold tracking-tight">Session not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This session may have expired, or the ID does not exist in the current tracking data.
          </p>
        </div>
      </div>
    );
  }

  if (!query.data && fallbackSession) {
    return <FallbackSessionDetail session={fallbackSession} />;
  }

  const session = query.data!;
  const status = getSessionStatus(session);
  const mergedEvents = [
    ...session.visits.map((visit) => ({
      id: `visit-${visit.id}`,
      createdAt: new Date(visit.createdAt),
      title: `Visited ${visit.path}`,
      subtitle: `${formatDuration(visit.durationMs)} on page`,
      type: "visit" as const,
    })),
    ...session.clicks.map((click) => ({
      id: `click-${click.id}`,
      createdAt: new Date(click.createdAt),
      title: click.label,
      subtitle: `${click.eventType} · ${click.path}${click.targetHref ? ` · ${click.targetHref}` : ""}`,
      type: "click" as const,
    })),
    ...session.affiliateClicks.map((click, index) => ({
      id: `affiliate-${index}-${click.clickedAt}`,
      createdAt: new Date(click.clickedAt),
      title: `Clicked affiliate link: ${click.vendor}`,
      subtitle: click.peptideId,
      type: "affiliate" as const,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const funnelSteps = [
    { label: "Quiz started", complete: true, timestamp: session.firstSeenAt },
    { label: "Quiz explored", complete: session.pageViewCount > 1, timestamp: session.visits[0]?.createdAt ?? session.firstSeenAt },
    { label: "Lead captured", complete: Boolean(session.lead), timestamp: session.lead?.createdAt ?? null },
  ];

  const handleDelete = () => {
    const confirmed = window.confirm(
      "Delete this session and any linked lead, clicks, visits, and affiliate records? This can’t be undone.",
    );
    if (!confirmed) return;
    deleteSession.mutate({ sessionId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin/sessions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Sessions
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Session Detail</h1>
          <p className="mt-2 text-sm text-muted-foreground font-mono">{session.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteSession.isPending}
            className="inline-flex items-center gap-2 rounded-md border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            Delete Session
          </button>
          <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${statusPill(status)}`}>
            {status}
          </span>
        </div>
      </div>

      <div className={cardClass()}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
            <div className="mt-2 text-sm font-medium text-foreground">{session.lead?.email ?? "Anonymous visitor"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Top Match</div>
            <div className="mt-2 text-sm font-medium text-foreground">{session.lead?.topPeptideMatch ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Budget</div>
            <div className="mt-2 text-sm font-medium text-foreground">{session.lead?.budget ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Age Range</div>
            <div className="mt-2 text-sm font-medium text-foreground">{session.lead?.ageRange ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Started</div>
            <div className="mt-2 text-sm font-medium text-foreground">{new Date(session.firstSeenAt).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Duration</div>
            <div className="mt-2 text-sm font-medium text-foreground">{formatDuration(session.totalDurationMs)}</div>
          </div>
        </div>
      </div>

      {session.lead ? (
        <div className={cardClass()}>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            <h2 className="text-lg font-semibold">Key Lead Info</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Email", session.lead.email],
              ["Top Match", session.lead.topPeptideMatch],
              ["Budget", session.lead.budget],
              ["Age Range", session.lead.ageRange],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border px-4 py-3 text-sm">
                <div className="text-muted-foreground">{label}</div>
                <div className="mt-1 font-medium text-foreground">{value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.8fr)]">
        <div className="space-y-6">
          <div className={cardClass()}>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent" />
              <h2 className="text-lg font-semibold">Recent Engagement Timeline</h2>
            </div>
            <div className="mt-4 space-y-2">
              {mergedEvents.map((event) => (
                <div key={event.id} className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{event.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{event.subtitle}</div>
                  </div>
                  <div className="whitespace-nowrap text-xs text-muted-foreground">{event.createdAt.toLocaleString()}</div>
                </div>
              ))}
              {!mergedEvents.length ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No session events recorded yet.
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className={cardClass()}>
              <h2 className="text-lg font-semibold">Funnel Timeline</h2>
              <div className="mt-4 space-y-3">
                {funnelSteps.map((step) => (
                  <div key={step.label} className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{step.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {step.timestamp ? new Date(step.timestamp).toLocaleString() : "Not reached"}
                      </div>
                    </div>
                    <span className={step.complete ? "text-emerald-700" : "text-muted-foreground"}>
                      {step.complete ? "Complete" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={cardClass()}>
              <h2 className="text-lg font-semibold">Dimension Scores</h2>
              {session.lead?.dimensionScores?.length ? (
                <div className="mt-4 space-y-3">
                  {session.lead.dimensionScores.map((item) => (
                    <div key={item.dimension} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{item.dimension}</span>
                        <span className="text-muted-foreground">
                          {item.score}/{item.max}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Dimension scores appear after a completed quiz submission.
                </div>
              )}
            </div>
          </div>

          <div className={cardClass()}>
            <h2 className="text-lg font-semibold">Answers</h2>
            {session.lead?.decodedAnswers.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-3 py-3 font-medium">#</th>
                      <th className="px-3 py-3 font-medium">Question</th>
                      <th className="px-3 py-3 font-medium">Answer</th>
                      <th className="px-3 py-3 font-medium">Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.lead.decodedAnswers.map((item, index) => (
                      <tr key={`${item.question}-${index}`} className="border-b border-border/70 align-top">
                        <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                        <td className="px-3 py-3 text-foreground">{item.question}</td>
                        <td className="px-3 py-3 text-foreground">{item.answer}</td>
                        <td className="px-3 py-3 text-muted-foreground">{item.section}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                This session has not produced a quiz submission yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className={cardClass()}>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-accent" />
              <h2 className="text-lg font-semibold">Acquisition</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Referrer</dt>
                <dd className="text-right text-foreground">{formatReferrer(session.referrer)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Landing page</dt>
                <dd className="text-right text-foreground">{session.landingPath}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">UTM source</dt>
                <dd className="text-right text-foreground">{session.utmSource ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">UTM campaign</dt>
                <dd className="text-right text-foreground">{session.utmCampaign ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className={cardClass()}>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-accent" />
              <h2 className="text-lg font-semibold">Engagement</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Last path</dt>
                <dd className="text-right text-foreground">{session.lastPath ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Page views</dt>
                <dd className="text-right text-foreground">{session.pageViewCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tracked clicks</dt>
                <dd className="text-right text-foreground">{session.clicks.length + session.affiliateClicks.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Lead created</dt>
                <dd className="text-right text-foreground">{session.lead?.createdAt ? new Date(session.lead.createdAt).toLocaleString() : "No"}</dd>
              </div>
            </dl>
          </div>

          {session.lead ? (
            <>
              <div className={cardClass()}>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-accent" />
                  <h2 className="text-lg font-semibold">Lead Context</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Primary goal", session.lead.primaryGoal],
                    ["Tier", `Tier ${session.lead.tier}`],
                    ["Consent", session.lead.consentGiven ? "Given" : "Missing"],
                    ["Lead created", new Date(session.lead.createdAt).toLocaleString()],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border px-4 py-3 text-sm">
                      <div className="text-muted-foreground">{label}</div>
                      <div className="mt-1 font-medium text-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cardClass()}>
                <div className="flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-accent" />
                  <h2 className="text-lg font-semibold">Affiliate Clicks</h2>
                </div>
                <div className="mt-4 space-y-2">
                  {session.affiliateClicks.map((item, index) => (
                    <div key={`${item.vendor}-${item.clickedAt}-${index}`} className="rounded-lg border border-border px-4 py-3 text-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-foreground">{item.vendor}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{item.peptideId}</div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(item.clickedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!session.affiliateClicks.length ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No affiliate clicks yet for this lead.
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className={cardClass()}>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-accent" />
                <h2 className="text-lg font-semibold">Lead Status</h2>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                This visitor has not submitted the quiz yet, so there is no lead record or answer set attached to the session.
              </p>
            </div>
          )}

          <div className={cardClass()}>
            <h2 className="text-lg font-semibold">Page Views</h2>
            <div className="mt-4 space-y-2">
              {session.visits.map((visit) => (
                <div key={visit.id} className="rounded-lg border border-border px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-foreground">{visit.path}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{new Date(visit.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDuration(visit.durationMs)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cardClass()}>
            <h2 className="text-lg font-semibold">Tracked Clicks</h2>
            <div className="mt-4 space-y-2">
              {session.clicks.map((click) => (
                <div key={click.id} className="rounded-lg border border-border px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-foreground">{click.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {click.eventType} · {click.path}
                      </div>
                      {click.targetHref ? (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-accent">
                          <ExternalLink className="h-3 w-3" />
                          {click.targetHref}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(click.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
              {!session.clicks.length ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No click events recorded yet for this session.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
