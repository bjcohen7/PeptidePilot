import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import ResultsCommercePage, {
  type ResultsVendorCard,
  type ResultsVendorCategoryFilter,
} from "@/components/results/ResultsCommercePage";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { useQuiz } from "@/contexts/QuizContext";
import { useReturningSession } from "@/contexts/UserSessionContext";
import { identifyLogRocketUser } from "@/lib/logrocket";
import {
  applyMetaAdvancedMatching,
  createMetaEventId,
  getMetaBrowserIdentifiers,
  trackMetaEvent,
} from "@/lib/metaPixel";
import { trpc } from "@/lib/trpc";
import {
  AGE_RANGE_OPTIONS,
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

function LeadCaptureGate({
  onReveal,
  isLoading,
  previewMatches,
}: {
  onReveal: (email: string, consent: boolean) => void;
  isLoading: boolean;
  previewMatches: ReturningMatchSummary[];
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [emailError, setEmailError] = useState("");

  const topThree = previewMatches.slice(0, 3);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (!consent) {
      toast.error("Please check the consent box to continue.");
      return;
    }

    onReveal(email, consent);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 500,
            height: 500,
            top: "-10%",
            left: "-5%",
            background: "radial-gradient(circle, #38bdf81a, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 400,
            height: 400,
            bottom: "-10%",
            right: "-5%",
            background: "radial-gradient(circle, #a855f71a, transparent 70%)",
          }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-center px-4 pt-5 pb-4">
        <Link href="/">
          <PeptidePilotLogo height={30} variant="light" />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
              style={{
                background: "rgba(56,189,248,0.12)",
                color: "#38bdf8",
                border: "1px solid rgba(56,189,248,0.25)",
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Analysis Complete
            </div>
            <h1
              className="mb-3 text-white leading-snug"
              style={{
                fontSize: "clamp(1.7rem, 4.5vw, 2.4rem)",
                fontFamily: "'DM Serif Display', Georgia, serif",
                letterSpacing: "-0.02em",
              }}
            >
              Your peptide profile is ready.
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: "clamp(0.9rem, 2.5vw, 1rem)",
                lineHeight: 1.7,
              }}
            >
              We matched your biology across 8 domains. Enter your email to unlock your full personalized protocol.
            </p>
          </div>

          {topThree.length > 0 ? (
            <div className="relative mb-7">
              <div className="space-y-2.5">
                {topThree.map((match, index) => (
                  <div
                    key={match.peptideId}
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      filter: index === 0 ? "none" : `blur(${index * 2}px)`,
                      opacity: index === 0 ? 1 : 0.5,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="text-sm font-semibold text-white"
                          style={index > 0 ? { filter: "blur(5px)", userSelect: "none" } : {}}
                        >
                          {index === 0 ? match.name : "████████"}
                        </span>
                        {index === 0
                          ? match.categories.slice(0, 2).map((category) => (
                              <span
                                key={category}
                                className="rounded-full px-2 py-0.5 text-xs"
                                style={{
                                  background: "rgba(56,189,248,0.15)",
                                  color: "#38bdf8",
                                }}
                              >
                                {category}
                              </span>
                            ))
                          : null}
                      </div>
                    </div>
                    <span
                      className="flex-shrink-0 text-lg font-bold"
                      style={{
                        color: index === 0 ? "#38bdf8" : "rgba(255,255,255,0.3)",
                        filter: index > 0 ? "blur(4px)" : "none",
                        fontFamily: "'DM Serif Display', serif",
                      }}
                    >
                      {match.matchPercent}%
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-20 rounded-b-xl"
                style={{ background: "linear-gradient(to bottom, transparent, #0f172a)" }}
              />
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError("");
                }}
                className="rounded-xl border-0 text-base"
                style={{
                  height: "52px",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  outline: "1px solid rgba(255,255,255,0.15)",
                }}
                required
              />
              {emailError ? <p className="mt-1.5 text-xs text-red-400">{emailError}</p> : null}
            </div>

            <div
              className="flex items-start gap-3 rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(value) => setConsent(value === true)}
                className="mt-0.5 h-5 w-5 flex-shrink-0 border-white/30 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <label
                htmlFor="consent"
                className="cursor-pointer text-xs leading-relaxed"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                I agree to receive my personalized peptide report and understand that PeptidePilot may connect me with vetted telehealth and wellness providers relevant to my profile. I can withdraw consent at any time.{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-2"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !consent}
              className="w-full rounded-xl border-0 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99]"
              style={{
                height: "52px",
                background: consent
                  ? "linear-gradient(135deg, #38bdf8, #a855f7)"
                  : "rgba(255,255,255,0.1)",
                color: consent ? "white" : "rgba(255,255,255,0.35)",
                cursor: consent ? "pointer" : "not-allowed",
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Preparing your report…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Unlock My Full Results
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Free, always. No credit card required. Unsubscribe anytime.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function Results() {
  const [, navigate] = useLocation();
  const { state, reset } = useQuiz();
  const { session, isLoading: isReturningSessionLoading, seedReturningSession } =
    useReturningSession();
  const [revealed, setRevealed] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [matches, setMatches] = useState<ReturningMatchSummary[]>([]);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [selectedPeptideId, setSelectedPeptideId] = useState("");
  const [pendingMetaEventIds, setPendingMetaEventIds] = useState<{
    lead: string;
    completeRegistration: string;
    viewContent: string;
  } | null>(null);

  const sessionId = getVisitorSessionId();
  const submitQuiz = trpc.quiz.submitQuiz.useMutation({
    onSuccess: (data) => {
      setLeadId(data.leadId);
      setMatches(data.returningResults);
      setRevealed(true);

      if (submittedEmail) {
        applyMetaAdvancedMatching(submittedEmail);
      }

      const isGlp1Lead = data.returningResults[0]?.peptideId === "semaglutide";

      trackMetaEvent(
        "CompleteRegistration",
        {
          content_name: "Peptide Quiz",
          status: "completed",
        },
        pendingMetaEventIds?.completeRegistration,
      );
      trackMetaEvent(
        "Lead",
        {
          content_name: data.returningResults[0]?.name ?? "Peptide Results",
          content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
          value: isGlp1Lead ? 50 : 10,
          currency: "USD",
        },
        pendingMetaEventIds?.lead,
      );
      trackMetaEvent(
        "ViewContent",
        {
          content_name: data.returningResults[0]?.name ?? "Peptide Results",
          content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
          content_ids: data.returningResults[0]?.peptideId
            ? [data.returningResults[0].peptideId]
            : undefined,
        },
        pendingMetaEventIds?.viewContent,
      );

      if (submittedEmail) {
        void identifyLogRocketUser(submittedEmail, {
          email: submittedEmail,
          leadId: data.leadId,
          topMatch: data.returningResults[0]?.peptideId ?? null,
          budget: BUDGET_OPTIONS[state.answers[QUIZ_INDEX.BUDGET] ?? -1] ?? null,
          ageRange: AGE_RANGE_OPTIONS[state.answers[QUIZ_INDEX.AGE_RANGE] ?? -1] ?? null,
          primaryGoal:
            PRIMARY_GOAL_OPTIONS[state.answers[QUIZ_INDEX.PRIMARY_GOAL] ?? -1] ?? null,
        });
      }

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
  const activeMatches = revealed ? matches : restoredMatches;
  const activeLeadId = revealed ? leadId : session?.leadId ?? "";

  const availablePeptideIds = trpc.affiliates.availablePeptideIds.useQuery(
    { peptideIds: activeMatches.map((match) => match.peptideId) },
    {
      enabled: activeMatches.length > 0,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (!hasFreshQuizState && !session && !isReturningSessionLoading) {
      navigate("/quiz");
    }
  }, [hasFreshQuizState, isReturningSessionLoading, navigate, session]);

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

    const affiliateVendors = (activeLinks.data ?? []).map((link) => ({
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

  const handleReveal = (email: string, consent: boolean) => {
    const eventIds = {
      lead: createMetaEventId("lead"),
      completeRegistration: createMetaEventId("complete_registration"),
      viewContent: createMetaEventId("view_content"),
    };
    const browserIds = getMetaBrowserIdentifiers();

    setSubmittedEmail(email);
    setPendingMetaEventIds(eventIds);

    submitQuiz.mutate({
      email,
      consentGiven: consent,
      answers: state.answers.map((answer) => answer ?? -1),
      sessionId,
      meta: {
        sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        leadEventId: eventIds.lead,
        completeRegistrationEventId: eventIds.completeRegistration,
        viewContentEventId: eventIds.viewContent,
        ...browserIds,
      },
    });
  };

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
    <LeadCaptureGate
      onReveal={handleReveal}
      isLoading={submitQuiz.isPending}
      previewMatches={previewMatches}
    />
  );
}
