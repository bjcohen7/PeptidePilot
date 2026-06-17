import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { trpc } from "@/lib/trpc";
import { GLP1_PROVIDERS, type GLP1Provider } from "../../../shared/providerData";

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
  { icon: "◈", title: "Licensed clinicians", desc: "All providers require board-certified oversight" },
  { icon: "⊕", title: "Real medication", desc: "Compounded in licensed US pharmacies" },
  { icon: "⊞", title: "Doorstep delivery", desc: "Temperature-controlled, sharps included" },
  { icon: "⊡", title: "Your data stays private", desc: "Answers never sold. Not shared with providers without your OK" },
];

const EDUCATION_LINKS = [
  { label: "How compounded GLP-1s work", href: "#" },
  { label: "Semaglutide vs tirzepatide", href: "#" },
  { label: "What to expect the first month", href: "#" },
  { label: "Insurance coverage for GLP-1s", href: "#" },
];

const FAQ_ITEMS = [
  { q: "How are these providers vetted?", a: "We screen for board-certified clinicians, transparent pricing, real medication sourcing from licensed US pharmacies, and clear cancellation policies. Of 30+ providers reviewed, these met our bar." },
  { q: "Does PeptidePilot earn from provider links?", a: "Yes — we earn an affiliate commission when you start treatment through our links. Our rankings are based on fit, not payment." },
  { q: "What if GLP-1 isn't right for me?", a: "The provider's intake will catch contraindications. If they decline you, most offer a full refund. Email us if you'd like help finding an alternative." },
  { q: "Can I switch providers later?", a: "Absolutely. Cancellation terms are listed in the comparison table. Switching usually means a new intake, but there are no lock-in contracts." },
];

function StarSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 .5l1.88 5.78h6.07l-4.91 3.57 1.88 5.78L8 12.06l-4.92 3.57 1.88-5.78L.05 6.28h6.07L8 .5z" />
    </svg>
  );
}

function AvatarCircle({ name }: { name: string }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2);
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", display: "flex",
      alignItems: "center", justifyContent: "center", fontSize: ".82rem",
      fontWeight: 700, flexShrink: 0,
      background: "var(--tint-lav)", color: "var(--lav-deep)"
    }}>
      {initials}
    </div>
  );
}

function SAMPLE({ style: extra }: { style?: React.CSSProperties }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: ".62rem", fontWeight: 700, letterSpacing: ".08em",
      textTransform: "uppercase", padding: "3px 8px", borderRadius: 4,
      background: "#374151", color: "#FBBF24", ...extra
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      SAMPLE
    </span>
  );
}

const MOCK_PLAN_PRICES: Record<string, string> = {
  "gala": "$249",
  "yoked": "$369",
  "orderly": "$369",
  "ivim": "$447",
};

const MOCK_SHIPPING: Record<string, string> = {
  "gala": "Free 2-day",
  "yoked": "Free 2-day",
  "orderly": "Free 2-day",
  "ivim": "Free overnight",
};

const MOCK_SUPPORT: Record<string, string> = {
  "gala": "Chat / Phone / Video",
  "yoked": "Chat / Phone",
  "orderly": "Chat",
  "ivim": "Chat / Phone / Video",
};

const MOCK_COUPON: Record<string, string> = {
  "gala": "PEPSAVE50",
  "yoked": "YOKED50",
  "orderly": "ORDERLY50",
  "ivim": "",
};

const MOCK_PATIENT_NOTE: Record<string, string> = {
  "gala": '"Fast delivery, great support."',
  "yoked": '"Smooth intake, easy process."',
  "orderly": '"Good value for the price."',
  "ivim": '"Quick turnaround, professional."',
};

