import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { twoPropTest } from "@/lib/stats";
import type { VariantConfig } from "../../../../drizzle/schema";

const C = {
  bg: "#F6F7F9", card: "#FFFFFF", inner: "#FAFBFC",
  border: "#E6E9EF", innerBorder: "#EDF0F5",
  ink: "#0E1320", mut: "#6B7484", faint: "#98A1B0",
  green: "#16A34A", greenBg: "#EAF7EF",
  blue: "#2563EB", blueBg: "#EBF1FE",
  orange: "#F59E0B", orangeBg: "#FDF3E2",
  cyan: "#0891B2", cyanBg: "#E6F6FA",
  violet: "#8B5CF6", violetBg: "#F3EEFE",
  pink: "#EC4899", pinkBg: "#FDEBF4",
  red: "#DC2626", redBg: "#FDEBEB",
};

const VC = [
  { line: "#98A1B0", bg: "#F1F3F6", text: "#6B7484" },
  { line: C.blue, bg: C.blueBg, text: C.blue },
  { line: C.violet, bg: C.violetBg, text: C.violet },
  { line: C.orange, bg: C.orangeBg, text: C.orange },
];

const STEPS = ["Sessions", "Quiz Start", "Quiz Complete", "Results View", "Affiliate Click"];
const NAV = [
  { group: "Analytics", items: [{ key: "overview", label: "Overview" }] },
  { group: "Testing", items: [{ key: "experiments", label: "Experiments" }, { key: "funnels", label: "Funnels" }, { key: "events", label: "Events" }] },
  { group: "System", items: [{ key: "sessions", label: "Sessions" }, { key: "config", label: "Config" }] },
];

const fmt = (n: number) => n.toLocaleString();
const rate = (a: number, b: number) => (b ? (a / b) * 100 : 0);

function Micro({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 10, letterSpacing: "0.09em", fontWeight: 600, color: C.mut, textTransform: "uppercase", whiteSpace: "nowrap", ...style }}>{children}</div>;
}

function StatusPill({ status }: { status: string }) {
  const m: Record<string, { c: string; bg: string; t: string }> = {
    running: { c: C.blue, bg: C.blueBg, t: "RUNNING" },
    winner: { c: C.green, bg: C.greenBg, t: "WINNER" },
    draft: { c: C.mut, bg: "#EFF1F5", t: "DRAFT" },
    paused: { c: C.orange, bg: C.orangeBg, t: "PAUSED" },
    archived: { c: C.faint, bg: "#EFF1F5", t: "ARCHIVED" },
  };
  const s = m[status] ?? m.draft;
  return <span className="rounded px-1.5 py-0.5" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: s.c, background: s.bg }}>{s.t}</span>;
}

function Delta({ v }: { v: number | null | undefined }) {
  if (v == null || !isFinite(v)) return null;
  const good = v >= 0;
  return (
    <span className="rounded px-1.5 py-0.5" style={{ fontSize: 10, fontWeight: 700, color: good ? C.green : C.red, background: good ? C.greenBg : C.redBg }}>
      {good ? "▲" : "▼"} {Math.abs(v).toFixed(0)}%
    </span>
  );
}

function Bars({ data, color, height = 30 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 0.001);
  return (
    <svg width="100%" height={height} preserveAspectRatio="none" viewBox={`0 0 ${data.length * 6} ${height}`}>
      {data.map((v, i) => {
        const h = Math.max((v / max) * (height - 2), 1.5);
        return <rect key={i} x={i * 6} y={height - h} width={4} height={h} rx={1} fill={color} />;
      })}
    </svg>
  );
}

