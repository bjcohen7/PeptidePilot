import { useEffect, useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { trackMetaCustomEvent, trackMetaEvent, createMetaEventId, applyMetaAdvancedMatching, getMetaBrowserIdentifiers } from "@/lib/metaPixel";
import { LeadCaptureGate, ResultsDisplay } from "@/pages/Results";
import VerdictResults from "@/pages/VerdictResults";
import ProtocolBriefing from "@/pages/ProtocolBriefing";
import ErrorBoundary from "@/components/ErrorBoundary";

function sendFunnelEvent(event: string, data?: Record<string, unknown>) {
  const sessionId = getVisitorSessionId();
  const body = JSON.stringify({ sessionId, event, data: data ?? null });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/funnel-event", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/analytics/funnel-event", {
    method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true,
  }).catch(() => {});
}

export default function ResultsByPublicId() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/results/:publicId");
  const publicId = params?.publicId;
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [emailAttached, setEmailAttached] = useState(false);
  const fetchedRef = useRef(false);
  const [pendingEventIds, setPendingEventIds] = useState<{
    lead: string;
    completeRegistration: string;
    viewContent: string;
  } | null>(null);

  const { data, isLoading, error } = trpc.quiz.getResultsByPublicId.useQuery(
    { publicId: publicId ?? "" },
    { enabled: !!publicId, retry: 2, refetchOnMount: false },
  );

  const attachEmail = trpc.quiz.attachEmail.useMutation({
    onSuccess: (result) => {
      if (result.status === "skipped") {
        setEmailAttached(true);
        return;
      }
      setEmailAttached(true);
      if (submittedEmail) {
        applyMetaAdvancedMatching(submittedEmail);
        const isGlp1Lead = (data?.results?.[0]?.peptideId ?? "") === "semaglutide";
        trackMetaEvent("CompleteRegistration", {
          content_name: "Peptide Quiz",
          status: "completed",
        }, pendingEventIds?.completeRegistration);
        trackMetaEvent("Lead", {
          content_name: "Weight Management Match",
          content_category: isGlp1Lead ? "weight-management" : "quiz-results",
          value: isGlp1Lead ? 50 : 10,
          currency: "USD",
        }, pendingEventIds?.lead);
        trackMetaEvent("ViewContent", {
          content_name: "Weight Management Match",
          content_category: isGlp1Lead ? "weight-management" : "quiz-results",
          content_ids: data?.results?.[0]?.peptideId ? ["match-primary"] : undefined,
        }, pendingEventIds?.viewContent);
      }
    },
    onError: () => {
      setEmailAttached(true);
    },
  });

  useEffect(() => {
    if (data && !fetchedRef.current) {
      fetchedRef.current = true;
      sendFunnelEvent("ResultsRequested", { publicId });
      trackMetaCustomEvent("ResultsRequested", { publicId });
    }
  }, [data, publicId]);

  useEffect(() => {
    if (data?.results && data.results.length > 0) {
      sendFunnelEvent("ResultsRendered", { publicId });
      trackMetaCustomEvent("ResultsRendered", { publicId });
    }
  }, [data?.results, publicId]);

  const handleEmailReveal = (email: string, consent: boolean, firstName: string) => {
    if (!data?.leadId) return;

    const eventIds = {
      lead: createMetaEventId("lead"),
      completeRegistration: createMetaEventId("complete_registration"),
      viewContent: createMetaEventId("view_content"),
    };
    setPendingEventIds(eventIds);
    setSubmittedEmail(email);

    attachEmail.mutate({
      leadId: data.leadId,
      email,
      firstName: firstName || undefined,
      consentGiven: consent,
      meta: {
        leadEventId: eventIds.lead,
        completeRegistrationEventId: eventIds.completeRegistration,
        viewContentEventId: eventIds.viewContent,
        ...getMetaBrowserIdentifiers(),
      },
    });
  };

  const handleRetake = () => {
    navigate("/quiz");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-sm text-muted-foreground">Loading your results…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t find your results. Enter your email to recover them.
          </p>
          <EmailRecoveryForm publicId={publicId} />
        </div>
      </div>
    );
  }

  // Valid lead, but their answers are from an older quiz version we can no longer
  // render into a match. Never show an error — invite a quick retake.
  if (data.renderable === false || !data.results || data.results.length === 0) {
    return <RetakeView onRetake={handleRetake} />;
  }

  const hasRealEmail = data.hasRealEmail;
  const showGate = !hasRealEmail && !emailAttached;

  if (!showGate && data.results && data.results.length > 0) {
    // RESULTS_PAGE_MODE flag (server env, default 'briefing'), with a ?rmode=
    // query override for side-by-side testing on this noindex page. Briefing
    // requires providerMatches — older leads without them fall through to the
    // pre-existing experiences unchanged.
    const rmodeOverride = new URLSearchParams(window.location.search).get("rmode");
    const mode = rmodeOverride === "classic" || rmodeOverride === "briefing"
      ? rmodeOverride
      : data.resultsPageMode ?? "briefing";
    // The briefing is weight-loss framed end to end — rendering it for a lead
    // whose goal/top match isn't weight management would misstate their answers.
    // Those leads keep the pre-existing experiences.
    const wlRelevant =
      data.topPeptideMatch === "semaglutide" ||
      data.topPeptideMatch === "tirzepatide" ||
      data.leadQuizData?.primaryGoalIdx === 1;
    if (mode === "briefing" && wlRelevant && data.providerMatches && data.providerMatches.length > 0) {
      return (
        <ProtocolBriefing
          publicId={data.publicId}
          providerMatches={data.providerMatches}
          providerDetails={data.providerDetails}
          heightIn={data.heightIn}
          weightLbs={data.weightLbs}
          firstName={data.firstName}
          promoTerms={data.promoTerms}
          leadQuizData={data.leadQuizData}
          resultsUrl={`${window.location.origin}/results/${data.publicId}`}
        />
      );
    }
    const isVerdict = data.experimentVariant === "verdict";
    if (isVerdict && data.providerMatches && data.providerMatches.length > 0) {
      return (
        <VerdictResults
          providerMatches={data.providerMatches}
          providerDetails={data.providerDetails}
          publicId={data.publicId}
          leadId={data.leadId}
          emailDelivered={data.emailDelivered}
          leadQuizData={data.leadQuizData}
        />
      );
    }
    return (
      <ResultsDisplay
        leadId={data.leadId}
        sessionId={getVisitorSessionId()}
        onRetake={handleRetake}
        isReturningUser={false}
        userEmail={data.email || submittedEmail || undefined}
        publicId={publicId}
        emailDelivered={data.emailDelivered}
      />
    );
  }

  if (showGate) {
    return (
      <LeadCaptureGate
        onReveal={handleEmailReveal}
        isLoading={attachEmail.isPending}
        previewMatches={data.results || []}
      />
    );
  }

  // Reachable only for a lead that has results but no gate/verdict/display match;
  // treat like an older-quiz lead and invite a retake rather than showing an error.
  return <RetakeView onRetake={handleRetake} />;
}

