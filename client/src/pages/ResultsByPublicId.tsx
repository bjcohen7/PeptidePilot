import { useEffect, useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { getVisitorSessionId } from "@/components/SessionTracker";
import { trackMetaCustomEvent, trackMetaEvent, createMetaEventId, applyMetaAdvancedMatching, getMetaBrowserIdentifiers } from "@/lib/metaPixel";
import { identifyLogRocketUser } from "@/lib/logrocket";
import { LeadCaptureGate, ResultsDisplay } from "@/pages/Results";
import VerdictResults from "@/pages/VerdictResults";
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
          content_name: data?.results?.[0]?.name ?? "Peptide Results",
          content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
          value: isGlp1Lead ? 50 : 10,
          currency: "USD",
        }, pendingEventIds?.lead);
        trackMetaEvent("ViewContent", {
          content_name: data?.results?.[0]?.name ?? "Peptide Results",
          content_category: isGlp1Lead ? "GLP-1" : "quiz-results",
          content_ids: data?.results?.[0]?.peptideId ? [data.results[0].peptideId] : undefined,
        }, pendingEventIds?.viewContent);
        void identifyLogRocketUser(submittedEmail, {
          email: submittedEmail,
          leadId: data?.leadId ?? "",
          topMatch: data?.results?.[0]?.peptideId ?? null,
        });
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

  const handleEmailReveal = (email: string, consent: boolean) => {
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

  const hasRealEmail = data.hasRealEmail;
  const showGate = !hasRealEmail && !emailAttached;

  if (!showGate && data.results && data.results.length > 0) {
    const isVerdict = data.experimentVariant === "verdict";
    if (isVerdict && data.providerMatches && data.providerMatches.length > 0) {
      return (
        <VerdictResults
          providerMatches={data.providerMatches}
          providerDetails={data.providerDetails}
          publicId={data.publicId}
          leadId={data.leadId}
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Something went wrong loading your results.
        </p>
        <EmailRecoveryForm publicId={publicId} />
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
