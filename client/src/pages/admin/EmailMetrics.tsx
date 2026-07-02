import { useState } from "react";
import { Mail, Send, Eye, MousePointerClick, AlertTriangle, Ban, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function cardClass() {
  return "rounded-xl border border-border bg-white p-5";
}

function formatRate(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

const SEGMENTS = [
  { value: "30d" as const, label: "≤ 30 days" },
  { value: "31-90d" as const, label: "31–90 days" },
  { value: "90d+" as const, label: "90+ days" },
] as const;

const EMAIL_NAMES: Record<string, string> = {
  email_0_instant: "Email 0 — Instant",
  email_1_why_match: "Email 1 — Why match (Day 1)",
  email_2_cost: "Email 2 — Cost (Day 3)",
  email_3_side_effects: "Email 3 — Side effects (Day 5)",
  email_4_process: "Email 4 — Process (Day 7)",
  email_5_alternatives: "Email 5 — Alternatives (Day 10)",
  email_6_closer: "Email 6 — Closer (Day 14)",
  nudge_still_deciding: "Nudge — Still deciding",
  post_conversion: "Post-conversion",
  backfill_a: "Backfill A (≤30d)",
  backfill_b: "Backfill B (31-90d)",
  backfill_c: "Backfill C (90d+)",
};

export default function EmailMetrics() {
  const metrics = trpc.email.metrics.useQuery(undefined, {
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
  const [segment, setSegment] = useState<"30d" | "31-90d" | "90d+">("30d");
  const [dryRun, setDryRun] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [testSlug, setTestSlug] = useState<"email_0_instant" | "email_6_closer">("email_0_instant");

  const utils = trpc.useUtils();

  const backfillMutation = trpc.email.backfillSegment.useMutation({
    onSuccess: (data) => {
      if (data.dryRun) {
        toast.info(data.message);
      } else {
        toast.success(data.message);
        metrics.refetch();
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelMutation = trpc.email.cancelSequence.useMutation({
    onSuccess: () => {
      toast.success("Sequence cancelled + post-conversion email queued");
      utils.email.leadQueue.invalidate();
      metrics.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const testSendMutation = trpc.email.sendTestEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Test email sent! Resend ID: ${data.resendId}`);
    },
    onError: (error) => toast.error(error.message),
  });

  const m = metrics.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">Email Sequence</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          7-email drip + nudge + backfill for captured leads. Emails queued on quiz submission, sent on schedule within 9:00–10:30am ET window.
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className={cardClass()}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Queued</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{m?.totalQueued ?? "—"}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-2 text-accent"><Mail className="h-5 w-5" /></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">All emails in queue</p>
        </div>
        <div className={cardClass()}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{m?.totalSent ?? "—"}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-2 text-accent"><Send className="h-5 w-5" /></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{m?.emailsSentToday ?? 0} sent today</p>
        </div>
        <div className={cardClass()}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Opened</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {m?.totalOpened ?? "—"}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  ({formatRate(m?.totalOpened ?? 0, m?.totalSent ?? 0)})
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-accent/10 p-2 text-accent"><Eye className="h-5 w-5" /></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Unique opens</p>
        </div>
        <div className={cardClass()}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Clicked</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {m?.totalClicked ?? "—"}
                <span className="text-base font-normal text-muted-foreground ml-1">
                  ({formatRate(m?.totalClicked ?? 0, m?.totalOpened ?? 0)})
                </span>
              </p>
            </div>
            <div className="rounded-lg bg-accent/10 p-2 text-accent"><MousePointerClick className="h-5 w-5" /></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Click-to-open rate</p>
        </div>
        <div className={cardClass()}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Suppressed</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{m?.suppressedLeads ?? "—"}</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-2 text-accent"><Ban className="h-5 w-5" /></div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Unsubscribed / bounced</p>
        </div>
      </div>

      {/* Test Send */}
      <div className={cardClass()}>
        <h2 className="text-lg font-semibold">Test Send</h2>
        <p className="text-sm text-muted-foreground mt-1">Send email 0 or 6 to a test address. No queue — direct Resend send.</p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="rounded-lg border border-border px-3 py-2 text-sm w-64"
          />
          <select
            value={testSlug}
            onChange={(e) => setTestSlug(e.target.value as any)}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="email_0_instant">Email 0 — Instant</option>
            <option value="email_6_closer">Email 6 — Closer</option>
          </select>
          <button
            type="button"
            onClick={() => testSendMutation.mutate({ toEmail: testEmail, emailSlug: testSlug })}
            disabled={testSendMutation.isPending || !testEmail.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {testSendMutation.isPending ? "Sending..." : "Send Test"}
          </button>
        </div>
      </div>

      {/* Per-email breakdown */}
      <div className={cardClass()}>
        <h2 className="text-lg font-semibold">Per-Email Breakdown</h2>
        <p className="text-sm text-muted-foreground mt-1">Performance of each email in the sequence.</p>
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Queued</th>
                <th className="px-4 py-3 font-medium">Sent</th>
                <th className="px-4 py-3 font-medium">Opened</th>
                <th className="px-4 py-3 font-medium">Clicked</th>
                <th className="px-4 py-3 font-medium">Open Rate</th>
                <th className="px-4 py-3 font-medium">Click Rate</th>
              </tr>
            </thead>
            <tbody>
              {(m?.bySlug ?? []).map((row) => (
                <tr key={row.slug} className="border-b border-border/70">
                  <td className="px-4 py-3 font-medium">{EMAIL_NAMES[row.slug] ?? row.slug}</td>
                  <td className="px-4 py-3 tabular-nums">{row.queued}</td>
                  <td className="px-4 py-3 tabular-nums">{row.sent}</td>
                  <td className="px-4 py-3 tabular-nums">{row.opened}</td>
                  <td className="px-4 py-3 tabular-nums">{row.clicked}</td>
                  <td className="px-4 py-3 tabular-nums">{formatRate(row.opened, row.sent)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatRate(row.clicked, row.opened)}</td>
                </tr>
              ))}
              {!(m?.bySlug ?? []).length && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                    No email data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backfill controls */}
      <div className={cardClass()}>
        <h2 className="text-lg font-semibold">Backfill Historical Leads</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enqueue emails for leads captured before the sequence was live.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="flex gap-2">
            {SEGMENTS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSegment(s.value)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  segment === s.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:border-accent/50 hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded border-border"
            />
            Dry run
          </label>
          <button
            type="button"
            onClick={() => backfillMutation.mutate({ segment, dryRun })}
            disabled={backfillMutation.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {backfillMutation.isPending ? "Running..." : dryRun ? "Preview" : "Enqueue Emails"}
          </button>
        </div>
        {backfillMutation.data && (
          <div className="mt-3 rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
            {backfillMutation.data.message}
          </div>
        )}
      </div>

      {/* Delivery issues */}
      {(m?.totalBounced ?? 0) > 0 || (m?.totalFailed ?? 0) > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Delivery Issues</span>
          </div>
          <div className="mt-2 text-sm text-amber-700">
            {m?.totalBounced ?? 0} bounced &middot; {m?.totalFailed ?? 0} failed &middot; {m?.totalCancelled ?? 0} cancelled
          </div>
        </div>
      ) : null}
    </div>
  );
}
