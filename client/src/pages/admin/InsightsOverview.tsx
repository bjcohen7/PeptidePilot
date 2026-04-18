import { useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Mail, MousePointerClick, Search, Timer } from "lucide-react";
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

function getEngagementScore(session: {
  totalDurationMs: number;
  pageViewCount: number;
  lead: unknown | null;
  clicks: Array<unknown>;
}) {
  if (session.lead) return 100;
  const durationScore = Math.min(55, Math.round(session.totalDurationMs / 1000 / 6));
  const viewsScore = Math.min(30, session.pageViewCount * 6);
  const clickScore = Math.min(15, session.clicks.length * 5);
  return Math.min(99, durationScore + viewsScore + clickScore);
}

function statusPill(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "abandoned") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

export default function InsightsOverview() {
  const summary = trpc.analytics.summary.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const sessions = trpc.analytics.recentSessions.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSessionId && sessions.data?.[0]?.id) {
      setSelectedSessionId(sessions.data[0].id);
    }
  }, [selectedSessionId, sessions.data]);

  const selectedSession = useMemo(
    () => sessions.data?.find((session) => session.id === selectedSessionId) ?? sessions.data?.[0] ?? null,
    [selectedSessionId, sessions.data]
  );

  const cards = [
    {
      label: "Visitor Sessions",
      value: summary.data?.totalSessions ?? 0,
      icon: Activity,
      note: "First-party tracked visits",
    },
    {
      label: "Quiz Leads",
      value: summary.data?.totalLeads ?? 0,
      icon: Mail,
      note: "Submitted email + consent",
    },
    {
      label: "Tracked Clicks",
      value: summary.data?.totalClicks ?? 0,
      icon: MousePointerClick,
      note: "Internal, CTA, and outbound clicks",
    },
    {
      label: "Completion Rate",
      value: `${summary.data?.quizCompletionRate ?? 0}%`,
      icon: Search,
      note: "Sessions that became leads",
    },
    {
      label: "Avg. Engagement",
      value: `${summary.data?.avgEngagementSeconds ?? 0}s`,
      icon: Timer,
      note: "Tracked public-site time",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Scan live traffic quickly, then click into a session to see referral context, engagement, click behavior, and the full quiz profile once a lead is created.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className={cardClass()}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
              </div>
              <div className="rounded-lg bg-accent/10 p-2 text-accent">
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{card.note}</p>
          </div>
        ))}
      </div>

      <div className={cardClass()}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Session Table</h2>
          <p className="text-sm text-muted-foreground">Newest visitor activity first. Click a row for full session details.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Session ID</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Insights</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Views</th>
                <th className="px-4 py-3 font-medium">Clicks</th>
                <th className="px-4 py-3 font-medium">Engaged</th>
              </tr>
            </thead>
            <tbody>
              {(sessions.data ?? []).map((session) => {
                const status = getSessionStatus(session);
                const engagement = getEngagementScore(session);
                const isSelected = selectedSession?.id === session.id;

                return (
                  <tr
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`cursor-pointer border-b border-border/70 transition-colors hover:bg-accent/5 ${
                      isSelected ? "bg-accent/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{session.id.slice(0, 14)}...</td>
                    <td className="px-4 py-3 text-foreground">{session.lead?.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusPill(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={session.lead ? "text-emerald-700" : "text-muted-foreground"}>
                        {session.lead ? "Ready" : "Tracking"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{session.lead ? "20/20" : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{session.utmSource ?? formatReferrer(session.referrer)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(session.firstSeenAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDuration(session.totalDurationMs)}</td>
                    <td className="px-4 py-3 text-accent">{session.pageViewCount}</td>
                    <td className="px-4 py-3 text-accent">{session.clicks.length + session.affiliateClicks.length}</td>
                    <td className="px-4 py-3">
                      <span className={engagement >= 80 ? "text-emerald-700" : engagement >= 50 ? "text-amber-700" : "text-muted-foreground"}>
                        {engagement}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!sessions.data?.length ? (
          <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            No session data yet. Once public visitors start moving through the site, this table will populate automatically.
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className={cardClass()}>
          <h2 className="text-lg font-semibold">Top Referrers</h2>
          <p className="mt-1 text-sm text-muted-foreground">The highest-volume sources we’ve seen so far.</p>
          <div className="mt-4 space-y-3">
            {(summary.data?.topReferrers ?? []).map((item) => (
              <div key={item.referrer ?? "unknown"} className="rounded-lg border border-border px-4 py-3">
                <div className="text-sm font-medium text-foreground">{formatReferrer(item.referrer)}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.count} sessions</div>
              </div>
            ))}
            {!(summary.data?.topReferrers ?? []).length ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                No referral data yet. Direct visits and new campaign traffic will show up here once the site has more live traffic.
              </div>
            ) : null}
          </div>
        </div>

        <div className={cardClass()}>
          {selectedSession ? (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{selectedSession.lead?.email ?? "Anonymous visitor"}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Session started {new Date(selectedSession.firstSeenAt).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg bg-secondary px-3 py-2 text-right">
                  <div className="text-xs text-muted-foreground">Total tracked time</div>
                  <div className="text-lg font-semibold">{formatDuration(selectedSession.totalDurationMs)}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Search className="h-4 w-4 text-accent" />
                    Acquisition
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Referrer</dt>
                      <dd className="text-right text-foreground">{formatReferrer(selectedSession.referrer)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Landing page</dt>
                      <dd className="text-right text-foreground">{selectedSession.landingPath}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">UTM source</dt>
                      <dd className="text-right text-foreground">{selectedSession.utmSource ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">UTM campaign</dt>
                      <dd className="text-right text-foreground">{selectedSession.utmCampaign ?? "—"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Clock3 className="h-4 w-4 text-accent" />
                    Engagement
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Last path</dt>
                      <dd className="text-right text-foreground">{selectedSession.lastPath ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Page views</dt>
                      <dd className="text-right text-foreground">{selectedSession.pageViewCount}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Tracked clicks</dt>
                      <dd className="text-right text-foreground">{selectedSession.clicks.length + selectedSession.affiliateClicks.length}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Lead created</dt>
                      <dd className="text-right text-foreground">
                        {selectedSession.lead?.createdAt ? new Date(selectedSession.lead.createdAt).toLocaleString() : "No"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-3">Page timeline</h3>
                <div className="space-y-2">
                  {selectedSession.visits.map((visit) => (
                    <div key={visit.id} className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{visit.path}</div>
                        <div className="text-xs text-muted-foreground">{new Date(visit.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-muted-foreground whitespace-nowrap">{formatDuration(visit.durationMs)}</div>
                    </div>
                  ))}
                  {!selectedSession.visits.length ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No page timeline recorded yet for this session.
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-3">Click timeline</h3>
                <div className="space-y-2">
                  {selectedSession.clicks.map((click) => (
                    <div key={click.id} className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">{click.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {click.eventType} · {click.path}
                          {click.targetHref ? ` · ${click.targetHref}` : ""}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(click.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {!selectedSession.clicks.length ? (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      No click events recorded yet for this session.
                    </div>
                  ) : null}
                </div>
              </div>

              {selectedSession.lead ? (
                <>
                  <div>
                    <h3 className="text-base font-semibold mb-3">Lead summary</h3>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-lg border border-border px-4 py-3 text-sm">
                        <div className="text-muted-foreground">Email</div>
                        <div className="mt-1 font-medium text-foreground">{selectedSession.lead.email}</div>
                      </div>
                      <div className="rounded-lg border border-border px-4 py-3 text-sm">
                        <div className="text-muted-foreground">Age range</div>
                        <div className="mt-1 font-medium text-foreground">{selectedSession.lead.ageRange}</div>
                      </div>
                      <div className="rounded-lg border border-border px-4 py-3 text-sm">
                        <div className="text-muted-foreground">Budget</div>
                        <div className="mt-1 font-medium text-foreground">{selectedSession.lead.budget}</div>
                      </div>
                      <div className="rounded-lg border border-border px-4 py-3 text-sm">
                        <div className="text-muted-foreground">Primary goal</div>
                        <div className="mt-1 font-medium text-foreground">{selectedSession.lead.primaryGoal}</div>
                      </div>
                      <div className="rounded-lg border border-border px-4 py-3 text-sm">
                        <div className="text-muted-foreground">Top match</div>
                        <div className="mt-1 font-medium text-foreground">{selectedSession.lead.topPeptideMatch}</div>
                      </div>
                      <div className="rounded-lg border border-border px-4 py-3 text-sm">
                        <div className="text-muted-foreground">Tier</div>
                        <div className="mt-1 font-medium text-foreground">Tier {selectedSession.lead.tier}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-3">Affiliate clicks</h3>
                    <div className="space-y-2">
                      {selectedSession.affiliateClicks.map((item, index) => (
                        <div key={`${item.vendor}-${item.clickedAt}-${index}`} className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{item.vendor}</div>
                            <div className="text-xs text-muted-foreground">{item.peptideId}</div>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(item.clickedAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                      {!selectedSession.affiliateClicks.length ? (
                        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                          No affiliate clicks yet for this lead.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold mb-3">Quiz answers</h3>
                    <div className="space-y-3">
                      {selectedSession.lead.decodedAnswers.map((item, index) => (
                        <div key={`${item.question}-${index}`} className="rounded-lg border border-border px-4 py-3">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {item.section}
                          </div>
                          <div className="mt-1 text-sm font-medium text-foreground">{item.question}</div>
                          <div className="mt-2 text-sm text-muted-foreground">{item.answer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                  This visitor has not submitted the quiz yet, so there is no lead record or answer set attached to the session.
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Choose a session to inspect.</div>
          )}
        </div>
      </div>
    </div>
  );
}
