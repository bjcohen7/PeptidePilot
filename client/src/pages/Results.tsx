import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { WebviewEscapeHint } from "@/components/WebviewEscapeHint";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Star,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useQuiz } from "@/contexts/QuizContext";
import { useReturningSession } from "@/contexts/UserSessionContext";
import {
  AGE_RANGE_OPTIONS,
  BUDGET_OPTIONS,
  calculateMatches,
  libraryBackedPeptideProfileIds,
  PRIMARY_GOAL_OPTIONS,
  QUIZ_INDEX,
  type ReturningMatchSummary,
} from "../../../shared/scoring";
import { trpc } from "@/lib/trpc";
import { GLP1_PROVIDERS, type GLP1Provider } from "../../../shared/providerData";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import { GLP1PromoBox } from "@/components/GLP1PromoBox";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { identifyLogRocketUser } from "@/lib/logrocket";
import {
  applyMetaAdvancedMatching,
  createMetaEventId,
  getMetaBrowserIdentifiers,
  trackMetaEvent,
  trackMetaCustomEvent,
} from "@/lib/metaPixel";
import { getFacebookTrackingParams } from "@/utils/facebookUtils";

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

export function LeadCaptureGate({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  const topThree = previewMatches.slice(0, 3);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)" }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 500, height: 500, top: "-10%", left: "-5%",
            background: "radial-gradient(circle, #38bdf81a, transparent 70%)",
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 400, height: 400, bottom: "-10%", right: "-5%",
            background: "radial-gradient(circle, #a855f71a, transparent 70%)",
          }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-center px-4 pt-5 pb-4">
        <Link href="/">
          <PeptidePilotLogo height={30} variant="light" />
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center py-6 sm:py-10 px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-xs font-semibold tracking-widest uppercase"
              style={{ background: "rgba(56,189,248,0.12)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.25)" }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Analysis Complete
            </div>
            <h1
              className="text-white mb-3 leading-snug"
              style={{
                fontSize: "clamp(1.7rem, 4.5vw, 2.4rem)",
                fontFamily: "'DM Serif Display', Georgia, serif",
                letterSpacing: "-0.02em",
              }}
            >
              Your treatment profile is ready.
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(0.9rem, 2.5vw, 1rem)", lineHeight: 1.7 }}>
              Based on your responses, we've matched you with GLP-1 treatment options tailored to your needs. Enter your email to unlock your full recommendations.
            </p>
          </div>

          {topThree.length > 0 && (
            <div className="mb-7 relative">
              <div className="space-y-2.5">
                {topThree.map((m, i) => (
                  <div
                    key={m.peptideId}
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      filter: i === 0 ? "none" : `blur(${i * 2}px)`,
                      opacity: i === 0 ? 1 : 0.5,
                    }}
                  >
                    {i === 0 && (
                      <Star className="w-4 h-4 flex-shrink-0" style={{ color: "#38bdf8" }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-semibold text-white text-sm"
                          style={i > 0 ? { filter: "blur(5px)", userSelect: "none" } : {}}
                        >
                          {i === 0 ? m.name : "████████"}
                        </span>
                        {i === 0 && m.categories.slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span
                      className="font-bold text-lg flex-shrink-0"
                      style={{
                        color: i === 0 ? "#38bdf8" : "rgba(255,255,255,0.3)",
                        filter: i > 0 ? "blur(4px)" : "none",
                        fontFamily: "'DM Serif Display', serif",
                      }}
                    >
                      {m.matchPercent}%
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="absolute bottom-0 left-0 right-0 h-20 rounded-b-xl"
                style={{ background: "linear-gradient(to bottom, transparent, #0f172a)" }}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                className="rounded-xl text-base border-0"
                style={{
                  height: "52px",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  outline: "1px solid rgba(255,255,255,0.15)",
                }}
                required
              />
              {emailError && (
                <p className="text-red-400 text-xs mt-1.5">{emailError}</p>
              )}
            </div>

            <div
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <Checkbox
                id="consent"
                checked={consent}
                onCheckedChange={(val) => setConsent(val === true)}
                className="mt-0.5 flex-shrink-0 w-5 h-5 border-white/30 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
              />
              <label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer" style={{ color: "rgba(255,255,255,0.55)" }}>
                I agree to receive my personalized treatment recommendations and understand that PeptidePilot may connect me with vetted telehealth and wellness providers relevant to my profile. I can withdraw consent at any time.{" "}
                <Link href="/privacy" className="underline underline-offset-2" style={{ color: "rgba(255,255,255,0.75)" }}>
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !consent}
              className="w-full rounded-xl font-semibold text-base text-white transition-all hover:opacity-90 active:scale-[0.99] border-0"
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
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Preparing your report…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Unlock My Full Results
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <p className="text-center mt-4 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
            Free, always. No credit card required. Unsubscribe anytime.
          </p>
        </div>
      </main>
    </div>
  );
}

function ProviderCard({
  provider,
  rank,
  leadId,
  userEmail,
  publicId,
}: {
  provider: GLP1Provider;
  rank: number;
  leadId: string;
  userEmail?: string;
  publicId?: string;
}) {
  const isTop = rank === 1;
  const [isExpanded, setIsExpanded] = useState(false);

  const trackClick = trpc.quiz.trackAffiliateClick.useMutation();

  const goUrl = publicId ? `/go/${provider.id}/${publicId}?position=provider-${rank}` : provider.affiliateUrl;

  const handleProviderClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    if (leadId) {
      trackClick.mutate({ leadId, peptideId: provider.id, vendor: provider.name });
    }

    const eventId = createMetaEventId("affiliate_click");
    trackMetaCustomEvent("AffiliateClick", { supplier: provider.name, peptide: provider.name }, eventId);

    const { fbc, fbp } = getFacebookTrackingParams();

    try {
      await fetch("/api/capi/track-affiliate-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail ?? null,
          eventUrl: window.location.href,
          fbc: fbc ?? null,
          fbp: fbp ?? null,
          userAgent: navigator.userAgent,
          supplierName: provider.name,
          peptideName: provider.name,
          eventId,
        }),
        keepalive: true,
      });
    } catch (err) {
      console.warn("[CAPI] Affiliate click tracking failed:", err);
    } finally {
      window.open(goUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-all ${
        isTop
          ? "border-accent/40 shadow-lg shadow-accent/10 ring-1 ring-accent/20"
          : "border-border/60 shadow-sm"
      }`}
    >
      {isTop && (
        <div className="px-4 sm:px-5 py-2.5 flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, #0d9488, #0891b2)" }}>
          <Star className="w-4 h-4 text-white fill-white flex-shrink-0" />
          <span className="text-sm font-semibold text-white">Best Overall</span>
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">#{rank}</span>
              <h3
                className={`font-normal text-foreground leading-tight ${isTop ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"}`}
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {provider.brandName}
              </h3>
              {provider.positioningTag && (
                <Badge
                  variant="secondary"
                  className="text-xs font-medium bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5"
                >
                  {provider.positioningTag}
                </Badge>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div
              className={`font-bold leading-none ${isTop ? "text-3xl sm:text-4xl text-accent" : "text-2xl sm:text-3xl text-muted-foreground"}`}
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {provider.priceTag}
            </div>
            <div className="text-xs text-muted-foreground mt-1">starting</div>
          </div>
        </div>

        <p
          className={`text-sm text-muted-foreground leading-relaxed mb-4 sm:mb-5 ${isTop || isExpanded ? "" : "line-clamp-3"}`}
        >
          {provider.subDescription || `${provider.medications} \u2014 ${provider.providerModel}. Cancels ${provider.cancelPolicy.toLowerCase()}.`}
        </p>

        {!isTop && (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="mb-4 text-sm font-semibold text-accent transition-opacity hover:opacity-80"
          >
            {isExpanded ? "Show less" : "Read more"}
          </button>
        )}

        <a
          href={goUrl}
          rel="noopener noreferrer"
          onClick={handleProviderClick}
          className={`flex items-center justify-center gap-2 font-bold rounded-xl shadow-md transition-all w-full ${
            isTop
              ? "text-base sm:text-lg py-4 px-6 bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 hover:scale-[1.02]"
              : "text-sm sm:text-base py-4 px-6 bg-teal-600 text-white hover:bg-teal-700 hover:scale-[1.01]"
          }`}
        >
          <ExternalLink className={`${isTop ? "w-5 h-5" : "w-4 h-4"} flex-shrink-0`} />
          Check Eligibility with {provider.name}
        </a>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          GLP-1 medications require clinician review, prescription eligibility, and individualized medical guidance.
        </div>
      </div>
    </div>
  );
}

export function ResultsDisplay({
  leadId,
  sessionId,
  onRetake,
  isReturningUser,
  userEmail,
  publicId,
  emailDelivered,
}: {
  leadId: string;
  sessionId: string;
  onRetake: () => void;
  isReturningUser: boolean;
  userEmail?: string;
  publicId?: string;
  emailDelivered?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <PeptidePilotLogo height={28} variant="dark" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetake}
              className="text-muted-foreground gap-1.5 text-xs h-8 px-2 sm:px-3"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Retake Quiz</span>
              <span className="sm:hidden">Retake</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="py-8 sm:py-12">
        <div className="container max-w-3xl">
          <div className="text-center mb-8 sm:mb-10 animate-fade-in-up">
            {isReturningUser ? (
              <div className="mb-3 text-sm font-medium text-accent">
                Welcome back. We saved your results.
              </div>
            ) : null}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold tracking-widest uppercase bg-accent/10 text-accent border border-accent/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Analysis Complete
            </div>
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-normal text-foreground mb-3 leading-snug"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Your Personalized Treatment Options
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              Based on your responses, here are the top GLP-1 telehealth providers matched to your needs.
            </p>
            <WebviewEscapeHint emailDelivered={emailDelivered} />
          </div>

          <div className="space-y-5 sm:space-y-6">
            {GLP1_PROVIDERS.map((provider, idx) => (
              <div
                key={provider.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.1 + idx * 0.07}s` }}
              >
                <ProviderCard provider={provider} rank={idx + 1} leadId={leadId} userEmail={userEmail} publicId={publicId} />
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-7 sm:mb-8 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm mb-1">Medical Disclaimer</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                The information above is for educational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before beginning any GLP-1 treatment.{" "}
                <Link href="/disclaimer" className="underline underline-offset-2">
                  Read our full disclaimer.
                </Link>
              </p>
            </div>
          </div>

          <div className="text-center pb-6">
            <Button
              variant="outline"
              onClick={onRetake}
              className="gap-2 text-muted-foreground border-border/60 w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4" />
              Retake the Quiz
            </Button>
          </div>

          <GLP1PromoBox leadId={leadId} sessionId={sessionId} />
        </div>
      </main>
    </div>
  );
}

export default function Results() {
  const [, navigate] = useLocation();
  const { state, reset } = useQuiz();
  const storedPublicId = typeof window !== "undefined"
    ? sessionStorage.getItem("peptidepilot_last_public_id")
    : null;
  const {
    session,
    isLoading: isReturningSessionLoading,
    sessionStatus,
    seedReturningSession,
  } =
    useReturningSession();
  const [revealed, setRevealed] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [matches, setMatches] = useState<ReturningMatchSummary[]>([]);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const sessionId = getVisitorSessionId();
  const [pendingMetaEventIds, setPendingMetaEventIds] = useState<{
    lead: string;
    completeRegistration: string;
    viewContent: string;
  } | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  const submitQuiz = trpc.quiz.submitQuiz.useMutation({
    onSuccess: (data) => {
      setLeadId(data.leadId);
      setMatches(data.returningResults);
      setRevealed(true);
      if (submittedEmail) {
        applyMetaAdvancedMatching(submittedEmail);
      }
      const isGlp1Lead = data.returningResults[0]?.peptideId === "semaglutide";
      trackMetaEvent("CompleteRegistration", {
        content_name: "Peptide Quiz",
        status: "completed",
      }, pendingMetaEventIds?.completeRegistration);
      trackMetaEvent("Lead", {
        content_name: data.returningResults[0]?.name ?? "Peptide Results",
        content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
        value: isGlp1Lead ? 50 : 10,
        currency: "USD",
      }, pendingMetaEventIds?.lead);
      trackMetaEvent("ViewContent", {
        content_name: data.returningResults[0]?.name ?? "Peptide Results",
        content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
        content_ids: data.returningResults[0]?.peptideId
          ? [data.returningResults[0].peptideId]
          : undefined,
      }, pendingMetaEventIds?.viewContent);
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
        try {
          seedReturningSession({
            token: data.returningToken,
            leadId: data.leadId,
            createdAt: new Date(),
            topMatches: data.returningResults,
            justCompletedQuiz: true,
          });
        } catch (error) {
          console.error("[ReturningUser] Failed to seed session:", error);
        }
      }
    },
    onError: (err) => {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    },
  });

  // Pre-compute matches for the preview
  const hasFreshQuizState = state.isComplete || state.answers.some((answer) => answer !== null);
  const previewMatches = getLibraryBackedMatches(state.answers.map((a) => a ?? -1)).map(
    toReturningMatchSummary,
  );
  const restoredMatches = !hasFreshQuizState ? session?.topMatches ?? [] : [];
  const activeLeadId = revealed ? leadId : session?.leadId ?? "";
  const activeMatches = revealed ? matches : restoredMatches;
  const isReturningUser = !revealed && Boolean(session && !session.justCompletedQuiz);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const recoverByEmail = trpc.quiz.recoverLeadByEmail.useQuery(
    { email: recoveryEmail },
    { enabled: false },
  );

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await recoverByEmail.refetch();
    if (result.data?.found && result.data.publicId) {
      navigate(`/results/${result.data.publicId}`);
    } else {
      setRecoverySent(true);
    }
  };

  useEffect(() => {
    if (hasFreshQuizState) return;
    if (sessionStatus === "pending") return;
    if (sessionStatus === "restored") return;

    // If we have a stored publicId, redirect to the server-persisted results page
    if (storedPublicId && storedPublicId.length > 0) {
      navigate(`/results/${storedPublicId}`);
      return;
    }

    // Show recovery form instead of immediately redirecting to /quiz
    setShowRecovery(true);
  }, [hasFreshQuizState, navigate, sessionStatus, storedPublicId]);

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
      answers: state.answers.map((a) => a ?? -1),
      sessionId: getVisitorSessionId(),
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

  if (!hasFreshQuizState && sessionStatus === "pending" && isReturningSessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-sm text-muted-foreground">Loading your saved results…</div>
      </div>
    );
  }

  if (showRecovery) {
    return (
      <ResultsRecoveryForm
        recoveryEmail={recoveryEmail}
        setRecoveryEmail={setRecoveryEmail}
        recoverySent={recoverySent}
        onSubmit={handleRecoverySubmit}
        onRetake={() => { reset(); navigate("/quiz"); }}
      />
    );
  }

  if (activeMatches.length > 0) {
    return (
      <ResultsDisplay
        leadId={activeLeadId}
        sessionId={sessionId}
        onRetake={handleRetake}
        isReturningUser={isReturningUser}
        userEmail={submittedEmail || undefined}
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

function ResultsRecoveryForm({
  recoveryEmail,
  setRecoveryEmail,
  recoverySent,
  onSubmit,
  onRetake,
}: {
  recoveryEmail: string;
  setRecoveryEmail: (v: string) => void;
  recoverySent: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onRetake: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-xl font-semibold" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
          Find Your Results
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the email you used when you took the quiz and we&apos;ll send you a link to your results.
        </p>
        {recoverySent ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
              If an account exists with that email, your results link has been sent. Check your inbox.
            </div>
            <button
              onClick={onRetake}
              className="text-sm text-accent hover:underline"
            >
              Retake the quiz
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="your@email.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              className="w-full rounded-xl h-12 px-4 text-base border border-border/60 bg-background"
              required
            />
            <button
              type="submit"
              className="w-full rounded-xl h-12 font-semibold text-base text-white bg-accent hover:opacity-90 transition-all"
            >
              Send Results Link
            </button>
            <div>
              <button
                type="button"
                onClick={onRetake}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Take the quiz again
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
