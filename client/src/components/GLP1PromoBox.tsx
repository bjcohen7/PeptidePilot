import { useMemo, useState } from "react";
import { ExternalLink, HeartPulse, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

type GLP1PromoBoxProps = {
  leadId?: string;
  sessionId?: string;
};

type PromoVendor = {
  name: string;
  url: string;
};

export function GLP1PromoBox({ leadId, sessionId }: GLP1PromoBoxProps) {
  const [dismissed, setDismissed] = useState(false);
  const semaglutideLinks = trpc.affiliates.activeLinksByPeptide.useQuery(
    { peptideId: "semaglutide" },
    { retry: false, refetchOnWindowFocus: false },
  );
  const tirzepatideLinks = trpc.affiliates.activeLinksByPeptide.useQuery(
    { peptideId: "tirzepatide" },
    { retry: false, refetchOnWindowFocus: false },
  );
  const trackAnalyticsClick = trpc.analytics.trackClick.useMutation();
  const trackAffiliateClick = trpc.quiz.trackAffiliateClick.useMutation();

  const vendors = useMemo<PromoVendor[]>(() => {
    const deduped = new Map<string, PromoVendor>();

    [...(semaglutideLinks.data ?? []), ...(tirzepatideLinks.data ?? [])].forEach((link) => {
      const key = `${link.label}::${link.url}`;
      if (!deduped.has(key)) {
        deduped.set(key, { name: link.label, url: link.url });
      }
    });

    return Array.from(deduped.values()).slice(0, 3);
  }, [semaglutideLinks.data, tirzepatideLinks.data]);

  if (dismissed || vendors.length === 0) return null;

  const trackClick = (vendor: PromoVendor) => {
    const path = typeof window !== "undefined" ? window.location.pathname : "/results";

    if (sessionId) {
      trackAnalyticsClick.mutate({
        sessionId,
        path,
        label: `GLP-1 Promo: ${vendor.name}`,
        targetHref: vendor.url,
        eventType: "glp1-promo",
      });
    }

    if (leadId) {
      trackAffiliateClick.mutate({
        leadId,
        peptideId: "glp1_promo",
        vendor: vendor.name,
      });
    }

    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      try {
        window.fbq("trackCustom", "GLP1PromoClick", {
          vendor: vendor.name,
          lead_id: leadId ?? null,
        });
      } catch (error) {
        console.error("[Meta Pixel] Failed to track GLP1PromoClick", error);
      }
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-accent/20 bg-white shadow-sm overflow-hidden relative">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Dismiss GLP-1 provider box"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-xl bg-accent/10 p-2.5 text-accent">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">Looking for Medical Weight Loss?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              GLP-1 medications like semaglutide and tirzepatide are prescription-only and can be a stronger option for metabolic support than research peptides alone.
            </p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-900">
            <strong>Medical Notice:</strong> GLP-1 medications require a licensed clinician to evaluate whether you qualify. The providers below offer telehealth screening and prescription pathways when appropriate.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {vendors.map((vendor) => (
            <a
              key={`${vendor.name}-${vendor.url}`}
              href={vendor.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick(vendor)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              Check Eligibility with {vendor.name}
            </a>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          FTC Disclosure: We may receive compensation if you purchase through these links. That helps keep PeptidePilot free.
        </p>
      </div>
    </section>
  );
}
