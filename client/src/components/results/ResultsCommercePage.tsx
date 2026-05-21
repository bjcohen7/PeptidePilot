import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import type { ReturningMatchSummary } from "../../../../shared/scoring";
import { AffiliateRecommendationSection } from "@/components/affiliate/AffiliateRecommendationSection";
import { TestimonialSection } from "@/components/testimonials/TestimonialSection";
import { trpc } from "@/lib/trpc";

type ResultsCommercePageProps = {
  matches: ReturningMatchSummary[];
  selectedMatch: ReturningMatchSummary;
  onRetake: () => void;
  onSelectMatch: (peptideId: string) => void;
  leadId?: string;
};

function prettyLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function firstSentence(text: string) {
  const sentence = text.match(/.*?[.!?](?:\s|$)/)?.[0]?.trim();
  return sentence || text;
}

function buildMatchReason(match: ReturningMatchSummary) {
  const labels = match.categories.slice(0, 2).map((category) =>
    prettyLabel(category).toLowerCase(),
  );

  if (labels.length === 0) {
    return `Your quiz profile made ${match.name} the strongest fit — a ${match.matchPercent}% match across your goals and lifestyle.`;
  }

  if (labels.length === 1) {
    return `Your focus on ${labels[0]} made ${match.name} the strongest fit — a ${match.matchPercent}% match across your goals and lifestyle.`;
  }

  return `Your focus on ${labels[0]} and ${labels[1]} made ${match.name} the strongest fit — a ${match.matchPercent}% match across your goals and lifestyle.`;
}

function EmailCaptureSection({ leadId }: { leadId?: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [emailError, setEmailError] = useState("");

  const attachEmail = trpc.quiz.attachEmail.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (error) => toast.error(error.message),
  });

  if (dismissed || submitted) return null;

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
    if (!leadId) {
      toast.error("Session error. Please retake the quiz.");
      return;
    }

    attachEmail.mutate({ leadId, email, consentGiven: consent });
  };

  return (
    <section className="mx-auto mt-8 max-w-[600px] rounded-[22px] border border-[#dce7e2] bg-white p-6 shadow-[0_2px_4px_rgba(14,31,28,0.04),0_12px_30px_rgba(14,31,28,0.05)] md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            className="text-[22px] leading-tight text-[#0e1f1c]"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
          >
            Want your complete protocol emailed?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#4a5b58]">
            We'll send you your full personalized peptide report with dosing details, vendor links, and stack recommendations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 rounded-full p-1 text-[#4a5b58] transition hover:bg-[#e2e8e5]"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
          className="h-[52px] w-full rounded-xl border border-[#dce7e2] bg-white px-4 text-[15px] text-[#0e1f1c] placeholder:text-[#9aa8a2] outline-none transition focus:border-[#0fb88a] focus:ring-2 focus:ring-[#0fb88a]/20"
          required
        />
        {emailError ? <p className="text-xs text-red-500">{emailError}</p> : null}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border-[#cfd8d4] text-[#0fb88a] accent-[#0fb88a]"
          />
          <span className="text-xs leading-relaxed text-[#4a5b58]">
            I agree to receive my personalized peptide report and understand that PeptidePilot may connect me with vetted telehealth and wellness providers relevant to my profile. I can withdraw consent at any time.{" "}
            <Link href="/privacy" className="font-medium underline underline-offset-2">
              Privacy Policy
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={attachEmail.isPending || !consent}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border-0 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed"
          style={{
            background: consent
              ? "linear-gradient(135deg, #0fb88a, #22d3ee)"
              : "rgba(0,0,0,0.08)",
            color: consent ? "white" : "rgba(0,0,0,0.25)",
          }}
        >
          {attachEmail.isPending ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Sending…
            </span>
          ) : (
            "Send My Protocol"
          )}
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="block w-full text-center text-xs text-[#9aa8a2] underline underline-offset-2 hover:text-[#4a5b58]"
        >
          No thanks, I'll browse here
        </button>
      </form>
    </section>
  );
}

function SecondaryMatchCard({
  match,
  onSelect,
}: {
  match: ReturningMatchSummary;
  onSelect: (peptideId: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(match.peptideId)}
      className="w-full rounded-2xl border border-[#e2e8e5] bg-white p-4 text-left transition hover:border-[#cfd8d4] hover:bg-[#fbfcfb]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[22px] italic leading-none text-[#0e1f1c]"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
          >
            {match.name}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {match.categories.slice(0, 3).map((category) => (
              <span
                key={category}
                className="rounded-full bg-[#e6f7f1] px-2.5 py-1 text-[11px] font-medium text-[#0a6b54]"
              >
                {prettyLabel(category)}
              </span>
            ))}
          </div>
        </div>
        <span className="whitespace-nowrap text-xs font-semibold text-[#4a5b58]">
          {match.matchPercent}% match
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#4a5b58]">
        {match.description}
      </p>
      <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0a8f73]">
        View providers <ArrowRight className="h-4 w-4" />
      </div>
    </button>
  );
}

