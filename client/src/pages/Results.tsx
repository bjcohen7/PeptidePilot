import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  toReturningMatchSummary,
  type ReturningMatchSummary,
} from "../../../shared/scoring";
import { trpc } from "@/lib/trpc";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import { GLP1PromoBox } from "@/components/GLP1PromoBox";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { identifyLogRocketUser } from "@/lib/logrocket";
import {
  applyMetaAdvancedMatching,
  createMetaEventId,
  getMetaBrowserIdentifiers,
  trackMetaEvent,
} from "@/lib/metaPixel";

const LIBRARY_BACKED_PROFILE_IDS = new Set<string>(libraryBackedPeptideProfileIds);

function getLibraryBackedMatches(answers: number[]) {
  return calculateMatches(answers).filter((result) =>
    LIBRARY_BACKED_PROFILE_IDS.has(result.peptide.id),
  );
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
              Your peptide profile is ready.
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(0.9rem, 2.5vw, 1rem)", lineHeight: 1.7 }}>
              We matched your biology across 8 domains. Enter your email to unlock your full personalized protocol.
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
                I agree to receive my personalized peptide report and understand that PeptidePilot may connect me with vetted telehealth and wellness providers relevant to my profile. I can withdraw consent at any time.{" "}
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

function PeptideCard({
  result,
  rank,
  leadId,
}: {
  result: ReturningMatchSummary;
  rank: number;
  leadId: string;
}) {
  const { peptideId, name, description, categories, matchPercent } = result;
  const isTop = rank === 1;
  const [isExpanded, setIsExpanded] = useState(false);
  const isGlp1Match = peptideId === "semaglutide";

  const trackClick = trpc.quiz.trackAffiliateClick.useMutation();
  const activeLinks = trpc.affiliates.activeLinksByPeptide.useQuery(
    { peptideId },
    { retry: false, refetchOnWindowFocus: false }
  );
  const vendors = (activeLinks.data ?? []).map((link) => ({ name: link.label, url: link.url }));

  const handleVendorClick = (vendor: string) => {
    if (leadId) {
      trackClick.mutate({ leadId, peptideId, vendor });
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
          <span className="text-sm font-semibold text-white">Top Match</span>
        </div>
      )}

      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">#{rank}</span>
              <h3
                className={`font-normal text-foreground leading-tight ${isTop ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"}`}
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {name}
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="text-xs font-medium bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5"
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div
              className={`font-bold leading-none ${isTop ? "text-3xl sm:text-4xl text-accent" : "text-2xl sm:text-3xl text-muted-foreground"}`}
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {matchPercent}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">match</div>
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="match-bar-fill h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${matchPercent}%` }}
          />
        </div>

        <p
          className={`text-sm text-muted-foreground leading-relaxed ${vendors.length > 0 ? "mb-4 sm:mb-5" : "mb-3"} ${
            isTop || isExpanded ? "" : "line-clamp-3"
          }`}
        >
          {description}
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

        {isGlp1Match && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            GLP-1 medications require clinician review, prescription eligibility, and individualized medical guidance.
          </div>
        )}

        {vendors.length > 0 ? (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            {vendors.map((vendor) => (
              <a
                key={vendor.name}
                href={vendor.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleVendorClick(vendor.name)}
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 sm:py-2 rounded-lg border border-accent/30 text-accent hover:bg-accent hover:text-white transition-all sm:text-xs sm:px-3"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {isGlp1Match ? `Check Eligibility with ${vendor.name}` : vendor.name}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultsDisplay({
  matches,
  leadId,
  sessionId,
  onRetake,
  isReturningUser,
}: {
  matches: ReturningMatchSummary[];
  leadId: string;
  sessionId: string;
  onRetake: () => void;
  isReturningUser: boolean;
}) {
  const topMatch = matches[0];
  const secondaryMatches = matches.slice(1, 5);
  const topCategories = topMatch?.categories.slice(0, 3) ?? [];

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
                Welcome back. We saved your peptide profile.
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
              Your Personalized Peptide Profile
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              Based on your responses, here are the peptides most aligned with your biology and goals.
            </p>
          </div>

          {topMatch && (
            <div className="mb-5 sm:mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <PeptideCard result={topMatch} rank={1} leadId={leadId} />
              <div className="mt-4 rounded-2xl border border-border/70 bg-white px-4 py-4 sm:px-5">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-2">
                  Why this rose to the top
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  Your responses lined up most strongly with{" "}
                  <span className="font-semibold text-foreground">{topMatch.name}</span>
                  {topCategories.length
                    ? ` across ${topCategories.join(", ").toLowerCase()}`
                    : ""}.
                  {" "}That doesn&apos;t mean it&apos;s the only relevant option, but it does mean it had the strongest overall fit against your goals, symptoms, and lifestyle inputs.
                </p>
              </div>
            </div>
          )}

          {secondaryMatches.length > 0 && (
            <div className="mb-7 sm:mb-8">
              <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex flex-wrap items-center gap-2">
                Additional Matches
                <span className="text-xs font-normal text-muted-foreground">(ranked by compatibility)</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {secondaryMatches.map((result, idx) => (
                  <div
                    key={result.peptideId}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${0.15 + idx * 0.07}s` }}
                  >
                    <PeptideCard result={result} rank={idx + 2} leadId={leadId} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-7 sm:mb-8 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 text-sm mb-1">Medical Disclaimer</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                The information above is for educational purposes only and does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before beginning any peptide protocol. Peptide compounds vary in regulatory status by jurisdiction.{" "}
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
  const {
    session,
    isLoading: isReturningSessionLoading,
    hasSettledHydration: hasSettledReturningSession,
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

  const hasFreshQuizState = state.isComplete || state.answers.some((answer) => answer !== null);
  const previewMatches = getLibraryBackedMatches(state.answers.map((a) => a ?? -1)).map(
    toReturningMatchSummary,
  );
  const restoredMatches = !hasFreshQuizState ? session?.topMatches ?? [] : [];
  const activeLeadId = revealed ? leadId : session?.leadId ?? "";
  const activeMatches = revealed ? matches : restoredMatches;
  const isReturningUser = !revealed && Boolean(session && !session.justCompletedQuiz);

  useEffect(() => {
    if (!hasFreshQuizState && hasSettledReturningSession && !session) {
      navigate("/quiz");
    }
  }, [hasFreshQuizState, hasSettledReturningSession, navigate, session]);

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

  if (!hasFreshQuizState && isReturningSessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-sm text-muted-foreground">Loading your saved results…</div>
      </div>
    );
  }

  if (activeMatches.length > 0) {
    return (
      <ResultsDisplay
        matches={activeMatches}
        leadId={activeLeadId}
        sessionId={sessionId}
        onRetake={handleRetake}
        isReturningUser={isReturningUser}
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