export default function NewResultsPage({ leadId }: { leadId?: string }) {
  const [, navigate] = useLocation();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyCoupon = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const cheapest = providers.reduce((min, p) => p.startingPrice < min.startingPrice ? p : min, providers[0]);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--ink)" }}>
      {/* ===== MATCH SNAPSHOT (card style) ===== */}
      <section className="pt-12 pb-8 px-5" style={{ background: "var(--background)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="pp-card" style={{ padding: "28px 30px" }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="pp-eyebrow" style={{ margin: 0 }}>Your match snapshot</span>
              <span className="h-1 w-1 rounded-full" style={{ background: "var(--muted)" }} />
              <span className="text-xs" style={{ color: "var(--muted)" }}>8 questions</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6">
              <Row label="Goal">Weight loss</Row>
              <Row label="Best-fit medication">Compounded GLP-1</Row>
              <Row label="State">{/*state*/}New York</Row>
              <Row label="Pay preference">Cash pay</Row>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 mt-5 text-sm" style={{ color: "var(--ink-soft)" }}>
            <span>★</span> Joined by <strong>12,480 people</strong> <span className="text-xs" style={{ color: "var(--muted)" }}>· live count</span>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-10 px-5" style={{ background: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="pp-eyebrow" style={{ margin: 0 }}>Real stories</span>
            <SAMPLE />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="pp-card" style={{ position: "relative", paddingTop: 32 }}>
                <div style={{ position: "absolute", top: -1, right: 14 }}>
                  <SAMPLE />
                </div>
                <div className="pp-stars mb-2" style={{ display: "flex", gap: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => <StarSVG key={i} />)}
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <AvatarCircle name={t.name} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{t.name}</div>
                    <div className="text-[10px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="#22C55E"><path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm4.29 5.29l-4.5 4.5a1 1 0 01-1.42 0l-2.5-2.5a1 1 0 111.42-1.42L7.3 7.88l3.8-3.8a1 1 0 111.42 1.42z"/></svg>
                      Verified patient
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMFORT POINTS ===== */}
      <section className="py-10 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="pp-eyebrow" style={{ margin: 0 }}>You&rsquo;re in good hands</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {COMFORT_POINTS.map((pt) => (
              <div key={pt.title} className="pp-card flex gap-3 items-start">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl text-lg font-bold" style={{ background: "var(--tint-sky)", color: "var(--sky-deep)", flexShrink: 0 }}>
                  {pt.icon}
                </span>
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
          <p className="pp-eyebrow mb-4" style={{ justifyContent: "center", margin: "0 0 16px" }}>Trusted by patients at</p>
          <div className="flex flex-wrap justify-center gap-3 items-center">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: "var(--tint-mint)", color: "var(--mint-deep)" }}>
                  {p.logoMarkFallback}
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{p.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium" style={{ background: "var(--card)", border: "1px dashed var(--line)", color: "var(--muted)" }}>
              + 15 more
            </div>
          </div>
        </div>
      </section>

      {/* ===== EDUCATION "Before you choose" ===== */}
      <section className="py-10 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="pp-card" style={{ background: "var(--tint-sky)", border: "1px solid var(--sky)", padding: "24px 28px" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="pp-eyebrow" style={{ margin: 0 }}>Before you choose</span>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--ink-soft)" }}>
              Quick primers on compounded GLP-1s so you know what you&rsquo;re signing up for.
            </p>
            <div className="flex flex-wrap gap-2">
              {EDUCATION_LINKS.map((link) => (
                <a key={link.label} href={link.href}
                  className="text-sm font-medium no-underline transition-shadow"
                  style={{
                    padding: "9px 18px", borderRadius: 999, background: "var(--card)",
                    color: "var(--ink)", border: "1px solid var(--line)"
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-10 px-5" style={{ background: "var(--surface)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <span className="pp-eyebrow" style={{ margin: 0 }}>Common questions</span>
          </div>
          <div className="space-y-2">
            {FAQ_ITEMS.map((faq, i) => {
              const isOpen = faqOpen === i;
              return (
                <details
                  key={i}
                  className="pp-card"
                  style={{ padding: "14px 18px", cursor: "pointer" }}
                  open={isOpen}
                  onToggle={(e) => setFaqOpen((e.target as HTMLDetailsElement).open ? i : null)}
                >
                  <summary style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    listStyle: "none", fontWeight: 600, fontSize: ".92rem",
                    color: "var(--ink)", cursor: "pointer"
                  }}>
                    <span>{faq.q}</span>
                    <span style={{
                      fontSize: "1.1rem", lineHeight: 1, color: "var(--mint-deep)",
                      transition: "transform .2s", transform: isOpen ? "rotate(135deg)" : "none"
                    }}>
                      +
                    </span>
                  </summary>
                  <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--muted)" }}>
                    {faq.a}
                  </p>
                </details>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== PROVIDERS COMPARISON ===== */}
      <section id="providers" className="py-10 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="pp-eyebrow" style={{ margin: 0 }}>Provider comparison</span>
          </div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--ink)" }}>
            {providers.length} vetted providers
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
            Ranked by fit for your answers. Prices and availability are subject to change.
          </p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--ink)" }}>
                  <th className="text-left py-3 px-4 font-semibold text-white/80 w-[160px]">Provider</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Starting price</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">3-month plan</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Ships</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Support</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Coupon</th>
                  <th className="text-center py-3 px-4 font-semibold text-white/80">Patient note</th>
                  <th className="text-center py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {providers.map((p, idx) => {
                  const isFeatured = p.id === FEATURED_PROVIDER_ID;
                  const couponCode = MOCK_COUPON[p.id] || "";
                  return (
                    <tr
                      key={p.id}
                      className="border-t transition-colors"
                      style={{
                        borderColor: "var(--border)",
                        background: isFeatured ? "var(--tint-mint)" : "var(--card)",
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "var(--tint-mint)", color: "var(--mint-deep)" }}>
                            {p.logoMarkFallback}
                          </div>
                          <div>
                            <div className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{p.name}</div>
                            {isFeatured && (
                              <span className="pp-badge pp-badge--mint text-[10px]">Top pick</span>
                            )}
                            {idx > 0 && idx <= 2 && (
                              <span className="text-[10px]" style={{ color: "var(--muted)" }}>Most chosen by people like you</span>
                            )}
                            {idx >= 3 && (
                              <span className="text-[10px]" style={{ color: "var(--muted)" }}>Sponsored link</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="font-bold" style={{ color: "var(--ink)" }}>${p.startingPrice}</span>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>/mo</span>
                      </td>
                      <td className="text-center py-3 px-4 text-xs" style={{ color: "var(--muted)" }}>
                        {MOCK_PLAN_PRICES[p.id] || `$${p.startingPrice * 3}`}
                      </td>
                      <td className="text-center py-3 px-4 text-xs" style={{ color: "var(--muted)" }}>
                        {MOCK_SHIPPING[p.id] || "Free"}
                      </td>
                      <td className="text-center py-3 px-4 text-xs" style={{ color: "var(--muted)" }}>
                        {MOCK_SUPPORT[p.id] || "Chat"}
                      </td>
                      <td className="text-center py-3 px-4">
                        {couponCode ? (
                          <button
                            onClick={() => handleCopyCoupon(couponCode, p.id)}
                            className="text-xs font-mono font-medium transition-colors"
                            style={{
                              padding: "4px 12px", borderRadius: 6,
                              background: copiedId === p.id ? "var(--tint-mint)" : "var(--surface)",
                              color: copiedId === p.id ? "var(--mint-deep)" : "var(--ink)",
                              border: "1px solid var(--line)", cursor: "pointer"
                            }}
                          >
                            {copiedId === p.id ? "Copied!" : couponCode}
                          </button>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="relative">
                          <span className="text-xs italic" style={{ color: "var(--muted)" }}>
                            {MOCK_PATIENT_NOTE[p.id] || ""}
                          </span>
                          <span style={{
                            position: "absolute", top: -4, right: 0,
                            fontSize: ".5rem", fontWeight: 700, letterSpacing: ".08em",
                            textTransform: "uppercase", background: "#374151", color: "#FBBF24",
                            padding: "1px 4px", borderRadius: 2
                          }}>
                            SAMPLE
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <a
                          href={partnerUrlMap.get(p.name) ?? p.affiliateUrl}
                          target="_blank"
                          rel="sponsored noopener"
                          onClick={(e) => handleProviderClick(e, p)}
                          className="pp-btn"
                          style={{
                            background: isFeatured ? "var(--mint-deep)" : "var(--surface)",
                            color: isFeatured ? "white" : "var(--ink)"
                          }}
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
          <div className="md:hidden space-y-4">
            {/* Sticky top-match card */}
            <div className="sticky top-[70px] z-30 -mx-5 px-5 py-3" style={{
              background: "var(--tint-mint)",
              borderBottom: "1px solid var(--mint)",
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="pp-badge pp-badge--mint text-[10px]">Top pick</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    {providers[0]?.name}
                  </span>
                </div>
                <span className="font-bold" style={{ color: "var(--mint-deep)" }}>
                  ${providers[0]?.startingPrice}<span className="text-xs font-normal">/mo</span>
                </span>
              </div>
            </div>
            {providers.map((p, idx) => {
              const isFeatured = p.id === FEATURED_PROVIDER_ID;
              const couponCode = MOCK_COUPON[p.id] || "";
              return (
                <div
                  key={p.id}
                  className="pp-card"
                  style={isFeatured ? { borderColor: "var(--mint)", borderWidth: 2 } : {}}
                >
                  {isFeatured && (
                    <span className="pp-badge pp-badge--mint mb-2 inline-block">Top pick</span>
                  )}
                  {idx > 0 && idx <= 2 && (
                    <span className="text-[10px] block mb-1" style={{ color: "var(--muted)" }}>Most chosen by people like you</span>
                  )}
                  {idx >= 3 && (
                    <span className="text-[10px] block mb-1" style={{ color: "var(--muted)" }}>Sponsored link</span>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "var(--tint-mint)", color: "var(--mint-deep)" }}>
                      {p.logoMarkFallback}
                    </div>
                    <span className="font-semibold" style={{ color: "var(--ink)" }}>{p.name}</span>
                  </div>
                  <div className="space-y-2 mb-3">
                    <RowM label="Starting price"><span className="font-bold" style={{ color: "var(--ink)" }}>${p.startingPrice}</span><span className="text-xs" style={{ color: "var(--muted)" }}>/mo</span></RowM>
                    <RowM label="3-month plan">{MOCK_PLAN_PRICES[p.id] || `$${p.startingPrice * 3}`}</RowM>
                    <RowM label="Ships">{MOCK_SHIPPING[p.id] || "Free"}</RowM>
                    <RowM label="Support">{MOCK_SUPPORT[p.id] || "Chat"}</RowM>
                    {couponCode && (
                      <RowM label="Coupon">
                        <button
                          onClick={() => handleCopyCoupon(couponCode, p.id + "_mb")}
                          className="font-mono text-xs"
                          style={{
                            padding: "2px 8px", borderRadius: 4,
                            background: copiedId === p.id + "_mb" ? "var(--tint-mint)" : "var(--surface)",
                            color: copiedId === p.id + "_mb" ? "var(--mint-deep)" : "var(--ink)",
                            border: "1px solid var(--line)", cursor: "pointer"
                          }}
                        >
                          {copiedId === p.id + "_mb" ? "Copied!" : couponCode}
                        </button>
                      </RowM>
                    )}
                    {MOCK_PATIENT_NOTE[p.id] && (
                      <RowM label="Patient note">
                        <span className="text-xs italic flex items-center gap-1" style={{ color: "var(--muted)" }}>
                          {MOCK_PATIENT_NOTE[p.id]}
                          <span style={{ fontSize: ".5rem", fontWeight: 700, background: "#374151", color: "#FBBF24", padding: "1px 4px", borderRadius: 2 }}>SAMPLE</span>
                        </span>
                      </RowM>
                    )}
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
          <div className="mt-8 flex flex-col items-center gap-2">
            <a
              href={partnerUrlMap.get(providers[0]?.name ?? "") ?? providers[0]?.affiliateUrl ?? "#"}
              target="_blank"
              rel="sponsored noopener"
              onClick={(e) => providers[0] && handleProviderClick(e, providers[0])}
              className="pp-btn pp-btn--primary text-base px-8 py-3"
              style={{ boxShadow: "0 0 20px rgba(34,197,94,.4)" }}
            >
              Start your match &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ===== ADVERTISING DISCLOSURE ===== */}
      <section className="py-6 px-5" style={{ background: "var(--tint-sun)", borderTop: "1px solid var(--sun)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs leading-relaxed" style={{ color: "#6B5200" }}>
            <strong>Advertising Disclosure:</strong> PeptidePilot is an independent comparison service.
            We earn affiliate commissions when you start treatment through our links.
            Our rankings are based on fit and independent vetting — not payment for placement.
            Not medical advice. Individual results vary.
            <br />
            <a href="/affiliate-disclosure" className="underline" style={{ color: "#6B5200" }}>Full disclosure</a>
            &ensp;·&ensp;
            <a href="/screening-criteria" className="underline" style={{ color: "#6B5200" }}>Screening criteria</a>
          </p>
        </div>
      </section>

      {/* ===== SELF-SERVICE DISCLAIMER ===== */}
      <section className="py-8 px-5" style={{ background: "var(--background)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-3xl mx-auto text-center text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
          <strong>Important note:</strong> This is a self-service matching and comparison tool.
          PeptidePilot does not provide medical advice, diagnosis, or treatment.
          Always consult a qualified healthcare provider before starting any medication.
          Prices and availability shown are estimates and subject to change.
        </div>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{children}</span>
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
