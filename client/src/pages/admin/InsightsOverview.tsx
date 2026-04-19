import { Activity, ListChecks, Mail, Search, Timer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

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
  clickCount?: number;
  clicks?: Array<unknown>;
}) {
  if (session.lead) return 100;
  const durationScore = Math.min(55, Math.round(session.totalDurationMs / 1000 / 6));
  const viewsScore = Math.min(30, session.pageViewCount * 6);
  const clickEvents = session.clickCount ?? session.clicks?.length ?? 0;
  const clickScore = Math.min(15, clickEvents * 5);
  return Math.min(99, durationScore + viewsScore + clickScore);
}

function statusPill(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "abandoned") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

export default function InsightsOverview() {
  const summary = trpc.analytics.summary.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });
  const sessions = trpc.analytics.recentSessions.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });
  const [, setLocation] = useLocation();

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
      label: "Quizzes Taken",
      value: summary.data?.totalQuizStarts ?? 0,
      icon: ListChecks,
      note: "Sessions that reached the quiz flow",
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
          <p className="text-sm text-muted-foreground">
            Newest visitor activity first. Showing the latest 250 sessions. Click a row for full session details.
          </p>
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

                return (
                  <tr
                    key={session.id}
                    onClick={() => setLocation(`/admin/sessions/${session.id}`)}
                    className="cursor-pointer border-b border-border/70 transition-colors hover:bg-accent/5"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{session.id.slice(0, 14)}...</td>
                    <td className="px-4 py-3 text-foreground">{session.lead?.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusPill(status)}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {session.lead ? (
                        <div className="space-y-1">
                          <div className="text-emerald-700">{session.lead.topPeptideMatch}</div>
                          <div className="text-xs text-muted-foreground">{session.lead.budget}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Tracking</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{session.lead ? "20/20" : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{session.utmSource ?? formatReferrer(session.referrer)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(session.firstSeenAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDuration(session.totalDurationMs)}</td>
                    <td className="px-4 py-3 text-accent">{session.pageViewCount}</td>
                    <td className="px-4 py-3 text-accent">{session.clickCount ?? 0}</td>
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
          <h2 className="text-lg font-semibold">Open a Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Click any row in the table to open a dedicated session view with the activity stream, funnel, dimension scores, and quiz answers.
          </p>
        </div>
      </div>
    </div>
  );
}
