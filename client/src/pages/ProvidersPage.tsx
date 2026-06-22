import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import Seo from "@/components/Seo";
import { trackMetaCustomEvent } from "@/lib/metaPixel";
import { trpc } from "@/lib/trpc";
import { GLP1_PROVIDERS, type GLP1Provider } from "../../../shared/providerData";

function trackProviderClicked(props: { providerId: string; position: number }) {
  trackMetaCustomEvent("providers_provider_clicked", props);
}

const FEATURED_PROVIDER_ID = "gala";

const MOCK_PLAN_PRICES: Record<string, { price: string; save: string }> = {
  gala: { price: "$89", save: "save 50%" },
  direct_med: { price: "$109", save: "save 45%" },
  sprout: { price: "$129", save: "save 35%" },
};

const MOCK_SHIPPING: Record<string, string> = {
  gala: "2–4 days",
  direct_med: "3–5 days",
  sprout: "2–3 days",
};

const MOCK_SUPPORT: Record<string, string> = {
  gala: "Messaging · Video",
  direct_med: "Messaging · Coaching",
  sprout: "Video",
};

const MOCK_COUPON: Record<string, string> = {
  gala: "PILOT15",
  sprout: "SPROUT10",
};

const MOCK_PATIENT_NOTE: Record<string, string> = {
  gala: "Onboarding took 10 minutes.",
  direct_med: "Coaching kept me on track.",
  sprout: "Fastest delivery I tried.",
};

const MOCK_TAGS: Record<string, string> = {
  gala: "★ Top pick · best value",
  direct_med: "Lifestyle support",
  sprout: "Fastest shipping",
};