export default function ResultsCommercePage({
  matches,
  selectedMatch,
  onRetake,
  onSelectMatch,
  leadId,
}: ResultsCommercePageProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showSecondaryMatches, setShowSecondaryMatches] = useState(true);

  const descriptionLead = useMemo(
    () => firstSentence(selectedMatch.description),
    [selectedMatch.description],
  );
  const descriptionRest = useMemo(() => {
    if (descriptionLead.length >= selectedMatch.description.length) return "";
    return selectedMatch.description.slice(descriptionLead.length).trim();
  }, [descriptionLead, selectedMatch.description]);

  const secondaryMatches = matches.filter(
    (match) => match.peptideId !== selectedMatch.peptideId,
  );
  const personalizedReason = buildMatchReason(selectedMatch);

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#0e1f1c]">
      <header className="sticky top-0 z-30 border-b border-[#e2e8e5] bg-white/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center">
            <PeptidePilotLogo height={26} variant="dark" />
          </Link>
          <button className="text-xs text-[#4a5b58] underline" onClick={onRetake}>
            Retake Quiz
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 pb-10 pt-6 md:px-8 md:pt-10">
        <section className="mx-auto max-w-[760px] text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe7df] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0a6b54]">
            ✦ Analysis Complete
          </span>
          <div className="mt-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#4a5b58]">
            Your top match
          </div>
          <h1
            className="mt-2 text-[48px] leading-none tracking-[-0.03em] text-[#0e1f1c] md:text-[64px]"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
          >
            {selectedMatch.name}
          </h1>
          <div className="mx-auto mt-5 flex max-w-[420px] items-center gap-4">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e2e8e5]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${selectedMatch.matchPercent}%`,
                  background: "linear-gradient(90deg,#0fb88a 0%, #22d3ee 100%)",
                }}
              />
            </div>
            <span className="whitespace-nowrap text-sm font-bold text-[#0a8f73]">
              {selectedMatch.matchPercent}% match
            </span>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {selectedMatch.categories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-[#e6f7f1] px-3 py-1 text-[12px] font-medium text-[#0a6b54]"
              >
                {prettyLabel(category)}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-[760px] rounded-[22px] border border-[#dce7e2] bg-white p-6 shadow-[0_2px_4px_rgba(14,31,28,0.04),0_12px_30px_rgba(14,31,28,0.05)] md:p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4a5b58]">
            What it is
          </div>
          <p className="mt-3 text-[15px] leading-7 text-[#2a3935]">
            {descriptionLead}
          </p>
          {showFullDescription && descriptionRest ? (
            <p className="mt-3 text-[15px] leading-7 text-[#2a3935]">
              {descriptionRest}
            </p>
          ) : null}
          {descriptionRest ? (
            <button
              type="button"
              onClick={() => setShowFullDescription((current) => !current)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#0a8f73]"
            >
              {showFullDescription ? "Hide full description" : "Read full description"}
              {showFullDescription ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </section>

        <section className="mx-auto mt-4 max-w-[760px] rounded-[22px] border border-[#cfe7df] bg-[linear-gradient(180deg,#f4fbf8_0%,#eaf6f1_100%)] p-6 md:p-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0fb88a_0%,#22d3ee_100%)] text-xs text-white">
              ✦
            </span>
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0a6b54]">
              Why this matches you
            </div>
          </div>
          <p className="mt-3 text-[15px] leading-7 text-[#0e1f1c]">
            {personalizedReason}
          </p>
        </section>

        <div className="my-8 flex flex-col items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#cfe7df] bg-white text-[#0a8f73] shadow-[0_4px_14px_rgba(15,184,138,0.18)]">
            ↓
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4a5b58]">
            Your next step
          </span>
        </div>

        <AffiliateRecommendationSection
          peptideId={selectedMatch.peptideId}
          peptideName={selectedMatch.name}
          leadId={leadId}
        />

        <div className="mt-8">
          <TestimonialSection />
        </div>

        <EmailCaptureSection leadId={leadId} />

        {secondaryMatches.length > 0 ? (
          <section className="mx-auto mt-8 max-w-[900px]">
            <button
              type="button"
              onClick={() => setShowSecondaryMatches((current) => !current)}
              className="flex w-full items-center justify-between rounded-[18px] border border-dashed border-[#cfd8d4] bg-white px-5 py-4 text-left transition hover:border-[#0fb88a]/40"
            >
              <span className="text-sm font-semibold text-[#0e1f1c]">
                Compare {secondaryMatches.length} other match
                {secondaryMatches.length === 1 ? "" : "es"}
              </span>
              {showSecondaryMatches ? (
                <ChevronUp className="h-5 w-5 text-[#4a5b58]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[#4a5b58]" />
              )}
            </button>

            {showSecondaryMatches ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {secondaryMatches.map((match) => (
                  <SecondaryMatchCard
                    key={match.peptideId}
                    match={match}
                    onSelect={(peptideId) => {
                      onSelectMatch(peptideId);
                      setShowSecondaryMatches(false);
                      setShowFullDescription(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="mx-auto mt-8 max-w-[760px] text-center text-[12px] text-[#4a5b58]">
          Educational use only. Nothing here is medical advice.{" "}
          <Link href="/disclaimer" className="font-medium underline">
            Full disclaimer
          </Link>
        </div>
      </main>
    </div>
  );
}
