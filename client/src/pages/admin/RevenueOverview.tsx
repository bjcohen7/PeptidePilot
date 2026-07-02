import { useMemo, useState } from "react";
import { DollarSign, AlertTriangle, TrendingUp, Link2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function card() {
  return "rounded-xl border border-border bg-white p-5";
}
function usd(cents: number | null | undefined) {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

export default function RevenueOverview() {
  const perProvider = trpc.revenue.perProvider.useQuery();
  const perSource = trpc.revenue.perSource.useQuery();
  const attribution = trpc.revenue.attribution.useQuery();
  const alerts = trpc.revenue.alerts.useQuery();
  const leadQuality = trpc.revenue.leadQuality.useQuery();
  const recent = trpc.revenue.recent.useQuery();
  const utils = trpc.useUtils();

  const providerOptions = useMemo(
    () => (perProvider.data ?? []).map((p) => ({ slug: p.providerSlug, name: p.displayName })),
    [perProvider.data],
  );

  // Manual entry form
  const [providerSlug, setProviderSlug] = useState("");
  const [subid, setSubid] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");

  const createManual = trpc.revenue.createManual.useMutation({
    onSuccess: (r) => {
      if (r.duplicate) { toast.warning("Already recorded (idempotent) — not double-counted."); return; }
      toast.success(r.resolved ? `Recorded & linked to lead ${r.leadId}.` : "Recorded (subid did not resolve to a lead — flagged).");
      setSubid(""); setLeadEmail(""); setAmount(""); setDate("");
      utils.revenue.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerSlug) { toast.error("Pick a provider."); return; }
    if (!subid && !leadEmail) { toast.error("Provide a subid or a lead email."); return; }
    createManual.mutate({
      providerSlug,
      subid: subid || undefined,
      leadEmail: leadEmail || undefined,
      amountDollars: amount ? Number(amount) : undefined,
      date: date || undefined,
    });
  };

  const totalRevenue = (perProvider.data ?? []).reduce((s, p) => s + p.revenueCents, 0);
  const totalConversions = (perProvider.data ?? []).reduce((s, p) => s + p.conversions, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2"><DollarSign className="w-6 h-6" /> Revenue</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Conversions joined back to sessions via subid ({"{publicId}-{providerSlug}"}). EPC, per-source revenue, attribution, and tracking-leak alerts.
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className={card()}><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-2xl font-semibold">{usd(totalRevenue)}</p></div>
        <div className={card()}><p className="text-sm text-muted-foreground">Conversions</p><p className="text-2xl font-semibold">{totalConversions}</p></div>
        <div className={card()}><p className="text-sm text-muted-foreground">Providers tracked</p><p className="text-2xl font-semibold">{providerOptions.length}</p></div>
      </div>

      {/* Per provider */}
      <div className={card()}>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Per provider — EPC</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-4">Provider</th><th className="py-2 pr-4">Clicks</th><th className="py-2 pr-4">Conv.</th>
              <th className="py-2 pr-4">Rate</th><th className="py-2 pr-4">Revenue</th><th className="py-2 pr-4">EPC</th>
            </tr></thead>
            <tbody>
              {(perProvider.data ?? []).map((p) => (
                <tr key={p.providerSlug} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{p.displayName}</td>
                  <td className="py-2 pr-4">{p.clicks}</td>
                  <td className="py-2 pr-4">{p.conversions}</td>
                  <td className="py-2 pr-4">{pct(p.conversionRate)}</td>
                  <td className="py-2 pr-4">{usd(p.revenueCents)}</td>
                  <td className="py-2 pr-4 font-semibold">{usd(p.epcCents)}</td>
                </tr>
              ))}
              {!perProvider.data?.length && <tr><td colSpan={6} className="py-3 text-muted-foreground">No data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per source */}
      <div className={card()}>
        <h2 className="font-semibold mb-3">Per acquisition source</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-4">Entry surface</th><th className="py-2 pr-4">utm_campaign</th><th className="py-2 pr-4">utm_content</th>
              <th className="py-2 pr-4">Conv.</th><th className="py-2 pr-4">Revenue</th>
            </tr></thead>
            <tbody>
              {(perSource.data ?? []).map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded-full bg-secondary text-xs">{r.entrySurface}</span></td>
                  <td className="py-2 pr-4">{r.utmCampaign}</td>
                  <td className="py-2 pr-4">{r.utmContent}</td>
                  <td className="py-2 pr-4">{r.conversions}</td>
                  <td className="py-2 pr-4 font-semibold">{usd(r.revenueCents)}</td>
                </tr>
              ))}
              {!perSource.data?.length && <tr><td colSpan={5} className="py-3 text-muted-foreground">No resolved conversions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attribution */}
      <div className={card()}>
        <h2 className="font-semibold mb-3">Attribution split</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(attribution.data?.buckets ?? []).map((b) => (
            <div key={b.bucket} className="rounded-lg border border-border/60 p-4">
              <p className="text-sm text-muted-foreground">{b.bucket.replace(/_/g, " ")}</p>
              <p className="text-xl font-semibold">{usd(b.revenueCents)}</p>
              <p className="text-xs text-muted-foreground">{b.conversions} conversion(s)</p>
            </div>
          ))}
          {!attribution.data?.buckets?.length && <p className="text-muted-foreground text-sm">No conversions yet.</p>}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Heuristic: "email attributed" = the lead clicked an email at/before the conversion; otherwise "same session". "unresolved" = subid didn't map to a lead.
        </p>
      </div>

      {/* Alerts */}
      <div className={card()}>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Tracking-leak alerts</h2>
        <p className="text-sm font-medium mb-1">Conversions with no logged /go click ({alerts.data?.noClick.length ?? 0})</p>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <tbody>
              {(alerts.data?.noClick ?? []).map((a: any) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-4 font-mono text-xs">{a.subid}</td>
                  <td className="py-1.5 pr-4">{a.providerSlug}</td>
                  <td className="py-1.5 pr-4">{usd(a.amountCents)}</td>
                  <td className="py-1.5 pr-4">{a.resolved ? "" : <span className="text-amber-600">unresolved</span>}</td>
                </tr>
              ))}
              {!alerts.data?.noClick.length && <tr><td className="py-1.5 text-muted-foreground">None — clean.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-sm font-medium mb-1">Click→conversion gap beyond cookie window ({alerts.data?.staleGap.length ?? 0})</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {(alerts.data?.staleGap ?? []).map((a: any) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-4 font-mono text-xs">{a.subid}</td>
                  <td className="py-1.5 pr-4">{a.providerSlug}</td>
                  <td className="py-1.5 pr-4 text-amber-600">{a.gapDays}d gap &gt; {a.windowDays}d window</td>
                </tr>
              ))}
              {!alerts.data?.staleGap.length && <tr><td className="py-1.5 text-muted-foreground">None — clean.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead quality */}
      <div className={card()}>
        <h2 className="font-semibold mb-3">Lead-quality hint (read-only)</h2>
        <p className="text-xs text-muted-foreground mb-3">Quiz-answer index distribution, converting vs non-converting. Answer indices map to option order (goal Q1, insurance Q7, budget Q20).</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([["Goal", leadQuality.data?.goal], ["Insurance", leadQuality.data?.insurance], ["Budget", leadQuality.data?.budget]] as const).map(([label, rows]) => (
            <div key={label} className="rounded-lg border border-border/60 p-3">
              <p className="text-sm font-medium mb-2">{label}</p>
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground text-left"><th>answer</th><th>cohort</th><th>n</th></tr></thead>
                <tbody>
                  {(rows ?? []).map((r: any, i: number) => (
                    <tr key={i}><td>{String(r.answerIndex)}</td><td>{r.cohort === "converting" ? <b>converting</b> : "non-conv."}</td><td>{r.n}</td></tr>
                  ))}
                  {!rows?.length && <tr><td colSpan={3} className="text-muted-foreground">No data.</td></tr>}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Manual entry */}
      <div className={card()}>
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Link2 className="w-4 h-4" /> Manual conversion entry</h2>
        <form onSubmit={submitManual} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          <select value={providerSlug} onChange={(e) => setProviderSlug(e.target.value)} className="h-10 rounded-lg border border-border px-3 text-sm">
            <option value="">Select provider…</option>
            {providerOptions.map((p) => <option key={p.slug} value={p.slug}>{p.name} ({p.slug})</option>)}
          </select>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (USD, optional)" inputMode="decimal" className="h-10 rounded-lg border border-border px-3 text-sm" />
          <input value={subid} onChange={(e) => setSubid(e.target.value)} placeholder="subid  (publicId-providerSlug)" className="h-10 rounded-lg border border-border px-3 text-sm font-mono" />
          <input value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="…or lead email to look up" type="email" className="h-10 rounded-lg border border-border px-3 text-sm" />
          <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date (ISO, optional — defaults to now)" className="h-10 rounded-lg border border-border px-3 text-sm" />
          <button type="submit" disabled={createManual.isPending} className="h-10 rounded-lg bg-accent text-white font-semibold text-sm disabled:opacity-60">
            {createManual.isPending ? "Recording…" : "Record conversion"}
          </button>
        </form>
      </div>

      {/* Recent */}
      <div className={card()}>
        <h2 className="font-semibold mb-3">Recent conversions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-4">When</th><th className="py-2 pr-4">Provider</th><th className="py-2 pr-4">subid</th>
              <th className="py-2 pr-4">Type</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Source</th><th className="py-2 pr-4">Lead</th>
            </tr></thead>
            <tbody>
              {(recent.data ?? []).map((c: any) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(c.occurredAt).toLocaleString()}</td>
                  <td className="py-2 pr-4">{c.providerSlug}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{c.subid}</td>
                  <td className="py-2 pr-4">
                    {c.conversionType === "rebill" ? <span className="text-blue-600">rebill</span> : c.conversionType}
                    {c.needsReview && <span className="ml-1 text-amber-600" title="No transaction id — dedup fell back to time bucket">⚑</span>}
                  </td>
                  <td className="py-2 pr-4">{usd(c.amountCents)}</td>
                  <td className="py-2 pr-4">{c.source}</td>
                  <td className="py-2 pr-4">{c.resolved ? (c.email ?? c.leadId) : <span className="text-amber-600">unresolved</span>}</td>
                </tr>
              ))}
              {!recent.data?.length && <tr><td colSpan={7} className="py-3 text-muted-foreground">No conversions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
