import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import ResultsCommercePage, {
  type ResultsVendorCard,
  type ResultsVendorCategoryFilter,
} from "@/components/results/ResultsCommercePage";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { useQuiz } from "@/contexts/QuizContext";
import { useReturningSession } from "@/contexts/UserSessionContext";
import { trackMetaEvent } from "@/lib/metaPixel";
import { trpc } from "@/lib/trpc";
import {
  BUDGET_OPTIONS,
  calculateMatches,
  libraryBackedPeptideProfileIds,
  peptideProfiles,
  PRIMARY_GOAL_OPTIONS,
  QUIZ_INDEX,
  toReturningMatchSummary,
  type ReturningMatchSummary,
} from "../../../shared/scoring";

const LIBRARY_BACKED_PROFILE_IDS = new Set<string>(libraryBackedPeptideProfileIds);

const GLP1_PEPTIDE_IDS = new Set(["semaglutide", "tirzepatide", "retatrutide", "liraglutide", "orforglipron"]);

type VendorPresentation = {
  category: ResultsVendorCategoryFilter;
  logoMarkFallback: string;
  headlineValue: string;
  headlineUnit: string;
  promoText?: string | null;
  couponCode?: string | null;
  trustSignals: string[];
  features: string[];
};

const VENDOR_PRESENTATION_OVERRIDES: Record<string, Partial<VendorPresentation>> = {
  "Peptide Sciences": {
    category: "research-peptides",
    logoMarkFallback: "PS",
  },
  "Core Peptides": {
    category: "research-peptides",
    logoMarkFallback: "CP",
  },
  "Limitless Life": {
    category: "telehealth",
    logoMarkFallback: "LL",
  },
  "Defy Medical": {
    category: "telehealth",
    logoMarkFallback: "DM",
  },
  "Hone Health": {
    category: "telehealth",
    logoMarkFallback: "HH",
  },
  LifeMD: {
    category: "telehealth",
    logoMarkFallback: "LM",
  },
  PeterMD: {
    category: "telehealth",
    logoMarkFallback: "PM",
  },
};

function getLibraryBackedMatches(answers: number[]) {
  return calculateMatches(answers).filter((result) =>
    LIBRARY_BACKED_PROFILE_IDS.has(result.peptide.id),
  );
}

function buildLogoFallback(name: string) {
  const tokens = name
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) return "PP";
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase();

  return `${tokens[0]![0] ?? ""}${tokens[1]![0] ?? ""}`.toUpperCase();
}

function buildVendorPresentation(name: string): VendorPresentation {
  const override = VENDOR_PRESENTATION_OVERRIDES[name] ?? {};
  const isTelehealth =
    override.category === "telehealth" ||
    /(?:\bmd\b|medical|health|clinic|care|wellness|life)/i.test(name);
  const category: ResultsVendorCategoryFilter = isTelehealth
    ? "telehealth"
    : "research-peptides";

  return {
    category,
    logoMarkFallback: override.logoMarkFallback ?? buildLogoFallback(name),
    headlineValue:
      override.headlineValue ?? (category === "telehealth" ? "Pricing varies" : "Pricing varies"),
    headlineUnit:
      override.headlineUnit ??
      (category === "telehealth" ? "telehealth intake" : "research catalog"),
    promoText: override.promoText ?? null,
    couponCode: override.couponCode ?? null,
    trustSignals:
      override.trustSignals ??
      (category === "telehealth"
        ? ["Doctor-guided", "Prescription included", "US-licensed"]
        : ["Research-use catalog", "Direct checkout", "Independent vendor"]),
    features:
      override.features ??
      (category === "telehealth"
        ? ["Clinician intake", "Prescription support", "Ongoing follow-up"]
        : ["Research-use catalog", "Multiple peptide options", "Direct checkout"]),
  };
}

