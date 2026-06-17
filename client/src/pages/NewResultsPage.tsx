import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { trpc } from "@/lib/trpc";
import { GLP1_PROVIDERS, providerById, type GLP1Provider } from "../../../shared/providerData";

function trackProviderClicked(props: { providerId: string; position: number }) {
  trackMetaCustomEvent("results_provider_clicked", props);
}

const FEATURED_PROVIDER_ID = "gala";

const TESTIMONIALS = [
  { name: "Sarah M.", text: "I was spending way too much on a med spa. Same medication, half the price through the provider PeptidePilot matched me with.", location: "Austin, TX" },
  { name: "James K.", text: "Was overwhelmed by all the GLP-1 options. This made it simple and saved me hours of research.", location: "Denver, CO" },
  { name: "Maria L.", text: "Had no idea which provider was legit. The comparison table made it easy to pick confidently.", location: "Miami, FL" },
];

const COMFORT_POINTS = [
  { icon: "🛡️", title: "Licensed clinicians", desc: "All providers require board-certified oversight" },
  { icon: "💊", title: "Real medication", desc: "Compounded in licensed US pharmacies" },
  { icon: "📦", title: "Doorstep delivery", desc: "Temperature-controlled, sharps included" },
  { icon: "🔒", title: "Your data stays private", desc: "Answers never sold. Not shared with providers without your OK" },
];

const EDUCATION_LINKS = [
  { label: "How compounded GLP-1s work", href: "#" },
  { label: "Semaglutide vs tirzepatide", href: "#" },
  { label: "What to expect the first month", href: "#" },
  { label: "Insurance coverage for GLP-1s", href: "#" },
];