function Panel({ title, right, children, className = "" }: { title: string; right?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={"rounded-lg border " + className} style={{ borderColor: C.border, background: C.card }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2 gap-2">
        <Micro style={{ color: C.ink, fontSize: 10.5 }}>{title}</Micro>
        {right && <Micro style={{ color: C.faint, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>{right}</Micro>}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

function VChip({ vi, name }: { vi: number; name: string }) {
  return (
    <span className="rounded px-1.5 py-0.5" style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: VC[vi].text, background: VC[vi].bg }}>
      {name.replace("variant_", "V").toUpperCase()}
    </span>
  );
}

function TrendChart({ data, series }: {
  data: Record<string, string | number>[];
  series: { key: string; label: string; color: string; dash?: boolean }[];
}) {
  const W = 400, H = 120;
  const pad = 28;
  const x = (i: number) => pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
  const allVals = series.flatMap((s) => data.map((r) => Number(r[s.key])).filter((v) => isFinite(v)));
  const yMin = 0;
  const yMax = Math.max(...allVals, 0.001) * 1.3;
  const y = (v: number) => H - pad - ((v - yMin) / (yMax - yMin)) * (H - pad * 2);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {[0.25, 0.5, 0.75].map((r) => (
        <g key={r}>
          <line x1={pad} x2={W - pad} y1={y(yMax * r)} y2={y(yMax * r)} stroke={C.innerBorder} strokeWidth="1" />
          <text x={pad - 4} y={y(yMax * r) + 3} textAnchor="end" fontSize="9" fill={C.faint}>{(yMax * r).toFixed(0)}%</text>
        </g>
      ))}
      {data.map((r, i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill={C.faint}>{String(r.d)}</text>
      ))}
      {series.map((s) => {
        const pts = data.filter((r) => r[s.key] != null).map((r, i) => `${x(data.indexOf(r))},${y(Number(r[s.key]))}`).join(" ");
        return (
          <g key={s.key}>
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash ? "4 3" : "none"} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
}

/* ====== Stat Helpers ====== */

function bestVsControl(exp: {
  variants: { name: string; label: string; funnel: number[] }[];
}) {
  const ctrl = exp.variants[0];
  let bestResult: {
    v: typeof exp.variants[0];
    t: { z: number; p: number; probBeat: number };
  } | null = null;
  for (const v of exp.variants.slice(1)) {
    const t = twoPropTest(ctrl.funnel[4], ctrl.funnel[0], v.funnel[4], v.funnel[0]);
    if (!bestResult || t.probBeat > bestResult.t.probBeat) bestResult = { v, t };
  }
  if (!bestResult) return null;
  const cr = rate(ctrl.funnel[4], ctrl.funnel[0]);
  const vr = rate(bestResult.v.funnel[4], bestResult.v.funnel[0]);
  return { v: bestResult.v, t: bestResult.t, lift: cr ? (vr / cr - 1) * 100 : 0 };
}

function mkSeries(seed: number, n: number, base: number, amp: number, trend = 0) {
  const out: number[] = []; let x = seed;
  for (let i = 0; i < n; i++) { x = (x * 9301 + 49297) % 233280; out.push(Math.max(0.5, base + ((x / 233280) - 0.5) * 2 * amp + trend * i)); }
  return out;
}

/* ========== Sidebar ========== */
function Sidebar({ view, setView }: { view: string; setView: (v: string) => void }) {
  return (
    <aside className="hidden lg:flex flex-col w-44 shrink-0 border-r px-3 py-4 gap-4 sticky top-0 h-screen" style={{ borderColor: C.border, background: C.card }}>
      <div className="flex items-center gap-2 px-1">
        <span className="w-5 h-5 rounded-md flex items-center justify-center text-white" style={{ background: C.blue, fontSize: 10, fontWeight: 800 }}>P</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>PeptidePilot</span>
      </div>
      {NAV.map((g) => (
        <div key={g.group}>
          <Micro style={{ padding: "0 10px 6px", color: C.faint }}>{g.group}</Micro>
          {g.items.map((it) => {
            const active = view === it.key;
            return (
              <button key={it.key} onClick={() => setView(it.key)}
                className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left"
                style={{ background: active ? "#EEF1F6" : "transparent", color: active ? C.ink : C.mut, fontSize: 12.5, fontWeight: active ? 600 : 500 }}>
                {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.blue }} />}
                {it.label}
              </button>
            );
          })}
        </div>
      ))}
      <div className="mt-auto rounded-md border px-3 py-2.5" style={{ borderColor: C.innerBorder, background: C.inner }}>
        <Micro style={{ color: C.faint }}>Tracking</Micro>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.green }} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Live</span>
        </div>
      </div>
    </aside>
  );
}

/* ========== Views ========== */

function OverviewView({ experiments, goExperiment }: {
  experiments: {
    id: string; name: string; slug: string; status: string; started: string; days: number;
    hypothesis: string; trend: Record<string, string | number>[];
    variants: { id?: number; name: string; label: string; weight: number; funnel: number[]; config: string[] }[];
  }[];
  goExperiment: (id: string) => void;
}) {
  const totalSessions = experiments.reduce((s, e) => s + (e.variants[0]?.funnel[0] ?? 0), 0);
  const totalLeads = experiments.reduce((s, e) => s + (e.variants[0]?.funnel[4] ?? 0), 0);
  const running = experiments.filter((e) => e.status === "running").length;
  const winners = experiments.filter((e) => e.status === "winner").length;

  const { data: eventRows = [] } = trpc.experiments.events.useQuery({ limit: 8 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Panel title="Active Experiments" right="currently running">
          <div className="text-3xl font-bold" style={{ color: C.ink }}>{running}</div>
          <div className="text-sm" style={{ color: C.mut }}>{experiments.length} total</div>
        </Panel>
        <Panel title="Winner Declared">
          <div className="text-3xl font-bold" style={{ color: C.ink }}>{winners}</div>
        </Panel>
        <Panel title="Total Sessions">
          <div className="text-3xl font-bold" style={{ color: C.ink }}>{fmt(totalSessions)}</div>
        </Panel>
        <Panel title="Total Affiliate Clicks">
          <div className="text-3xl font-bold" style={{ color: C.ink }}>{fmt(totalLeads)}</div>
        </Panel>
      </div>

      <div className="space-y-2">
        {experiments.map((e) => {
          const b = bestVsControl(e);
          const live = e.status !== "draft";
          const sig = b && live ? b.t : null;
          const decided = sig && sig.p < 0.05;
          return (
            <button key={e.id} onClick={() => goExperiment(e.id)}
              className="w-full rounded-lg border p-4 flex items-center gap-4 text-left transition-colors hover:bg-gray-50"
              style={{ borderColor: C.border, background: C.card }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontWeight: 700, color: C.ink }}>{e.name}</span>
                  <StatusPill status={e.status} />
                  {decided && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: C.greenBg, color: C.green }}>SIGNIFICANT</span>}
                </div>
                <div className="text-sm mt-1" style={{ color: C.mut }}>{e.hypothesis || "No hypothesis"}</div>
                <div className="flex items-center gap-4 mt-2">
                  {e.variants.map((v, vi) => (
                    <div key={v.name} className="flex items-center gap-1"><VChip vi={vi} name={v.name} /><span className="text-xs" style={{ color: C.faint }}>{v.weight}%</span></div>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs" style={{ color: C.faint }}>{e.started}</div>
                {b && live && <div className="text-xs font-bold mt-0.5" style={{ color: b.lift >= 0 ? C.green : C.red }}>{b.lift >= 0 ? "+" : ""}{b.lift.toFixed(0)}% lift</div>}
              </div>
            </button>
          );
        })}
      </div>

      <Panel title="Latest activity" right="experiment_events">
        <div className="space-y-1">
          {(eventRows ?? []).slice(0, 8).map((e, i) => (
            <div key={i} className="flex items-center gap-2 py-1 border-b last:border-0" style={{ borderColor: C.innerBorder }}>
              <span style={{ fontSize: 10.5, color: C.faint, width: 70 }}>{e.t}</span>
              <span className="rounded px-1.5 py-0.5" style={{ fontSize: 9.5, fontWeight: 700, background: e.event === "affiliate_click" ? C.greenBg : "#EFF1F5", color: e.event === "affiliate_click" ? C.green : C.mut }}>{e.event}</span>
              <span style={{ fontSize: 11, color: C.mut }} className="truncate">{e.exp}</span>
              <span className="ml-auto"><VChip vi={e.vi} name={e.variant} /></span>
            </div>
          ))}
          {!eventRows?.length && <div className="text-sm" style={{ color: C.faint }}>No events yet</div>}
        </div>
      </Panel>
    </div>
  );
}

function ExperimentsView({ experiments, selId, setSelId, openModal }: {
  experiments: {
    id: string; name: string; slug: string; status: string; started: string; days: number;
    hypothesis: string; trend: Record<string, string | number>[];
    variants: { id?: number; name: string; label: string; weight: number; funnel: number[]; config: string[] }[];
  }[];
  selId: string;
  setSelId: (id: string) => void;
  openModal: () => void;
}) {
  const exp = experiments.find((e) => e.id === selId) ?? experiments[0];
  const best = useMemo(() => bestVsControl(exp), [exp]);
  const ctrl = exp.variants[0];
  const totals = STEPS.map((_, i) => exp.variants.reduce((s, v) => s + v.funnel[i], 0));
  const live = exp.status !== "draft";
  const sig = best && live ? best.t : null;
  const decided = sig && sig.p < 0.05;
  const maxRate = Math.max(...exp.variants.map((v) => rate(v.funnel[4], v.funnel[0])), 0.001);

  const kpis = [
    { label: "Sessions", value: fmt(totals[0]), sub: live ? Math.round(totals[0] / Math.max(exp.days, 1)) + " / day" : "not started", color: C.green, series: mkSeries(1, 28, totals[0] / 28 || 4, totals[0] / 80 || 1, 0.4), delta: null as number | null },
    { label: "Quiz Start", value: rate(totals[1], totals[0]).toFixed(1) + "%", sub: fmt(totals[1]) + " starts", color: C.blue, series: mkSeries(2, 28, 60, 9), delta: best ? rate(ctrl.funnel[1], ctrl.funnel[0]) - rate(best.v.funnel[1], best.v.funnel[0]) : null },
    { label: "Quiz Complete", value: rate(totals[2], totals[0]).toFixed(1) + "%", sub: fmt(totals[2]) + " completes", color: C.cyan, series: mkSeries(3, 28, 48, 8), delta: best ? rate(ctrl.funnel[1], ctrl.funnel[0]) - rate(best.v.funnel[2], best.v.funnel[0]) : null },
    { label: "Results View", value: rate(totals[3], totals[0]).toFixed(1) + "%", sub: fmt(totals[3]) + " views", color: C.violet, series: mkSeries(4, 28, 44, 7), delta: best ? rate(ctrl.funnel[1], ctrl.funnel[0]) - rate(best.v.funnel[3], best.v.funnel[0]) : null },
    { label: "Click Rate", value: rate(totals[4], totals[0]).toFixed(1) + "%", sub: fmt(totals[4]) + " clicks", color: C.orange, series: mkSeries(5, 28, 10, 3, 0.08), delta: best ? rate(ctrl.funnel[4], ctrl.funnel[0]) - rate(best.v.funnel[4], best.v.funnel[0]) : null },
    { label: "Best Lift", value: best && live ? (best.lift >= 0 ? "+" : "") + best.lift.toFixed(0) + "%" : "—", sub: best && live ? best.v.label + " vs control" : "awaiting data", color: C.pink, series: mkSeries(6, 28, 8, 4, 0.15), delta: null },
  ];

  const trendSeries = exp.variants.map((v, vi) => ({ key: v.name, label: v.label, color: VC[vi].line, dash: vi === 0 }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5 overflow-x-auto" style={{ borderColor: C.border, background: C.card }}>
          {experiments.map((e) => (
            <button key={e.id} onClick={() => setSelId(e.id)}
              className="rounded-md px-2.5 py-1 text-sm font-medium"
              style={{ background: e.id === selId ? C.bg : "transparent", color: e.id === selId ? C.ink : C.mut }}>
              {e.name}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button onClick={openModal} className="rounded-lg px-3 py-1.5 text-white" style={{ background: C.blue, fontSize: 12.5, fontWeight: 600 }}>+ New</button>
        </div>
      </div>

      {decided && (
        <div className="rounded-lg border p-3 flex items-center gap-3" style={{ borderColor: C.green, background: C.greenBg }}>
          <span style={{ color: C.green, fontSize: 16 }}>🏆</span>
          <div>
            <span style={{ fontWeight: 700, color: C.ink }}>{best!.v.label}</span>
            <span style={{ color: C.mut }}> is winning — p = {sig!.p.toFixed(4)}, {best!.lift.toFixed(0)}% lift over control</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Panel key={kpi.label}>
            <Micro>{kpi.label}</Micro>
            <div className="text-xl font-bold mt-0.5" style={{ color: C.ink }}>{kpi.value}</div>
            <div className="text-xs" style={{ color: C.faint }}>{kpi.sub}</div>
            <div className="mt-2"><Bars data={kpi.series} color={kpi.color} height={28} /></div>
            {kpi.delta != null && (
              <div className="mt-2"><Delta v={kpi.delta} /></div>
            )}
          </Panel>
        ))}
      </div>

      <Panel title="Conversion Rate Trend" right="affiliate click ÷ sessions">
        <div className="w-full overflow-x-auto">
          <div style={{ minWidth: 400 }}>
            <TrendChart data={exp.trend} series={trendSeries} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {trendSeries.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span style={{ fontSize: 10.5, color: C.mut }}>{s.label}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Funnel by Variant">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left pb-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>STEP</th>
              {exp.variants.map((v, vi) => (
                <th key={v.name} className="text-right pb-2"><VChip vi={vi} name={v.name} /></th>
              ))}
              <th className="text-right pb-2" style={{ color: C.mut, fontSize: 10.5, fontWeight: 600 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {STEPS.map((step, si) => (
              <tr key={step} className="border-b" style={{ borderColor: C.innerBorder }}>
                <td className="py-1.5" style={{ color: C.mut }}>{step}</td>
                {exp.variants.map((v) => (
                  <td key={v.name} className="text-right py-1.5" style={{ color: C.ink }}>{v.funnel[si] ? fmt(v.funnel[si]) : "—"}</td>
                ))}
                <td className="text-right py-1.5 font-semibold" style={{ color: C.ink }}>{fmt(totals[si])}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-1.5" style={{ color: C.mut }}>Click Rate</td>
              {exp.variants.map((v) => (
                <td key={v.name} className="text-right pt-1.5 font-semibold" style={{ color: C.ink }}>
                  {rate(v.funnel[4], v.funnel[0]).toFixed(1)}%
                </td>
              ))}
              <td className="text-right pt-1.5 font-semibold" style={{ color: C.ink }}>
                {rate(totals[4], totals[0]).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <Panel title="Experiment Config">
        <div className="grid grid-cols-2 gap-4">
          <div><Micro>Name</Micro><div style={{ fontSize: 13, color: C.ink }}>{exp.name}</div></div>
          <div><Micro>Slug</Micro><div style={{ fontSize: 13, color: C.ink }}>{exp.slug}</div></div>
          <div><Micro>Duration</Micro><div style={{ fontSize: 13, color: C.ink }}>{exp.started}</div></div>
          <div><Micro>Hypothesis</Micro><div style={{ fontSize: 13, color: C.mut }}>{exp.hypothesis || "—"}</div></div>
        </div>
        <div className="mt-4">
          <Micro>Variants</Micro>
          {exp.variants.map((v, vi) => (
            <div key={v.name} className="flex items-center gap-2 mt-2">
              <VChip vi={vi} name={v.name} />
              <span className="text-sm" style={{ color: C.ink }}>{v.label}</span>
              <span className="text-xs" style={{ color: C.faint }}>{v.weight}% traffic</span>
              <span className="text-xs ml-auto" style={{ color: C.faint }}>{v.config.join(", ") || "—"}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function FunnelsView({ experiments }: {
  experiments: {
    id: string; name: string; slug: string; status: string; started: string; days: number;
    hypothesis: string; trend: Record<string, string | number>[];
    variants: { id?: number; name: string; label: string; weight: number; funnel: number[]; config: string[] }[];
  }[];
}) {
  const selExp = experiments[0];
  if (!selExp) return <div style={{ color: C.faint, fontSize: 13 }}>No experiments to show.</div>;

  const { data: dropoff } = trpc.experiments.questionDropoff.useQuery(
    { experimentId: Number(selExp.id) },
    { enabled: Boolean(selExp.id) },
  );

  const maxQ = Math.max(...(dropoff?.map((d) => d.question) ?? [0]));
  const questionLabels = Array.from({ length: maxQ }, (_, i) => `Q${i + 1}`);

  const allVariantPcts: { vi: number; label: string; vals: number[] }[] = [];
  const variantSet = new Set(dropoff?.map((d) => d.vi) ?? []);
  for (const vi of variantSet) {
    const rows = dropoff?.filter((d) => d.vi === vi) ?? [];
    const vals = questionLabels.map((_, qi) => {
      const r = rows.find((d) => d.question === qi + 1);
      return r ? r.retained : 100;
    });
    const label = experiments[0]?.variants[vi]?.label ?? `V${vi}`;
    allVariantPcts.push({ vi, label, vals });
  }

  const { data: eventRows = [] } = trpc.experiments.events.useQuery({
    limit: 50,
    event: "quiz_question",
  }, {
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-4">
      <Panel title={`${selExp.name} — Quiz Question Drop-off`}>
        {dropoff && dropoff.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>QUESTION</th>
                  {allVariantPcts.map((v) => (
                    <th key={v.vi} className="text-right pb-2"><VChip vi={v.vi} name={v.label} /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questionLabels.map((ql, qi) => (
                  <tr key={ql} className="border-b" style={{ borderColor: C.innerBorder }}>
                    <td className="py-1.5" style={{ color: C.mut }}>{ql}</td>
                    {allVariantPcts.map((v) => (
                      <td key={v.vi} className="text-right py-1.5" style={{ color: C.ink }}>{v.vals[qi]?.toFixed(0)}%</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: C.faint, fontSize: 13 }}>No quiz question events yet.</div>
        )}
      </Panel>

      <Panel title="Quiz Question Events" right="question_dropoff">
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {eventRows.slice(0, 100).map((e, i) => (
            <div key={i} className="flex items-center gap-2 py-1 border-b last:border-0" style={{ borderColor: C.innerBorder }}>
              <span style={{ fontSize: 10.5, color: C.faint, width: 70 }}>{e.t}</span>
              <span className="rounded px-1.5 py-0.5" style={{ fontSize: 9.5, fontWeight: 700, background: "#EFF1F5", color: C.mut }}>{e.event}</span>
              <span style={{ fontSize: 11, color: C.mut }} className="truncate">{e.page ?? "—"}</span>
              <span className="ml-auto"><VChip vi={e.vi} name={e.variant} /></span>
            </div>
          ))}
          {!eventRows.length && <div style={{ color: C.faint, fontSize: 13 }}>No events yet</div>}
        </div>
      </Panel>
    </div>
  );
}

function EventsView() {
  const [eventFilter, setEventFilter] = useState("");
  const { data: eventRows = [] } = trpc.experiments.events.useQuery({
    event: eventFilter || undefined,
    limit: 200,
  }, { refetchInterval: 10000 });

  const events = eventRows;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          placeholder="Filter by event name…"
          className="rounded-lg border px-3 py-1.5 text-sm flex-1 max-w-xs"
          style={{ borderColor: C.border, background: C.card, color: C.ink }}
        />
        <span className="text-xs" style={{ color: C.faint }}>{events.length} events</span>
      </div>
      <div className="rounded-lg border overflow-x-auto" style={{ borderColor: C.border, background: C.card }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: C.innerBorder }}>
              <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>TIME</th>
              <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>SESSION</th>
              <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>EVENT</th>
              <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>PAGE</th>
              <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>EXPERIMENT</th>
              <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>VARIANT</th>
              <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>META</th>
            </tr>
          </thead>
          <tbody>
            {events.map((r, i) => (
              <tr key={i} className="border-b last:border-0" style={{ borderColor: C.innerBorder }}>
                <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: C.faint, fontSize: 11 }}>{r.t}</td>
                <td className="px-3 py-1.5 font-mono" style={{ color: C.mut, fontSize: 10.5 }}>{r.session?.slice(0, 16)}…</td>
                <td className="px-3 py-1.5"><span className="rounded px-1.5 py-0.5" style={{ fontSize: 9.5, fontWeight: 700, background: "#EFF1F5", color: C.mut }}>{r.event}</span></td>
                <td className="px-3 py-1.5" style={{ color: C.mut, fontSize: 11 }}>{r.page || "—"}</td>
                <td className="px-3 py-1.5" style={{ color: C.ink, fontSize: 11 }}>{r.exp}</td>
                <td className="px-3 py-1.5"><VChip vi={r.vi} name={r.variant} /></td>
                <td className="px-3 py-1.5 truncate" style={{ color: C.faint, fontSize: 10.5, maxWidth: 200 }}>{r.meta}</td>
              </tr>
            ))}
            {!events.length && (
              <tr><td colSpan={7} className="text-center py-4" style={{ color: C.faint }}>No events found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionsView() {
  const { data: sessions = [] } = trpc.experiments.sessions.useQuery(undefined, { refetchInterval: 10000 });

  return (
    <div className="rounded-lg border overflow-x-auto" style={{ borderColor: C.border, background: C.card }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: C.innerBorder }}>
            <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>STARTED</th>
            <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>SESSION</th>
            <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>LANDING</th>
            <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>REF</th>
            <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>UTM</th>
            <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>ASSIGNMENTS</th>
            <th className="text-left px-3 py-2" style={{ color: C.faint, fontWeight: 600, fontSize: 10.5, letterSpacing: "0.07em" }}>EVENTS</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => (
            <tr key={i} className="border-b last:border-0" style={{ borderColor: C.innerBorder }}>
              <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: C.faint, fontSize: 11 }}>{s.started}</td>
              <td className="px-3 py-1.5 font-mono" style={{ color: C.mut, fontSize: 10.5 }}>{s.sessionId?.slice(0, 16)}…</td>
              <td className="px-3 py-1.5" style={{ color: C.mut, fontSize: 11 }}>{s.landing}</td>
              <td className="px-3 py-1.5" style={{ color: C.mut, fontSize: 11 }}>{s.ref}</td>
              <td className="px-3 py-1.5" style={{ color: C.mut, fontSize: 11 }}>{s.utm}</td>
              <td className="px-3 py-1.5">
                <div className="flex flex-wrap gap-1">
                  {s.assignments.map((a, ai) => (
                    <span key={ai} className="rounded px-1 py-0.5" style={{ fontSize: 9, fontWeight: 700, background: "#EFF1F5", color: C.mut }}>
                      {a.slug}:{a.variant}
                    </span>
                  ))}
                  {!s.assignments.length && <span style={{ color: C.faint, fontSize: 10.5 }}>—</span>}
                </div>
              </td>
              <td className="px-3 py-1.5" style={{ color: C.ink, fontWeight: 600 }}>{s.eventCount}</td>
            </tr>
          ))}
          {!sessions.length && (
            <tr><td colSpan={7} className="text-center py-4" style={{ color: C.faint }}>No sessions yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ConfigView() {
  const { data: experiments = [] } = trpc.experiments.list.useQuery();
  const utils = trpc.useUtils();

  const update = trpc.experiments.update.useMutation({
    onSuccess: () => utils.experiments.list.invalidate(),
  });

  const setStatus = trpc.experiments.setStatus.useMutation({
    onSuccess: () => utils.experiments.list.invalidate(),
  });

  return (
    <div className="space-y-4">
      {experiments.map((exp) => (
        <Panel key={exp.id} title={exp.name} right={<StatusPill status={exp.status} />}>
          <div className="grid grid-cols-2 gap-4">
            <div><Micro>ID</Micro><div style={{ fontSize: 13, color: C.ink }}>{exp.id}</div></div>
            <div><Micro>Slug</Micro><div style={{ fontSize: 13, color: C.ink }}>{exp.slug}</div></div>
            <div><Micro>Started</Micro><div style={{ fontSize: 13, color: C.ink }}>{exp.started}</div></div>
            <div><Micro>Hypothesis</Micro><div style={{ fontSize: 13, color: C.mut }}>{exp.hypothesis}</div></div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Micro>Status Actions:</Micro>
            <button onClick={() => setStatus.mutate({ id: Number(exp.id), status: "draft" })} className="rounded px-2 py-1" style={{ fontSize: 11, fontWeight: 600, background: "#EFF1F5", color: C.mut }}>Draft</button>
            <button onClick={() => setStatus.mutate({ id: Number(exp.id), status: "running" })} className="rounded px-2 py-1" style={{ fontSize: 11, fontWeight: 600, background: C.blueBg, color: C.blue }}>Run</button>
            <button onClick={() => setStatus.mutate({ id: Number(exp.id), status: "paused" })} className="rounded px-2 py-1" style={{ fontSize: 11, fontWeight: 600, background: C.orangeBg, color: C.orange }}>Pause</button>
            <button onClick={() => setStatus.mutate({ id: Number(exp.id), status: "winner" })} className="rounded px-2 py-1" style={{ fontSize: 11, fontWeight: 600, background: C.greenBg, color: C.green }}>Winner</button>
            <button onClick={() => setStatus.mutate({ id: Number(exp.id), status: "archived" })} className="rounded px-2 py-1" style={{ fontSize: 11, fontWeight: 600, background: C.redBg, color: C.red }}>Archive</button>
          </div>
        </Panel>
      ))}
      {!experiments.length && <div style={{ color: C.faint, fontSize: 13 }}>No experiments yet.</div>}
    </div>
  );
}

function NewExperimentModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const create = trpc.experiments.create.useMutation({
    onSuccess: () => {
      utils.experiments.list.invalidate();
      onClose();
    },
    onError: (err) => alert(err.message),
  });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [variants, setVariants] = useState([
    { name: "control", label: "Control", funnel: ["quiz_flow", "quiz_complete", "results", "affiliate_click"], config: {} },
    { name: "variant_a", label: "Variant A", funnel: ["quiz_flow", "quiz_complete", "results", "affiliate_click"], config: {} },
  ]);

  const handleCreate = () => {
    if (!name.trim()) return alert("Name is required");
    if (!slug.trim()) return alert("Slug is required");
    if (variants.length < 2) return alert("At least 2 variants required");

    const totalWeight = variants.reduce((s, _, i) => s + Math.round(100 / variants.length), 0);
    create.mutate({
      name: name.trim(),
      slug: slug.trim(),
      hypothesis: hypothesis.trim() || undefined,
      variants: variants.map((v, i) => ({
        ...v,
        trafficWeight: Math.round(100 / variants.length) + (i === 0 ? 100 - totalWeight : 0),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="rounded-xl border shadow-xl w-full max-w-lg mx-4" style={{ borderColor: C.border, background: C.card }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: C.border }}>
          <span style={{ fontWeight: 700, color: C.ink }}>New Experiment</span>
          <button onClick={onClose} style={{ color: C.faint, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <Micro>Name</Micro>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hero Image Test" className="w-full rounded-lg border px-3 py-2 text-sm mt-1" style={{ borderColor: C.border, color: C.ink }} />
          </div>
          <div>
            <Micro>Slug</Micro>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. hero-image-test" className="w-full rounded-lg border px-3 py-2 text-sm mt-1" style={{ borderColor: C.border, color: C.ink }} />
          </div>
          <div>
            <Micro>Hypothesis (optional)</Micro>
            <input value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="e.g. New hero image increases quiz starts" className="w-full rounded-lg border px-3 py-2 text-sm mt-1" style={{ borderColor: C.border, color: C.ink }} />
          </div>
          <div>
            <Micro>Variants</Micro>
            {variants.map((v, i) => (
              <div key={i} className="flex items-center gap-2 mt-2">
                <input value={v.name} onChange={(e) => { const vv = [...variants]; vv[i] = { ...vv[i], name: e.target.value }; setVariants(vv); }} placeholder="name" className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.border, color: C.ink }} />
                <input value={v.label} onChange={(e) => { const vv = [...variants]; vv[i] = { ...vv[i], label: e.target.value }; setVariants(vv); }} placeholder="label" className="flex-1 rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.border, color: C.ink }} />
                {variants.length > 2 && (
                  <button onClick={() => setVariants(variants.filter((_, j) => j !== i))} style={{ color: C.red, fontSize: 16, lineHeight: 1 }}>×</button>
                )}
              </div>
            ))}
            {variants.length < 6 && (
              <button onClick={() => setVariants([...variants, { name: "", label: "", funnel: ["quiz_flow", "quiz_complete", "results", "affiliate_click"], config: {} }])}
                className="mt-2 text-sm font-medium" style={{ color: C.blue }}>+ Add variant</button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: C.border }}>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ color: C.mut }}>Cancel</button>
          <button onClick={handleCreate} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: C.blue }}>
            {create.isPending ? "Creating…" : "Create Experiment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========== Page Component ========== */

export default function ExperimentsPage() {
  const [view, setView] = useState("experiments");
  const [selId, setSelId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  const { data: experiments = [] } = trpc.experiments.list.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const TITLES: Record<string, string> = {
    overview: "Overview", experiments: "Experiments", funnels: "Funnels",
    events: "Event Log", sessions: "Sessions", config: "Config",
  };

  const goExperiment = (id: string) => { setSelId(id); setView("experiments"); };

  if (!experiments.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Experiments</h1>
            <p className="text-sm text-muted-foreground mt-1">No experiments yet. Create your first A/B test.</p>
          </div>
          <button onClick={() => setModal(true)} className="rounded-lg px-4 py-2 text-white" style={{ background: C.blue, fontSize: 13, fontWeight: 600 }}>+ New experiment</button>
        </div>
        {modal && <NewExperimentModal onClose={() => setModal(false)} />}
      </div>
    );
  }

  const safeSelId = selId ?? experiments[0].id;

  return (
    <div className="min-h-screen" style={{ background: C.bg, color: C.ink }}>
      <div className="flex">
        <Sidebar view={view} setView={setView} />
        <div className="flex-1 min-w-0">
          <header className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: C.border, background: C.card }}>
            <div className="flex items-center gap-2">
              <span className="lg:hidden w-5 h-5 rounded-md flex items-center justify-center text-white" style={{ background: C.blue, fontSize: 10, fontWeight: 800 }}>P</span>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{TITLES[view]}</span>
              <Micro style={{ color: C.faint, marginLeft: 6 }}>PeptidePilot · Testing</Micro>
            </div>
            <span className="rounded-lg border px-3 py-1.5" style={{ borderColor: C.border, fontSize: 12, fontWeight: 600, color: C.mut, background: C.card }}>All time</span>
          </header>
          <main className="p-5 max-w-7xl">
            {view === "overview" && <OverviewView experiments={experiments} goExperiment={goExperiment} />}
            {view === "experiments" && <ExperimentsView experiments={experiments} selId={safeSelId} setSelId={setSelId} openModal={() => setModal(true)} />}
            {view === "funnels" && <FunnelsView experiments={experiments} />}
            {view === "events" && <EventsView />}
            {view === "sessions" && <SessionsView />}
            {view === "config" && <ConfigView />}
          </main>
        </div>
      </div>
      {modal && <NewExperimentModal onClose={() => setModal(false)} />}
    </div>
  );
}
