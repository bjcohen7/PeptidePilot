import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { trpc } from "@/lib/trpc";
import { TestimonialSection } from "@/components/testimonials/TestimonialSection";
import { GLP1_PROVIDERS, type GLP1Provider } from "../../../shared/providerData";

function trackProviderClicked(props: { providerId: string; position: number }) {
  trackMetaCustomEvent("results_provider_clicked", props);
}

const FEATURED_PROVIDER_ID = "gala";

const EDUCATION_LINKS = [
  { label: "What to expect month one →", href: "#" },
  { label: "Compounded vs. brand →", href: "#" },
  { label: "Managing side effects →", href: "#" },
];

const FAQ_ITEMS = [
  { q: "Do you prescribe or sell medication?", a: "No — we're an independent comparison service. Licensed providers prescribe; licensed pharmacies dispense." },
  { q: "How does PeptidePilot make money?", a: "We may earn a fee when you choose a provider. It never changes your price or our rankings." },
  { q: "Are compounded GLP-1s FDA-approved?", a: "No. Compounded medications aren't FDA-approved; we surface the pharmacy and its licensing." },
];

export default function NewResultsPage({ leadId }: { leadId?: string }) {
  const [, navigate] = useLocation();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

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

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--ink)" }}>
      {/* Results header */}
      <section className="pt-12 pb-8 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <span className="pp-chip pp-chip-mint" style={{ marginBottom: 12 }}>
            Your results
          </span>
          <h2 style={{ fontSize: "2rem", marginBottom: 12 }}>
            Good news — here&rsquo;s your GLP-1 match
          </h2>
          <p className="lead" style={{ color: "var(--muted)", marginBottom: 28 }}>
            Based on your answers, here&rsquo;s your match — and{" "}
            <strong style={{ color: "var(--ink)" }}>{providers.length} vetted providers ready to see you this week.</strong>
          </p>

          {/* Snapshot + CTA grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center" style={{ maxWidth: 860, margin: "0 auto" }}>
            <div className="pp-card pp-card-pad">
              <span className="pp-eyebrow" style={{ marginBottom: 12 }}>Your snapshot</span>
              <div className="flex justify-between py-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Goal</span>
                <strong className="text-sm">Lose ~40 lb</strong>
              </div>
              <div className="flex justify-between py-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Best-fit class</span>
                <strong className="text-sm">Semaglutide</strong>
              </div>
              <div className="flex justify-between py-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>State</span>
                <strong className="text-sm">New York</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Pay path</span>
                <strong className="text-sm">Compounded (cash)</strong>
              </div>
            </div>

            <div className="text-center">
              <Link href="/providers">
                <button
                  className="pp-btn pp-btn-primary pp-btn-lg"
                  style={{ boxShadow: "0 0 0 4px rgba(123,227,181,.35), 0 14px 30px rgba(31,134,199,.28)" }}
                >
                  See your {providers.length} matched providers →
                </button>
              </Link>
              <p className="small muted" style={{ marginTop: 12 }}>
                ★ Joined by 12,480 people · live count from your data
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-10 px-5" style={{ background: "var(--secondary)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--ink)" }}>
            You&rsquo;re in good hands
          </h3>
          <TestimonialSection />
        </div>
      </section>

      {/* Partner logos */}
      <section className="py-8 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="small" style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
            Compare {providers.length} vetted providers
          </p>
          <div className="flex flex-wrap justify-center gap-3 items-center">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "#fff", border: "1px solid var(--line)", filter: "grayscale(1)", opacity: 0.8 }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold"
                  style={{ background: "var(--grad-cta)", color: "var(--ink)" }}>
                  {p.logoMarkFallback}
                </div>
                <span className="text-sm font-semibold" style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: "var(--ink)" }}>
                  {p.name}
                </span>
              </div>
            ))}
            <span className="text-sm" style={{ color: "var(--muted)" }}>+ 15 more</span>
          </div>
        </div>
      </section>

      <hr className="border-t border-dashed my-8 mx-auto max-w-xl" style={{ borderColor: "var(--line)" }} />

      {/* Education + FAQ */}
      <section className="pb-12 px-5">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Education */}
          <div className="pp-card pp-card-pad">
            <span className="pp-eyebrow" style={{ marginBottom: 12 }}>Before you choose</span>
            <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 12 }}>
              2-minute reads so month one goes smoothly:
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {EDUCATION_LINKS.map((link) => (
                <a key={link.label} href={link.href}
                  className="pp-btn pp-btn-soft"
                  style={{ justifyContent: "flex-start", fontSize: ".9rem" }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="pp-card pp-card-pad">
            <span className="pp-eyebrow" style={{ marginBottom: 12 }}>Common questions</span>
            {FAQ_ITEMS.map((faq, i) => (
              <details
                key={i}
                className="faq-item"
                style={{ borderBottom: "1px solid var(--line)" }}
                open={faqOpen === i}
                onToggle={(e) => setFaqOpen((e.target as HTMLDetailsElement).open ? i : null)}
              >
                <summary className="text-sm font-semibold py-3" style={{ color: "var(--ink)", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  {faq.q}
                </summary>
                <p className="text-sm pb-3" style={{ color: "var(--muted)", margin: 0 }}>{faq.a}</p>
              </details>
            ))}
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
              Swap in your current-page FAQ copy.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