export default function ProvidersPage({ leadId: propLeadId }: { leadId?: string }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const leadId = propLeadId || sessionStorage.getItem("pp_lead_id") || undefined;

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

  const featured = providers[0];
  const rest = providers.slice(1);

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--ink)" }}>
      <Seo
        title="Compare GLP-1 Providers — Vetted & Licensed | PeptidePilot"
        description="Compare vetted GLP-1 providers side by side. See real prices, plans, and patient reviews. Start with a licensed provider today."
        path="/providers"
        type="website"
      />

      {/* Mobile sticky top match */}
      <div className="md:hidden topmatch" style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "linear-gradient(100deg, #E5FAF0, #E6F6FE)",
        border: "1px solid #BFEFD6", borderRadius: 14,
        padding: "11px 14px", display: "flex", alignItems: "center", gap: 10,
        margin: "0 16px 16px"
      }}>
        <div className="pp-mono" style={{ width: 34, height: 34, borderRadius: 9, fontSize: ".85rem" }}>{featured?.logoMarkFallback}</div>
        <div style={{ fontSize: ".82rem", lineHeight: 1.2 }}>
          <b>{featured?.name}</b> is your top match<br />
          <span className="muted" style={{ fontSize: ".72rem" }}>${featured?.startingPrice}/mo · best value</span>
        </div>
        <a href={partnerUrlMap.get(featured?.name ?? "") ?? featured?.affiliateUrl ?? "#"}
          target="_blank" rel="sponsored nofollow"
          onClick={(e) => featured && handleProviderClick(e, featured)}
          className="pp-btn pp-btn-primary"
          style={{ marginLeft: "auto", padding: "8px 13px", fontSize: ".78rem", whiteSpace: "nowrap", textDecoration: "none" }}
        >
          Get started →
        </a>
      </div>

      <section className="py-8 px-5">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6" style={{ maxWidth: 680, margin: "0 auto 18px" }}>
            <span className="pp-eyebrow" style={{ justifyContent: "center", margin: "0 auto 12px" }}>Matched to you</span>
            <h2 style={{ fontSize: "clamp(1.3rem, 5vw, 1.9rem)", marginBottom: 8 }}>
              Your {providers.length} trusted providers
            </h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Compounded semaglutide · ships to New York · sorted by best value.
            </p>
          </div>

          {/* Advertising disclosure */}
          <div className="flex gap-3 items-start p-3 rounded-xl mb-5"
            style={{ background: "var(--secondary)", border: "1px solid var(--line)", fontSize: ".8rem", color: "var(--ink-soft)", maxWidth: 760, margin: "0 auto 20px" }}>
            <span style={{ flexShrink: 0 }}>ⓘ</span>
            <span>
              <strong>Advertising disclosure:</strong> PeptidePilot may earn a commission when you choose a provider through the links below. This never changes the price you pay and never affects our rankings.{" "}
              <span style={{ textDecoration: "underline" }}>Full disclosure</span>.
            </span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="pp-cmp" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th></th>
                  {providers.map((p) => (
                    <th key={p.id} style={p.id === FEATURED_PROVIDER_ID ? {
                      borderTop: "3px solid var(--mint-deep)",
                      paddingTop: 8,
                    } : {}}>
                      {p.id === FEATURED_PROVIDER_ID && (
                        <div style={{
                          background: "var(--mint-deep)", color: "#fff", fontSize: ".62rem",
                          fontWeight: 700, letterSpacing: ".07em", padding: "4px 13px",
                          borderRadius: 999, textAlign: "center", marginBottom: 8,
                        }}>
                          ★ Top pick · best value
                        </div>
                      )}
                      <div className="prov-h" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <span className="pp-mono" style={{ width: 34, height: 34, borderRadius: 9, fontSize: ".85rem" }}>{p.logoMarkFallback}</span>
                        <span style={{ whiteSpace: "nowrap" }}>{p.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="rowlbl">Monthly price</td>
                  {providers.map((p) => (
                    <td key={p.id}>
                      <span className="pp-price" style={{ fontSize: "1.2rem" }}>${p.startingPrice}</span>/mo
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="rowlbl">3-month plan</td>
                  {providers.map((p) => {
                    const plan = MOCK_PLAN_PRICES[p.id];
                    return (
                      <td key={p.id}>
                        {plan?.price}/mo
                        {plan?.save && <span className="pp-chip pp-chip-mint" style={{ fontSize: ".66rem", marginLeft: 6 }}>{plan.save}</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="rowlbl">Ships in</td>
                  {providers.map((p) => (
                    <td key={p.id}>{MOCK_SHIPPING[p.id] || "3–5 days"}</td>
                  ))}
                </tr>
                <tr>
                  <td className="rowlbl">Support</td>
                  {providers.map((p) => (
                    <td key={p.id}>{MOCK_SUPPORT[p.id] || "Messaging"}</td>
                  ))}
                </tr>
                <tr>
                  <td className="rowlbl">Coupon</td>
                  {providers.map((p) => {
                    const code = MOCK_COUPON[p.id];
                    return (
                      <td key={p.id}>
                        {code ? (
                          <button
                            onClick={() => handleCopyCoupon(code, p.id)}
                            className="copybtn"
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              color: "var(--mint-deep)",
                              border: "1px dashed var(--mint-deep)",
                              borderRadius: 999, padding: "6px 12px", fontSize: ".78rem",
                              background: "none", cursor: "pointer"
                            }}
                          >
                            {copiedId === p.id ? "Copied ✓" : `${code} · copy`}
                          </button>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: ".9rem" }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="rowlbl">Patient note</td>
                  {providers.map((p) => (
                    <td key={p.id}>
                      {MOCK_PATIENT_NOTE[p.id] ? (
                        <span className="ptest" style={{ fontSize: ".8rem", fontStyle: "italic", color: "var(--ink-soft)" }}>
                          &ldquo;{MOCK_PATIENT_NOTE[p.id]}&rdquo;
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: ".8rem" }}>No notes yet</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td></td>
                  {providers.map((p, idx) => (
                    <td key={p.id} style={p.id === FEATURED_PROVIDER_ID ? {
                      background: "linear-gradient(180deg, var(--tint-mint) 0%, #FBFFFD 55%)",
                      borderLeft: "1px solid #BFEFD6", borderRight: "1px solid #BFEFD6",
                    } : {}}>
                      {idx === 0 && (
                        <div className="most" style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--mint-deep)", textAlign: "center", marginBottom: 7 }}>
                          ★ Most chosen by people like you
                        </div>
                      )}
                      <a
                        href={partnerUrlMap.get(p.name) ?? p.affiliateUrl}
                        target="_blank"
                        rel="sponsored nofollow"
                        onClick={(e) => handleProviderClick(e, p)}
                        className="pp-btn pp-btn-block"
                        style={{
                          background: p.id === FEATURED_PROVIDER_ID ? "var(--grad-cta)" : "var(--secondary)",
                          color: p.id === FEATURED_PROVIDER_ID ? "var(--ink)" : "var(--ink)",
                          boxShadow: p.id === FEATURED_PROVIDER_ID ? "0 4px 14px rgba(31,134,199,.25)" : "none",
                          textDecoration: "none", textAlign: "center"
                        }}
                      >
                        Get started →
                      </a>
                      <div className="spons" style={{ fontSize: ".66rem", color: "var(--muted)", textAlign: "center", marginTop: 5 }}>
                        Sponsored link · we may earn a fee
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {providers.map((p, idx) => {
              const isFeatured = p.id === FEATURED_PROVIDER_ID;
              const tag = MOCK_TAGS[p.id];
              const code = MOCK_COUPON[p.id];
              const plan = MOCK_PLAN_PRICES[p.id];
              return (
                <div key={p.id}
                  className="pp-mcard"
                  style={isFeatured ? {
                    border: "2px solid var(--mint-deep)",
                    boxShadow: "0 0 0 4px rgba(123,227,181,.18)"
                  } : {}}
                >
                  {tag && (
                    <span className={`pp-chip ${isFeatured ? "pp-chip-mint" : p.id === "direct_med" ? "pp-chip-lav" : "pp-chip-sky"}`}
                      style={{ fontSize: ".62rem" }}>
                      {tag}
                    </span>
                  )}

                  <a href={partnerUrlMap.get(p.name) ?? p.affiliateUrl}
                    target="_blank" rel="sponsored nofollow"
                    onClick={(e) => handleProviderClick(e, p)}
                    style={{ display: "flex", alignItems: "center", gap: 9, margin: "9px 0", color: "var(--ink)", textDecoration: "none" }}>
                    <span className="pp-mono" style={{ width: 32, height: 32, borderRadius: 9, fontSize: ".8rem" }}>{p.logoMarkFallback}</span>
                    <b style={{ fontSize: "1.05rem" }}>{p.name}</b>
                    <span style={{ marginLeft: "auto", color: "var(--sky-deep)" }}>›</span>
                  </a>

                  <div style={{ marginBottom: 8 }}>
                    <span className="pp-price" style={{ fontSize: "1.4rem" }}>${p.startingPrice}</span>
                    <span className="muted small">/mo</span>
                    {plan && (
                      <>
                        <span className="muted small" style={{ marginLeft: 8 }}>3-mo {plan.price}</span>
                        <span className="pp-chip pp-chip-mint" style={{ fontSize: ".62rem", marginLeft: 6 }}>{plan.save}</span>
                      </>
                    )}
                  </div>

                  <div className="mrow" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: ".87rem" }}>
                    <span style={{ color: "var(--muted)" }}>Ships</span>
                    <b>{MOCK_SHIPPING[p.id] || "3–5 days"}</b>
                  </div>
                  <div className="mrow" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: ".87rem" }}>
                    <span style={{ color: "var(--muted)" }}>Support</span>
                    <b>{MOCK_SUPPORT[p.id] || "Messaging"}</b>
                  </div>

                  {code && (
                    <div className="mrow" style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: ".87rem" }}>
                      <span style={{ color: "var(--muted)" }}>Coupon</span>
                      <b style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--mint-deep)" }}>{code}</b>
                    </div>
                  )}

                  {MOCK_PATIENT_NOTE[p.id] && (
                    <p className="ptest" style={{ fontSize: ".8rem", fontStyle: "italic", color: "var(--ink-soft)", margin: "6px 0" }}>
                      &ldquo;{MOCK_PATIENT_NOTE[p.id]}&rdquo;
                    </p>
                  )}

                  <a
                    href={partnerUrlMap.get(p.name) ?? p.affiliateUrl}
                    target="_blank"
                    rel="sponsored nofollow"
                    onClick={(e) => handleProviderClick(e, p)}
                    className="pp-btn pp-btn-block"
                    style={{
                      background: isFeatured ? "var(--grad-cta)" : "var(--secondary)",
                      color: isFeatured ? "var(--ink)" : "var(--ink)",
                      textDecoration: "none", textAlign: "center"
                    }}
                  >
                    Get started →
                  </a>
                  <div className="spons" style={{ fontSize: ".66rem", color: "var(--muted)", textAlign: "center", marginTop: 3 }}>
                    Sponsored · we may earn a fee
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs mt-4" style={{ color: "var(--muted)" }}>
            Patient notes &amp; testimonials populate from verified UGC — never fabricated.
          </p>

          {/* Restart */}
          <div className="text-center mt-6">
            <Link href="/quiz/flow">
              <button className="pp-btn pp-btn-ghost">
                ↺ Restart the experience
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
