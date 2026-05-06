import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useLocation } from "wouter";
import { useQuiz } from "@/contexts/QuizContext";
import { useReturningSession } from "@/contexts/UserSessionContext";
import { trpc } from "@/lib/trpc";
import ResultsCommercePage, {
  type ResultsVendorCard,
  type ResultsVendorCategoryFilter,
} from "@/components/results/ResultsCommercePage";
import {
  createMetaEventId,
  trackMetaEvent,
} from "@/lib/metaPixel";
import { getFacebookTrackingParams } from "@/utils/facebookUtils";
import {
  calculateMatches,
  libraryBackedPeptideProfileIds,
  peptideProfiles,
  type ReturningMatchSummary,
} from "../../../shared/scoring";
import { findResultsVendorPresentation } from "../../../shared/resultsVendorPresentation";

const LIBRARY_BACKED_PROFILE_IDS = new Set<string>(libraryBackedPeptideProfileIds);
function toReturningMatchSummary(result: ReturnType<typeof calculateMatches>[number]): ReturningMatchSummary {
  return {
    peptideId: result.peptide.id,
    name: result.peptide.name,
    description: result.peptide.description,
    categories: result.peptide.categories,
    matchPercent: result.matchPercent,
  };
}

function getLibraryBackedMatches(answers: number[]) {
  return calculateMatches(answers).filter((result) =>
    LIBRARY_BACKED_PROFILE_IDS.has(result.peptide.id),
  );
}

function prettyFocusLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildVendorFeatures({
  explicitFeatures,
  category,
}: {
  explicitFeatures?: string[];
  category: ResultsVendorCategoryFilter;
}) {
  if (explicitFeatures?.length) {
    return explicitFeatures.slice(0, 4);
  }

  const features: string[] = [];

  if (category === "telehealth") {
    features.push("Video Visits");
    features.push("Prescription Support");
    features.push("Secure Messaging");
  } else if (category === "research-peptides") {
    features.push("Research catalog");
    features.push("Direct checkout");
  }

  return features.slice(0, 4);
}