export default function Results() {
  const [, navigate] = useLocation();
  const { state, reset } = useQuiz();
  const {
    session,
    isLoading: isReturningSessionLoading,
    sessionStatus,
    seedReturningSession,
  } =
    useReturningSession();
  const hasBootstrappedLeadRef = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [matches, setMatches] = useState<ReturningMatchSummary[]>([]);
  const [selectedPeptideId, setSelectedPeptideId] = useState("");

  const sessionId = getVisitorSessionId();
  const submitQuiz = trpc.quiz.submitQuiz.useMutation({
    onSuccess: (data) => {
      setLeadId(data.leadId);
      setMatches(data.returningResults);
      setRevealed(true);

      if (data.returningToken) {
        seedReturningSession({
          token: data.returningToken,
          leadId: data.leadId,
          createdAt: new Date(),
          topMatches: data.returningResults,
          justCompletedQuiz: true,
        });
      }
    },
    onError: (error) => {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    },
  });

  const trackAffiliateClick = trpc.quiz.trackAffiliateClick.useMutation();

  const hasFreshQuizState = state.isComplete || state.answers.some((answer) => answer !== null);
  const previewMatches = useMemo(
    () =>
      getLibraryBackedMatches(state.answers.map((answer) => answer ?? -1)).map(
        toReturningMatchSummary,
      ),
    [state.answers],
  );
  const restoredMatches = session?.topMatches ?? [];
  const activeMatches =
    revealed && matches.length > 0
      ? matches
      : restoredMatches.length > 0
        ? restoredMatches
        : previewMatches;
  const activeLeadId = leadId || session?.leadId || "";

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

  useEffect(() => {
    if (
      hasBootstrappedLeadRef.current ||
      submitQuiz.isPending ||
      !hasFreshQuizState ||
      sessionStatus === "pending" ||
      sessionStatus === "restored" ||
      previewMatches.length === 0
    ) {
      return;
    }

    hasBootstrappedLeadRef.current = true;
    submitQuiz.mutate({
      email: null,
      consentGiven: false,
      answers: state.answers.map((answer) => answer ?? -1),
      sessionId,
      meta: {
        sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
      },
    });
  }, [
    hasFreshQuizState,
    previewMatches.length,
    sessionId,
    sessionStatus,
    state.answers,
    submitQuiz,
  ]);

  const displayMatches = useMemo(() => {
    if (!activeMatches.length) return [];
    if (!availablePeptideIds.data) return activeMatches;

    const coveredIds = new Set(availablePeptideIds.data);
    const coveredMatches = activeMatches.filter((match) => coveredIds.has(match.peptideId));

    return coveredMatches.length > 0 ? coveredMatches : activeMatches;
  }, [activeMatches, availablePeptideIds.data]);

  useEffect(() => {
    if (!displayMatches.length) return;

    setSelectedPeptideId((current) => {
      if (current && displayMatches.some((match) => match.peptideId === current)) {
        return current;
      }
      return displayMatches[0]!.peptideId;
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

  const vendorCards = useMemo<ResultsVendorCard[]>(() => {
    if (!selectedMatch) return [];

    const isGlpMatch = GLP1_PEPTIDE_IDS.has(selectedMatch.peptideId);

    const allAffiliateLinks = activeLinks.data ?? [];

    const linksForDisplay = isGlpMatch
      ? allAffiliateLinks.filter((link) => link.label.toLowerCase() === "skinnyrx")
      : allAffiliateLinks;

    const affiliateVendors = linksForDisplay.map((link) => ({
      label: link.label,
      url: link.url,
    }));

    const profile = peptideProfiles.find((candidate) => candidate.id === selectedMatch.peptideId);
    const fallbackVendors =
      affiliateVendors.length === 0 ? (profile?.vendors ?? []).map((vendor) => ({
        label: vendor.name,
        url: vendor.url,
      })) : [];

    const sourceVendors = [...affiliateVendors, ...fallbackVendors];
    const deduped = new Map<string, { label: string; url: string }>();
    sourceVendors.forEach((vendor) => {
      const key = `${vendor.label}::${vendor.url}`;
      if (!deduped.has(key)) {
        deduped.set(key, vendor);
      }
    });

    return Array.from(deduped.values())
      .slice(0, 4)
      .map((vendor, index) => {
        const presentation = buildVendorPresentation(vendor.label);

        return {
          id: `${selectedMatch.peptideId}-${index}-${vendor.label}`,
          name: vendor.label,
          category: presentation.category,
          affiliateUrl: vendor.url,
          logoMarkFallback: presentation.logoMarkFallback,
          badge: index === 0 ? "Recommended" : null,
          headlineValue: presentation.headlineValue,
          headlineUnit: presentation.headlineUnit,
          promoText: presentation.promoText ?? null,
          couponCode: presentation.couponCode ?? null,
          features: presentation.features,
          trustSignals: presentation.trustSignals,
        };
      });
  }, [activeLinks.data, selectedMatch]);

  const handleRetake = () => {
    reset();
    navigate("/quiz");
  };

  const handleVendorClick = (vendor: ResultsVendorCard, event?: MouseEvent<HTMLAnchorElement>) => {
    if (!selectedMatch) return;

    const allowDefaultBrowserBehavior =
      !event ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;

    if (!allowDefaultBrowserBehavior) {
      event.preventDefault();
    }

    if (activeLeadId) {
      trackAffiliateClick.mutate({
        leadId: activeLeadId,
        peptideId: selectedMatch.peptideId,
        vendor: vendor.name,
      });
    }

    trackMetaEvent("Lead", {
      content_name: vendor.name,
      content_category: selectedMatch.name,
    });

    if (!allowDefaultBrowserBehavior && typeof window !== "undefined") {
      window.setTimeout(() => {
        window.location.assign(vendor.affiliateUrl);
      }, 120);
    }
  };

  if (!hasFreshQuizState && isReturningSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-6 text-center text-[#4a5b58]">
        Loading your saved results…
      </div>
    );
  }

  if (selectedMatch && displayMatches.length > 0) {
    return (
      <ResultsCommercePage
        matches={displayMatches}
        selectedMatch={selectedMatch}
        vendors={vendorCards}
        onRetake={handleRetake}
        onSelectMatch={setSelectedPeptideId}
        onVendorClick={handleVendorClick}
        vendorLoading={activeLinks.isLoading}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-6 text-center text-[#4a5b58]">
      Preparing your results…
    </div>
  );
}
