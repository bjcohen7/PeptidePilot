import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { peptideProfiles } from "../../../../shared/scoring";
import { findResultsVendorPresentation } from "../../../../shared/resultsVendorPresentation";
import { Skeleton } from "@/components/ui/skeleton";
import { AffiliatePartnerCard } from "./AffiliatePartnerCard";
import { buildCardData, derivePartnerSlug } from "./affiliate.utils";
import type { AffiliatePartnerCardData } from "./affiliate.types";

type Props = {
  peptideId: string;
  peptideName: string;
  leadId?: string;
};

export function AffiliateRecommendationSection({
  peptideId,
  peptideName,
  leadId,
}: Props) {
  const linksQuery = trpc.affiliates.activeLinksByPeptide.useQuery(
    { peptideId },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  const trackClick = trpc.quiz.trackAffiliateClick.useMutation();

  const cards = useMemo<AffiliatePartnerCardData[]>(() => {
    const links = linksQuery.data ?? [];

    const profile =
      links.length === 0
        ? peptideProfiles.find((profile) => profile.id === peptideId)
        : undefined;

    const fallbackVendors = profile?.vendors ?? [];

    const source =
      links.length > 0
        ? links.map((link) => ({
            partnerName: link.partnerName ?? link.label,
            partnerSlug: derivePartnerSlug(link.partnerName ?? link.label),
            url: link.url,
            sortOrder: link.sortOrder,
          }))
        : fallbackVendors.map((v, i) => ({
            partnerName: v.name,
            partnerSlug: derivePartnerSlug(v.name),
            url: v.url,
            sortOrder: i,
          }));

    const top = [...source].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 2);

    if (process.env.NODE_ENV !== "production" && source.length > 2) {
      console.warn(
        `[AffiliateRecommendationSection] ${source.length} partners returned for ${peptideId}; using first 2.`,
      );
    }

    return top.map((link, idx) => {
      const override = findResultsVendorPresentation(link.partnerName) ?? undefined;
      return buildCardData(link, override, idx === 0);
    });
  }, [linksQuery.data, peptideId]);

  const handleCtaClick = (partnerName: string, url: string) => {
    if (leadId) {
      trackClick.mutate({ leadId, peptideId, vendor: partnerName });
    }

    if (typeof window !== "undefined" && (window as { fbq?: (...args: unknown[]) => void }).fbq) {
      const fbq = (window as { fbq: (...args: unknown[]) => void }).fbq;
      fbq("track", "Lead", { content_name: partnerName });
      fbq("trackCustom", "AffiliateClick", {
        content_name: partnerName,
        slot: (() => {
          const found = cards.findIndex((c) => c.partnerName === partnerName);
          return found === 0 ? "featured" : "secondary";
        })(),
        peptide_id: peptideId,
      });
    }
  };

  if (linksQuery.isLoading) {
    return (
      <section aria-label="Recommended partners" className="w-full">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 items-start">
          <Skeleton className="h-[320px] rounded-2xl" />
          <Skeleton className="h-[280px] rounded-2xl" />
        </div>
      </section>
    );
  }

  if (cards.length === 0) return null;

  const featured = cards[0]!;
  const secondary = cards[1];

  return (
    <section aria-label="Recommended partners" className="w-full">
      <div
        className={
          secondary
            ? "grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 items-start"
            : "grid grid-cols-1 gap-3.5"
        }
      >
        <AffiliatePartnerCard
          variant="featured"
          data={featured}
          onCtaClick={(name, url) => handleCtaClick(name, url)}
        />
        {secondary && (
          <AffiliatePartnerCard
            variant="secondary"
            data={secondary}
            onCtaClick={(name, url) => handleCtaClick(name, url)}
          />
        )}
      </div>
    </section>
  );
}
