import { trpc } from "@/lib/trpc";
import { AffiliatePartnerCard } from "./AffiliatePartnerCard";
import type { AffiliatePartnerCardData } from "./affiliate.types";

// ---------------------------------------------------------------------------
// Hardcoded provider list — always shown in this exact order regardless of
// quiz answers. To update providers, edit HARDCODED_PROVIDERS below.
// ---------------------------------------------------------------------------
const HARDCODED_PROVIDERS: AffiliatePartnerCardData[] = [
  {
    partnerName: "Gala",
    partnerSlug: "gala",
    url: "https://galaglp1.com/lp/glp1?a=price&_ef_transaction_id=&oid=1&affid=13",
    monogram: "GA",
    differentiatorBadge: "Legit Script Certified",
    headline: "$179 per month all doses, no hidden fees",
    promo: "",
    trustSignals: ["Licensed providers in all 50 states"],
    ctaLabel: "Get Started",
  },
  {
    partnerName: "Direct Med",
    partnerSlug: "direct-med",
    url: "https://track.revoffers.com/aff_c?offer_id=1304&aff_id=12185",
    monogram: "DM",
    differentiatorBadge: "Legit Script Certified",
    headline: "Transparent all inclusive pricing",
    promo: "Transparent all inclusive pricing",
    couponCode: "PILOT50",
    couponLabel: "Use code PILOT50 at checkout",
    trustSignals: [
      "Doctor Subscribed and supervised",
      "Personalized care plans",
      "Convenient at home delivery",
    ],
    ctaLabel: "View Offer",
  },
  {
    partnerName: "Sprout",
    partnerSlug: "sprout",
    url: "https://track.revoffers.com/aff_c?offer_id=1286&aff_id=12185",
    monogram: "SP",
    differentiatorBadge: "Legit Script Certified",
    headline: "No contracts, no surprise fees",
    promo: "",
    trustSignals: [
      "Prepared by state licensed US pharmacies",
      "Patient care team",
      "Fast shipping",
    ],
    ctaLabel: "Get Started",
  },
];

type Props = {
  peptideId: string;
  peptideName: string;
  leadId?: string;
};

export function AffiliateRecommendationSection({
  peptideId,
  peptideName: _peptideName,
  leadId,
}: Props) {
  const trackClick = trpc.quiz.trackAffiliateClick.useMutation();

  const handleCtaClick = (partnerName: string, url: string) => {
    if (leadId) {
      trackClick.mutate({ leadId, peptideId, vendor: partnerName });
    }

    if (
      typeof window !== "undefined" &&
      (window as { fbq?: (...args: unknown[]) => void }).fbq
    ) {
      const fbq = (window as { fbq: (...args: unknown[]) => void }).fbq;
      fbq("track", "Lead", { content_name: partnerName });
      fbq("trackCustom", "AffiliateClick", {
        content_name: partnerName,
        slot:
          partnerName === HARDCODED_PROVIDERS[0]!.partnerName
            ? "featured"
            : "secondary",
        peptide_id: peptideId,
      });
    }
  };

  const [featured, ...rest] = HARDCODED_PROVIDERS;

  return (
    <section aria-label="Recommended partners" className="w-full">
      <div className="grid grid-cols-1 gap-3.5 items-start">
        <AffiliatePartnerCard
          variant="featured"
          data={featured!}
          onCtaClick={(name, url) => handleCtaClick(name, url)}
        />
        {rest.map((provider) => (
          <AffiliatePartnerCard
            key={provider.partnerSlug}
            variant="secondary"
            data={provider}
            onCtaClick={(name, url) => handleCtaClick(name, url)}
          />
        ))}
      </div>
    </section>
  );
}
