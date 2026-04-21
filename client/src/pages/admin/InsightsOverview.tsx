import { Activity, Check, ExternalLink, ListChecks, Mail, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
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

function statusPill(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "abandoned") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function formatRate(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default function InsightsOverview() {
  const utils = trpc.useUtils();
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
  const deleteSession = trpc.analytics.deleteSession.useMutation({
    onSuccess: async ({ deletedLeadCount }) => {
      toast.success(deletedLeadCount ? "Session and linked lead deleted." : "Session deleted.");
      await Promise.all([
        utils.analytics.summary.invalidate(),
        utils.analytics.recentSessions.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const totalSessions = summary.data?.totalSessions ?? 0;
  const totalQuizStarts = summary.data?.totalQuizStarts ?? 0;
  const totalLeads = summary.data?.totalLeads ?? 0;
  const totalAffiliateClicks = summary.data?.totalAffiliateClicks ?? 0;
  const leadsWithAffiliateClicks = summary.data?.leadsWithAffiliateClicks ?? 0;
  const topReferrer = summary.data?.topReferrers?.[0];

  const assistantNotes = [
    `${formatRate(totalQuizStarts, totalSessions)} of visitors start the quiz (${totalQuizStarts}/${totalSessions}).`,
    `${formatRate(totalLeads, totalQuizStarts)} of quiz starters become leads (${totalLeads}/${totalQuizStarts || 0}).`,
    `${formatRate(leadsWithAffiliateClicks, totalLeads)} of leads click at least one affiliate partner (${leadsWithAffiliateClicks}/${totalLeads || 0}).`,
    totalAffiliateClicks
      ? `You have ${totalAffiliateClicks} total affiliate click${totalAffiliateClicks === 1 ? "" : "s"} across all sessions.`
      : "No affiliate partner clicks yet, so this is the next behavior worth watching.",
  ];

  const opportunityNote =
    totalQuizStarts && totalLeads < totalQuizStarts
      ? "Biggest opportunity right now: improve the step between quiz completion and email submit."
      : totalLeads && !leadsWithAffiliateClicks
        ? "Leads are coming in, but nobody is clicking through to partners yet. Results-page CTA clarity is the first thing I’d tune."
        : totalLeads && leadsWithAffiliateClicks
          ? "The funnel is moving end to end. Next useful question is which referrers and partners produce the best-quality leads."
          : "Once a little more live traffic comes in, this panel will start telling a much clearer conversion story.";

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
      label: "Affiliate Clicks",
      value: summary.data?.totalAffiliateClicks ?? 0,
      icon: ExternalLink,
      note: "Tracked outbound partner clicks",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Scan live traffic quickly, then click into a session to see referral context, affiliate activity, and the full quiz profile once a lead is created.
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              Conversion Assistant
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Plain-English readout of how visitors move from landing to quiz to lead to partner click.
            </p>
          </div>
          {topReferrer ? (
            <div className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              Top referrer: <span className="font-medium text-foreground">{formatReferrer(topReferrer.referrer)}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {assistantNotes.map((note) => (
            <div key={note} className="rounded-lg border border-border px-4 py-3 text-sm text-foreground">
              {note}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {opportunityNote}
        </div>
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
                <th className="px-4 py-3 font-medium">Affiliate Click</th>
                <th className="px-4 py-3 font-medium">Partner Clicked</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(sessions.data ?? []).map((session) => {
                const status = getSessionStatus(session);

                return (
                  <tr
                    key={session.id}
                    onMouseEnter={() => {
                      void utils.analytics.sessionById.prefetch({ sessionId: session.id });
                    }}
                    onFocus={() => {
                      void utils.analytics.sessionById.prefetch({ sessionId: session.id });
                    }}
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
                    <td className="px-4 py-3">
                      {session.affiliateClickCount ? (
                        <span className="inline-flex items-center text-emerald-600" aria-label="Affiliate link clicked">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rose-600" aria-label="No affiliate link clicked">
                          <X className="h-4 w-4" />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {session.affiliateVendors?.length ? session.affiliateVendors.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const confirmed = window.confirm(
                            "Delete this session and any linked lead, clicks, visits, and affiliate records? This can’t be undone.",
                          );
                          if (!confirmed) return;
                          deleteSession.mutate({ sessionId: session.id });
                        }}
                        disabled={deleteSession.isPending}
                        className="inline-flex items-center gap-2 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
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
