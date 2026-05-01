import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuiz } from "@/contexts/QuizContext";
import { useReturningSession } from "@/contexts/UserSessionContext";
import { trpc } from "@/lib/trpc";
import ResultsCommercePage, {
  type ResultsVendorCard,
  type ResultsVendorCategoryFilter,
} from "@/components/results/ResultsCommercePage";
import {
  calculateMatches,
  libraryBackedPeptideProfileIds,
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
  category,
  isGlobal,
  lastTestStatus,
  selectedMatch,
  hasVerifiedLogo,
}: {
  category: ResultsVendorCategoryFilter;
  isGlobal: boolean;
  lastTestStatus: number | null | undefined;
  selectedMatch: ReturningMatchSummary;
  hasVerifiedLogo: boolean;
}) {
  const features: string[] = [];

  if (category === "telehealth") {
    features.push("Clinician-guided");
    features.push("Prescription path");
  } else if (category === "research-peptides") {
    features.push("Research catalog");
    features.push("Direct checkout");
  }

  if (!isGlobal) {
    features.push(`${selectedMatch.name} match`);
  }

  if (hasVerifiedLogo) {
    features.push("Verified brand");
  }

  if (typeof lastTestStatus === "number" && lastTestStatus >= 200 && lastTestStatus < 400) {
    features.push("Tracked link tested");
  }

  return features.slice(0, 4);
}

export default function Results() {
  const [, navigate] = useLocation();
  const { state, reset } = useQuiz();
  const { session, isLoading: isReturningSessionLoading, sessionStatus } = useReturningSession();
  const [selectedPeptideId, setSelectedPeptideId] = useState<string>("");
  const [activeFocus, setActiveFocus] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<ResultsVendorCategoryFilter>("all");

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
  const isReturningUser = !hasFreshQuizState && Boolean(session && !session.justCompletedQuiz);
  const activeLeadId = session?.leadId ?? "";

  useEffect(() => {
    if (hasFreshQuizState) return;
    if (sessionStatus === "pending") return;
    if (sessionStatus === "restored") return;

    navigate("/quiz");
  }, [hasFreshQuizState, navigate, sessionStatus]);

  const focusOptions = useMemo(() => {
    const ordered = new Set<string>();

    for (const match of activeMatches) {
      for (const category of match.categories) {
        ordered.add(category);
      }
    }

    return Array.from(ordered).slice(0, 5);
  }, [activeMatches]);

  useEffect(() => {
    if (!activeMatches.length) return;

    setSelectedPeptideId((current) => {
      if (current && activeMatches.some((match) => match.peptideId === current)) {
        return current;
      }
      return activeMatches[0]?.peptideId ?? "";
    });
  }, [activeMatches]);

  const selectedMatch =
    activeMatches.find((match) => match.peptideId === selectedPeptideId) ?? activeMatches[0] ?? null;

  useEffect(() => {
    if (!selectedMatch) return;

    if (!activeFocus || !selectedMatch.categories.includes(activeFocus)) {
      setActiveFocus(selectedMatch.categories[0] ?? focusOptions[0] ?? "");
    }
  }, [activeFocus, focusOptions, selectedMatch]);

  useEffect(() => {
    if (!activeFocus || !activeMatches.length) return;

    const nextMatch = activeMatches.find((match) => match.categories.includes(activeFocus));
    if (nextMatch && nextMatch.peptideId !== selectedPeptideId) {
      setSelectedPeptideId(nextMatch.peptideId);
    }
  }, [activeFocus, activeMatches, selectedPeptideId]);

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

    return (activeLinks.data ?? []).map((link, index) => {
      const presentation = findResultsVendorPresentation(link.label);
      const category = presentation?.category ?? "research-peptides";
      const hasVerifiedLogo = Boolean(
        presentation?.sourceStatus === "verified-public-asset" && presentation.logoUrl,
      );
      const features = buildVendorFeatures({
        category,
        isGlobal: Boolean(link.isGlobal),
        lastTestStatus: link.lastTestStatus,
        selectedMatch,
        hasVerifiedLogo,
      });

      const badge =
        index === 0
          ? "Recommended"
          : category === "telehealth"
            ? "Telehealth"
            : null;

      return {
        id: presentation?.id ?? `${selectedMatch.peptideId}-${index}`,
        name: presentation?.name ?? link.label,
        category,
        affiliateUrl: link.url,
        learnMoreUrl: presentation?.officialUrl ?? link.url,
        logoUrl: presentation?.logoUrl,
        logoAlt: presentation?.logoAlt,
        logoMarkFallback: presentation?.logoMarkFallback ?? link.label.slice(0, 2).toUpperCase(),
        badge,
        headlineValue: category === "telehealth" ? "Guided" : "Direct",
        headlineUnit: category === "telehealth" ? "clinical access" : "vendor access",
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
        trustNote:
          presentation?.sourceStatus === "manual-review"
            ? "Brand card is live with fallback styling while we finish logo and offer normalization."
            : null,
      };
    });
  }, [activeLinks.data, selectedMatch]);

  const handleRetake = () => {
    reset();
    navigate("/quiz");
  };

  const handleVendorClick = (vendor: ResultsVendorCard) => {
    if (!activeLeadId || !selectedMatch) return;
    trackClick.mutate({
      leadId: activeLeadId,
      peptideId: selectedMatch.peptideId,
      vendor: vendor.name,
    });
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
      matches={activeMatches}
      selectedMatch={selectedMatch}
      focusOptions={focusOptions}
      activeFocus={activeFocus}
      onFocusChange={setActiveFocus}
      vendorFilter={vendorFilter}
      onVendorFilterChange={setVendorFilter}
      vendors={vendorCards}
      leadId={activeLeadId}
      isReturningUser={isReturningUser}
      onRetake={handleRetake}
      onSelectMatch={setSelectedPeptideId}
      onVendorClick={handleVendorClick}
      vendorLoading={activeLinks.isLoading}
    />
  );
}