function RetakeView({ onRetake }: { onRetake: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-5 max-w-sm">
        <h1 className="text-xl font-semibold text-foreground">Let&apos;s refresh your match</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your answers are from an older version of our quiz. Retake it in about 4 minutes
          and we&apos;ll give you an updated, personalized provider match.
        </p>
        <button
          type="button"
          onClick={onRetake}
          className="w-full rounded-xl h-12 font-semibold text-base text-white bg-accent hover:opacity-90 transition-all"
        >
          Retake the quiz &rarr;
        </button>
      </div>
    </div>
  );
}

function EmailRecoveryForm({ publicId }: { publicId?: string }) {
  const [email, setEmail] = useState("");
  const [, navigate] = useLocation();
  const recover = trpc.quiz.getResultsByPublicId.useQuery(
    { publicId: publicId ?? "" },
    { enabled: false },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicId) { navigate("/quiz"); return; }
    recover.refetch().then((result) => {
      if (result.data) {
        sendFunnelEvent("ResultsRecovered", { publicId });
        trackMetaCustomEvent("ResultsRecovered", { publicId });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm mx-auto">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl h-12 px-4 text-base border border-border/60 bg-background"
        required
      />
      <button
        type="submit"
        className="w-full rounded-xl h-12 font-semibold text-base text-white bg-accent hover:opacity-90 transition-all"
      >
        Recover Results
      </button>
    </form>
  );
}