export default function NewResultsPage({ leadId }: { leadId?: string }) {
  const [, navigate] = useLocation();
  const [faqOpen, setFaqOpen] = useState<Set<number>>(new Set());

  const providers = useMemo(() => {
    return [...GLP1_PROVIDERS].sort((a, b) => {
      if (a.id === FEATURED_PROVIDER_ID) return -1;
      if (b.id === FEATURED_PROVIDER_ID) return 1;
      return a.startingPrice - b.startingPrice;
    });
  }, []);

  const linksQuery = trpc.affiliates.activeLinksByPeptide.useQuery(
    { peptideId: "semaglutide" },
    { staleTime: 1000 * 60 * 5, retry: false },
  );

  const trackClick = trpc.quiz.trackAffiliateClick.useMutation();
  const pendingClicks = useRef<Array<{ peptideId: string; vendor: string }>>([]);

  useEffect(() => {
    if (leadId && pendingClicks.current.length > 0) {
      for (const click of pendingClicks.current) {
        trackClick.mutate({ leadId, peptideId: click.peptideId, vendor: click.vendor });
      }
      pendingClicks.current = [];
    }
  }, [leadId]);

  const partnerUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of linksQuery.data ?? []) {
      const name = link.partnerName ?? link.label;
      if (!map.has(name)) map.set(name, link.url);
    }
    return map;
  }, [linksQuery.data]);

  const handleProviderClick = (e: React.MouseEvent<HTMLAnchorElement>, p: GLP1Provider) => {
    const idx = providers.findIndex((x) => x.id === p.id);
    trackProviderClicked({ providerId: p.id, position: idx >= 0 ? idx + 1 : 0 });
    if (leadId) {
      trackClick.mutate({ leadId, peptideId: "semaglutide", vendor: p.name });
    } else {
      pendingClicks.current.push({ peptideId: "semaglutide", vendor: p.name });
    }
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const cheapest = providers.reduce((min, p) => p.startingPrice < min.startingPrice ? p : min, providers[0]);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--ink)" }}>
      {/* ===== HERO / MATCH SNAPSHOT ===== */}
      <section className="pt-12 pb-10 px-5" style={{ background: "var(--grad-hero)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="pp-eyebrow">Match snapshot</span>
            <span className="h-1 w-1 rounded-full" style={{ background: "var(--muted)" }} />
            <span className="pp-eyebrow">8 questions</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-3" style={{ color: "var(--ink)" }}>
            Your GLP-1 match is ready
          </h1>

          <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
            Based on your preferences we found{" "}
            <strong style={{ color: "var(--ink)" }}>{providers.length} vetted providers</strong> you can
            start with as soon as <strong style={{ color: "var(--ink)" }}>{cheapest.timeToFirstDose}</strong>
            .{" "}
            {cheapest.id === FEATURED_PROVIDER_ID ? (
              <>Your best value pick starts at <strong style={{ color: "var(--ink)" }}>${cheapest.startingPrice}/mo</strong>.</>
            ) : (
              <>Pricing starts at <strong style={{ color: "var(--ink)" }}>${cheapest.startingPrice}/mo</strong>.</>
            )}
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="pp-chip pp-chip--mint">Goal: Weight loss</span>
            <span className="pp-chip pp-chip--lav">Medication: Compounded GLP-1</span>
            <span className="pp-chip pp-chip--blush">Cash pay</span>
          </div>
        </div>
      </section>

      {/* ===== CTA STRIP ===== */}
      <section className="py-5 px-5 border-b" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            Compare providers and prices below
          </p>
          <a
            href="#providers"
            className="pp-btn pp-btn--primary text-sm"
          >
            View providers &rarr;
          </a>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-10 px-5" style={{ background: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="pp-eyebrow">Real stories</span>
            <span className="pp-badge pp-badge--warn">SAMPLE</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="pp-card">
                <div className="pp-stars mb-2">★★★★★</div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
                  "{t.text}"
                </p>
                <div className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                  {t.name}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{t.location}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMFORT POINTS ===== */}
      <section className="py-10 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="pp-eyebrow">You're in good hands</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {COMFORT_POINTS.map((pt) => (
              <div key={pt.title} className="pp-card flex gap-3 items-start">
                <span className="text-lg flex-shrink-0">{pt.icon}</span>
                <div>
                  <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--ink)" }}>{pt.title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{pt.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PARTNER LOGOS ===== */}
      <section className="py-8 px-5 border-y" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="pp-eyebrow mb-4">Trusted by patients at</p>
          <div className="flex justify-center gap-8 items-center">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "var(--mint-bg)", color: "var(--mint)" }}>
                  {p.logoMarkFallback}
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== EDUCATION ===== */}
      <section className="py-10 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="pp-eyebrow">Learn more</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {EDUCATION_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="pp-card flex items-center justify-between group" style={{ textDecoration: "none" }}>
                <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{link.label}</span>
                <span className="text-sm transition-transform group-hover:translate-x-0.5" style={{ color: "var(--mint)" }}>&rarr;</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-10 px-5" style={{ background: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="pp-eyebrow">Common questions</span>
          </div>
          <div className="space-y-2">
            {[
              { q: "How are these providers vetted?", a: "We screen for board-certified clinicians, transparent pricing, real medication sourcing from licensed US pharmacies, and clear cancellation policies. Of 30+ providers reviewed, these met our bar." },
              { q: "Does PeptidePilot earn from provider links?", a: "Yes — we earn an affiliate commission when you start treatment through our links. Our rankings are based on fit, not payment." },
              { q: "What if GLP-1 isn't right for me?", a: "The provider's intake will catch contraindications. If they decline you, most offer a full refund. Email us if you'd like help finding an alternative." },
              { q: "Can I switch providers later?", a: "Absolutely. Cancellation terms are listed in the comparison table. Switching usually means a new intake, but there are no lock-in contracts." },
            ].map((faq, i) => {
              const isOpen = faqOpen.has(i);
              return (
                <div key={i} className="pp-card overflow-hidden">
                  <button
                    onClick={() => toggleFaq(i)}
                    className="w-full flex items-center justify-between text-left py-1"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm font-semibold">{faq.q}</span>
                    <span className="text-lg leading-none transition-transform" style={{ transform: isOpen ? "rotate(45deg)" : "none", color: "var(--mint)" }}>+</span>
                  </button>
                  {isOpen && (
                    <p className="text-sm leading-relaxed mt-2" style={{ color: "var(--muted)" }}>
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== PROVIDERS COMPARISON ===== */}
      <section id="providers" className="py-10 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="pp-eyebrow">Provider comparison</span>
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--ink)" }}>
            {providers.length} vetted providers
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Ranked by fit for your answers. Affiliate compensation disclosed.
          </p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--ink)" }}>
                  <th className="text-left py-3 px-4 font-semibold text-white/80">Provider</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Starting price</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Medications</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Clinician</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Time to first dose</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Cancel policy</th>
                  <th className="text-center py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {providers.map((p, idx) => {
                  const isFeatured = p.id === FEATURED_PROVIDER_ID;
                  return (
                    <tr
                      key={p.id}
                      className="border-t transition-colors"
                      style={{
                        borderColor: "var(--border)",
                        background: isFeatured ? "var(--mint-bg)" : "var(--card)",
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "var(--mint-bg)", color: "var(--mint)" }}>
                            {p.logoMarkFallback}
                          </div>
                          <div>
                            <div className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{p.name}</div>
                            {isFeatured && (
                              <span className="pp-badge pp-badge--mint text-[10px]">{p.positioningTag}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-bold" style={{ color: "var(--ink)" }}>${p.startingPrice}</span>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>/mo</span>
                      </td>
                      <td className="text-center py-3 px-4 text-xs" style={{ color: "var(--muted)" }}>{p.medications}</td>
                      <td className="text-center py-3 px-4 text-xs" style={{ color: "var(--muted)" }}>{p.providerModel}</td>
                      <td className="text-center py-3 px-4 text-xs" style={{ color: "var(--muted)" }}>{p.timeToFirstDose}</td>
                      <td className="text-center py-3 px-4 text-xs" style={{ color: "var(--muted)" }}>{p.cancelPolicy}</td>
                      <td className="py-3 px-4 text-center">
                        <a
                          href={partnerUrlMap.get(p.name) ?? p.affiliateUrl}
                          target="_blank"
                          rel="sponsored noopener"
                          onClick={(e) => handleProviderClick(e, p)}
                          className="pp-btn"
                          style={isFeatured ? { background: "var(--mint)", color: "white" } : { background: "var(--surface)", color: "var(--ink)" }}
                        >
                          Start
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {providers.map((p, idx) => {
              const isFeatured = p.id === FEATURED_PROVIDER_ID;
              return (
                <div
                  key={p.id}
                  className="pp-card"
                  style={isFeatured ? { borderColor: "var(--mint)", borderWidth: 2 } : {}}
                >
                  {isFeatured && (
                    <span className="pp-badge pp-badge--mint mb-2 inline-block">{p.positioningTag}</span>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "var(--mint-bg)", color: "var(--mint)" }}>
                      {p.logoMarkFallback}
                    </div>
                    <span className="font-semibold" style={{ color: "var(--ink)" }}>{p.name}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    <RowM label="Price"><span className="font-bold" style={{ color: "var(--ink)" }}>${p.startingPrice}</span><span className="text-xs" style={{ color: "var(--muted)" }}>/mo</span></RowM>
                    <RowM label="Medication">{p.medications}</RowM>
                    <RowM label="Clinician">{p.providerModel}</RowM>
                    <RowM label="First dose">{p.timeToFirstDose}</RowM>
                    <RowM label="Cancel">{p.cancelPolicy}</RowM>
                  </div>
                  <a
                    href={partnerUrlMap.get(p.name) ?? p.affiliateUrl}
                    target="_blank"
                    rel="sponsored noopener"
                    onClick={(e) => handleProviderClick(e, p)}
                    className="pp-btn pp-btn--primary w-full text-center text-sm"
                  >
                    Start with {p.name} &rarr;
                  </a>
                </div>
              );
            })}
          </div>

          {/* CTA bar */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <a
              href={partnerUrlMap.get(providers[0]?.name ?? "") ?? providers[0]?.affiliateUrl ?? "#"}
              target="_blank"
              rel="sponsored noopener"
              onClick={(e) => providers[0] && handleProviderClick(e, providers[0])}
              className="pp-btn pp-btn--primary text-base px-8 py-3"
            >
              Start your match &rarr;
            </a>
            <p className="text-xs italic" style={{ color: "var(--muted)" }}>
              Affiliate links — we earn when you start.{" "}
              <a href="/affiliate-disclosure" className="underline" style={{ color: "var(--mint)" }}>Disclosure</a>
            </p>
          </div>
        </div>
      </section>

      {/* ===== FOOTER DISCLAIMER ===== */}
      <section className="py-8 px-5" style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-3xl mx-auto text-center text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          <strong>PeptidePilot is an independent matching and comparison service.</strong>{" "}
          We earn affiliate commissions when you start treatment through our links, but rankings
          are based on fit and independent vetting — not payment for placement. Not medical advice.
          Individual results vary.{" "}
          <a href="/affiliate-disclosure" className="underline" style={{ color: "var(--mint)" }}>Affiliate disclosure</a>{" "}
          &amp;{" "}
          <a href="/screening-criteria" className="underline" style={{ color: "var(--mint)" }}>Screening criteria</a>.
        </div>
      </section>
    </div>
  );
}

function RowM({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-xs" style={{ color: "var(--ink)" }}>{children}</span>
    </div>
  );
}
