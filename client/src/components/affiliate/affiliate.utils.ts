import type {
  ResultsVendorPresentation,
} from "../../../../shared/resultsVendorPresentation";
import type { AffiliatePartnerCardData } from "./affiliate.types";

const MAX_BADGE_LENGTH = 22;
const MAX_PROMO_LENGTH = 280;

export function deriveMonogram(partnerName: string): string {
  const cleaned = partnerName.trim();
  const words = cleaned.split(/\s+/);

  if (words.length >= 2) {
    return (words[0]![0]! + words[1]![0]!).toUpperCase();
  }

  const internalCap = cleaned.slice(1).match(/[A-Z]/);
  if (internalCap) {
    return (cleaned[0]! + internalCap[0]!).toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase();
}

function truncate(value: string, max: number, fieldName: string): string {
  if (value.length <= max) return value;
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[affiliate] ${fieldName} length ${value.length} exceeds ${max}; truncating.`,
    );
  }
  return value.slice(0, max - 1).trimEnd() + "…";
}

export function buildCardData(
  link: { partnerName: string; partnerSlug: string; url: string },
  override: Partial<ResultsVendorPresentation> | undefined,
  isFeatured: boolean,
): AffiliatePartnerCardData {
  if (process.env.NODE_ENV !== "production" && !override) {
    console.warn(
      `[affiliate] No presentation override found for "${link.partnerName}"; using safe defaults. Add an entry in resultsVendorPresentation.ts.`,
    );
  }
  const fallbackPromo = "Trusted partner.";

  return {
    partnerName: link.partnerName,
    partnerSlug: link.partnerSlug,
    url: link.url,
    monogram: deriveMonogram(link.partnerName),
    differentiatorBadge: override?.differentiatorBadge
      ? truncate(override.differentiatorBadge, MAX_BADGE_LENGTH, "differentiatorBadge")
      : undefined,
    headline: isFeatured
      ? override?.headline
      : (override?.secondaryHeadline ?? override?.headline),
    promo: override?.promo
      ? truncate(override.promo, MAX_PROMO_LENGTH, "promo")
      : fallbackPromo,
    couponCode: override?.couponCode,
    couponLabel: override?.couponLabel,
    trustSignals: isFeatured ? override?.trustSignals : undefined,
    ctaLabel: isFeatured
      ? (override?.ctaLabel ?? "Get Started")
      : (override?.secondaryCtaLabel ?? "Learn More"),
  };
}

export function derivePartnerSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
