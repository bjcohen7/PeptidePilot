import { useState } from "react";
import { ExternalLink, Search, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";

function cardClass() {
  return "rounded-xl border border-border bg-white p-5";
}

export default function LeakAudit() {
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = trpc.quiz.listLeadsWithoutResultsView.useQuery(undefined, {
    refetchOnMount: true,
  });

  const seenResults = data?.filter((l) => l.sawResults) ?? [];
  const leakedLeads = data?.filter((l) => !l.sawResults) ?? [];

  const isFbanUa = (ua: string) =>
    ua.includes("FBAN") || ua.includes("FBAV") || ua.includes("Instagram") || ua.includes("iPad;") || ua.includes("iPhone;");

  const filteredLeaked = search
    ? leakedLeads.filter(
        (l) =>
          l.email.toLowerCase().includes(search.toLowerCase()) ||
          l.leadId.toLowerCase().includes(search.toLowerCase()),
      )
    : leakedLeads;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="w-6 h-6 text-accent" />
          Lead Leak Audit
        </h1>
        <button
          onClick={() => refetch()}
          className="text-sm text-accent hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className={cardClass()}>
          <div className="text-2xl font-bold">{data?.length ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">Leads (last 30d)</div>
        </div>
        <div className={cardClass()}>
          <div className="text-2xl font-bold text-red-600">{leakedLeads.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Leaked (no results view)</div>
        </div>
        <div className={cardClass()}>
          <div className="text-2xl font-bold text-green-600">{seenResults.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Saw results</div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by email or lead ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border/60 bg-white h-10 pl-10 pr-4 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Created</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Source</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">User-Agent</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Last Path</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">Link</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-red-500">
                  Failed to load leak data. Is the database accessible?
                </td>
              </tr>
            )}
            {filteredLeaked.map((lead) => {
              const isFban = isFbanUa(lead.userAgent ?? "");
              return (
                <tr key={lead.leadId} className="border-b border-border/40 hover:bg-muted/30">
                  <td className="py-2 px-3 max-w-[200px] truncate">{lead.email}</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2 px-3">{lead.source ?? "—"}</td>
                  <td className="py-2 px-3">
                    {isFban ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        FB/IG in-app
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">standard</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground max-w-[120px] truncate">
                    {lead.lastPath ?? "—"}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      Leaked
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <a
                      href={lead.resultsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-1"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
            {!isLoading && !error && filteredLeaked.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  {search ? "No matches." : "No leaked leads. All good!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