export default function Results() {
  const [, navigate] = useLocation();
  const { state, reset } = useQuiz();
  const { session, isLoading: isReturningSessionLoading, sessionStatus } = useReturningSession();
  const [selectedPeptideId, setSelectedPeptideId] = useState<string>("");

  const hasFreshQuizState = state.isComplete || state.answers.some((answer) => answer !== null);

  const previewMatches = useMemo(
    () =>
      getLibraryBackedMatches(state.answers.map((answer) => answer ?? -1)).map(
        toReturningMatchSummary,
      ),
    [state.answers],
  );

  const restoredMatches = !hasFreshQuizState ? session?.topMatches ?? [] : [];
  const activeMatches = hasFreshQuizState ? previewMatches : restoredMatches;
  const activeLeadId = session?.leadId ?? "";
  const availablePeptideIds = trpc.affiliates.availablePeptideIds.useQuery(
    { peptideIds: activeMatches.map((match) => match.peptideId) },
    {
      enabled: activeMatches.length > 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (hasFreshQuizState) return;
    if (sessionStatus === "pending") return;
    if (sessionStatus === "restored") return;

    navigate("/quiz");
  }, [hasFreshQuizState, navigate, sessionStatus]);

  const displayMatches = useMemo(() => {
    if (!activeMatches.length) return [];
    if (!availablePeptideIds.data) {
      return activeMatches;
    }

    const coveredIds = new Set(availablePeptideIds.data);
    const coveredMatches = activeMatches.filter((match) => coveredIds.has(match.peptideId));

    if (coveredMatches.length > 0) return coveredMatches;
    return activeMatches;
  }, [activeMatches, availablePeptideIds.data]);

  useEffect(() => {
    if (!displayMatches.length) return;

    setSelectedPeptideId((current) => {
      if (current && displayMatches.some((match) => match.peptideId === current)) {
        return current;
      }
      return displayMatches[0]?.peptideId ?? "";
    });
  }, [displayMatches]);

  const selectedMatch =
    displayMatches.find((match) => match.peptideId === selectedPeptideId) ?? displayMatches[0] ?? null;

  const activeLinks = trpc.affiliates.activeLinksByPeptide.useQuery(
    { peptideId: selectedMatch?.peptideId ?? "" },
    {
      enabled: Boolean(selectedMatch?.peptideId),
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  const trackClick = trpc.quiz.trackAffiliateClick.useMutation();

  const vendorCards = useMemo<ResultsVendorCard[]>(() => {
    if (!selectedMatch) return [];

    const sourceLinks = (activeLinks.data ?? []).map((link) => ({
      label: link.label,
      url: link.url,
      cardHeadlineValue: link.cardHeadlineValue,
      cardHeadlineUnit: link.cardHeadlineUnit,
      cardPromoText: link.cardPromoText,
      cardCouponCode: link.cardCouponCode,
      cardBadge: link.cardBadge,
    }));

    let visibleBadgeCount = 0;

    return sourceLinks.map((link, index) => {
      const presentation = findResultsVendorPresentation(link.label);
      const category = presentation?.category ?? "research-peptides";
      const offer =
        (selectedMatch ? presentation?.offersByPeptideId?.[selectedMatch.peptideId] : undefined) ??
        presentation?.defaultOffer;
      const features = buildVendorFeatures({
        explicitFeatures: presentation?.cardFeatures,
        category,
      });
      const headlineValue =
        link.cardHeadlineValue?.trim() ||
        offer?.headlineValue ||
        (category === "telehealth" ? "Provider" : "Shop now");
      const headlineUnit =
        link.cardHeadlineUnit?.trim() ||
        offer?.headlineUnit ||
        "pricing varies";
      const couponCode = link.cardCouponCode?.trim() || null;
      const promoText =
        link.cardPromoText?.trim() ||
        offer?.promoText ||
        null;
      const requestedBadge =
        link.cardBadge?.trim() ||
        presentation?.cardBadge ||
        (index === 0 ? "Recommended" : null);
      const badge =
        requestedBadge && visibleBadgeCount < 3
          ? (visibleBadgeCount += 1, requestedBadge)
          : null;

      return {
        id: presentation?.id ?? `${selectedMatch.peptideId}-${index}`,
        name: presentation?.name ?? link.label,
        category,
        affiliateUrl: link.url,
        logoUrl: presentation?.logoUrl,
        logoAlt: presentation?.logoAlt,
        logoMarkFallback: presentation?.logoMarkFallback ?? link.label.slice(0, 2).toUpperCase(),
        badge,
        headlineValue,
        headlineUnit,
        promoText,
        couponCode,
        planName: selectedMatch.name,
        planDetail:
          selectedMatch.categories.length > 0
            ? `Best aligned with ${selectedMatch.categories
                .slice(0, 2)
                .map((category) => prettyFocusLabel(category).toLowerCase())
                .join(" + ")}`
            : "Matched from your quiz profile",
        supplyTag: `${selectedMatch.matchPercent}% fit`,
        features,
      };
    });
  }, [activeLinks.data, selectedMatch]);

  const handleRetake = () => {
    reset();
    navigate("/quiz");
  };

  const handleVendorClick = (vendor: ResultsVendorCard, event?: MouseEvent<HTMLAnchorElement>) => {
    if (!selectedMatch) return;

    const shouldLetBrowserHandle =
      !event ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;

    if (!shouldLetBrowserHandle) {
      event.preventDefault();
    }

    if (activeLeadId) {
      trackClick.mutate({
        leadId: activeLeadId,
        peptideId: selectedMatch.peptideId,
        vendor: vendor.name,
      });
    }

    const eventId = createMetaEventId("affiliate_click");
    trackMetaEvent(
      "Lead",
      {
        content_name: vendor.name,
        content_category: selectedMatch.name,
      },
      eventId,
    );

    const { fbc, fbp } = getFacebookTrackingParams();
    const capiPayload = {
      email: null,
      eventName: "Lead",
      eventUrl: typeof window !== "undefined" ? window.location.href : null,
      fbc: fbc ?? null,
      fbp: fbp ?? null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      supplierName: vendor.name,
      peptideName: selectedMatch.name,
      eventId,
    };

    const payload = JSON.stringify(capiPayload);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon(
        "/api/capi/track-affiliate-click",
        new Blob([payload], { type: "application/json" }),
      );

      if (!sent) {
        void fetch("/api/capi/track-affiliate-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch((error) => {
          console.warn("[CAPI] Affiliate click tracking failed:", error);
        });
      }
    } else {
      void fetch("/api/capi/track-affiliate-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch((error) => {
        console.warn("[CAPI] Affiliate click tracking failed:", error);
      });
    }

    if (shouldLetBrowserHandle || typeof window === "undefined") {
      return;
    }

    window.setTimeout(() => {
      window.location.assign(vendor.affiliateUrl);
    }, 180);
  };

  if (!hasFreshQuizState && sessionStatus === "pending" && isReturningSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-sm text-muted-foreground">Loading your saved results…</div>
      </div>
    );
  }

  if (!selectedMatch) {
    return null;
  }

  return (
    <ResultsCommercePage
      matches={displayMatches}
      selectedMatch={selectedMatch}
      vendors={vendorCards}
      onRetake={handleRetake}
      onSelectMatch={setSelectedPeptideId}
      onVendorClick={handleVendorClick}
      vendorLoading={activeLinks.isLoading || availablePeptideIds.isLoading}
    />
  );
}
