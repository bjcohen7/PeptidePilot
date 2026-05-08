import { useMemo, useState, type MouseEvent } from "react";
import { Link } from "wouter";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import type { ReturningMatchSummary } from "../../../../shared/scoring";

export type ResultsVendorCategoryFilter = "research-peptides" | "telehealth";

export type ResultsVendorCard = {
  id: string;
  name: string;
  category: ResultsVendorCategoryFilter;
  affiliateUrl: string;
  logoUrl?: string;
  logoAlt?: string;
  logoMarkFallback: string;
  badge?: string | null;
  headlineValue: string;
  headlineUnit: string;
  promoText?: string | null;
  couponCode?: string | null;
  features: string[];
  trustSignals?: string[];
};

type ResultsCommercePageProps = {
  matches: ReturningMatchSummary[];
  selectedMatch: ReturningMatchSummary;
  vendors: ResultsVendorCard[];
  onRetake: () => void;
  onSelectMatch: (peptideId: string) => void;
  onVendorClick: (vendor: ResultsVendorCard, event?: MouseEvent<HTMLAnchorElement>) => void;
  vendorLoading?: boolean;
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
  const labels = match.categories.slice(0, 2).map((category) => prettyLabel(category).toLowerCase());

  if (labels.length === 0) {
    return `Your quiz profile made ${match.name} the strongest fit — a ${match.matchPercent}% match across your goals and lifestyle.`;
  }

  if (labels.length === 1) {
    return `Your focus on ${labels[0]} made ${match.name} the strongest fit — a ${match.matchPercent}% match across your goals and lifestyle.`;
  }

  return `Your focus on ${labels[0]} and ${labels[1]} made ${match.name} the strongest fit — a ${match.matchPercent}% match across your goals and lifestyle.`;
}

function VendorLogo({
  logoUrl,
  logoAlt,
  fallback,
}: {
  logoUrl?: string;
  logoAlt?: string;
  fallback: string;
}) {
  if (logoUrl) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white p-2 shadow-[inset_0_0_0_1px_rgba(14,31,28,0.06)]">
        <img
          src={logoUrl}
          alt={logoAlt ?? fallback}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-sm font-bold tracking-tight text-[#0e1f1c] shadow-[inset_0_0_0_1px_rgba(14,31,28,0.06)]">
      {fallback}
    </div>
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
  vendors,
  onRetake,
  onSelectMatch,
  onVendorClick,
  vendorLoading = false,
}: ResultsCommercePageProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showSecondaryMatches, setShowSecondaryMatches] = useState(false);

  const descriptionLead = useMemo(
    () => firstSentence(selectedMatch.description),
    [selectedMatch.description],
  );
  const descriptionRest = useMemo(() => {
    if (descriptionLead.length >= selectedMatch.description.length) return "";
    return selectedMatch.description.slice(descriptionLead.length).trim();
  }, [descriptionLead, selectedMatch.description]);

  const primaryVendor = vendors[0] ?? null;
  const alternateVendors = vendors.slice(1, 4);
  const secondaryMatches = matches.filter((match) => match.peptideId !== selectedMatch.peptideId);
  const personalizedReason = buildMatchReason(selectedMatch);
  const trustSignals = primaryVendor?.trustSignals?.length
    ? primaryVendor.trustSignals
    : primaryVendor?.category === "telehealth"
      ? ["Doctor-guided", "Prescription included", "US-licensed"]
      : ["Direct checkout", "Research catalog", "Independent vendor"];

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
                style={{ width: `${selectedMatch.matchPercent}%`, background: "linear-gradient(90deg,#0fb88a 0%, #22d3ee 100%)" }}
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
              {showFullDescription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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

        <section className="relative overflow-hidden rounded-[24px] bg-[#0e1f1c] text-white shadow-[0_24px_60px_rgba(14,31,28,0.25)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(900px 400px at 100% 0%, rgba(34,211,238,0.18), transparent 60%), radial-gradient(700px 360px at 0% 100%, rgba(15,184,138,0.22), transparent 60%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                ✦ Your next step
              </span>
              <span
                className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[#0e1f1c]"
                style={{ background: "linear-gradient(135deg, #0fb88a 0%, #22d3ee 100%)" }}
              >
                Recommended
              </span>
            </div>

            {vendorLoading ? (
              <div className="mt-6 rounded-[18px] border border-white/10 bg-white/5 px-5 py-8 text-sm text-white/70">
                Loading provider options…
              </div>
            ) : primaryVendor ? (
              <>
                <h2
                  className="mt-5 text-[28px] leading-tight text-white md:text-[32px]"
                  style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 600 }}
                >
                  We recommend{" "}
                  <span className="italic text-[#5eead4]">{primaryVendor.name}</span>
                </h2>

                <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex flex-col gap-4 rounded-[18px] border border-white/10 bg-white/5 p-5 md:flex-row md:items-center">
                    <VendorLogo
                      logoUrl={primaryVendor.logoUrl}
                      logoAlt={primaryVendor.logoAlt}
                      fallback={primaryVendor.logoMarkFallback}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[18px] font-bold text-white">{primaryVendor.name}</div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-white">
                          {primaryVendor.headlineValue}
                        </span>
                        <span className="text-sm text-white/65">{primaryVendor.headlineUnit}</span>
                      </div>
                      {primaryVendor.promoText || primaryVendor.couponCode ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {primaryVendor.promoText ? (
                            <span className="rounded-full bg-[#fff4d6] px-3 py-1 text-[11px] font-semibold text-[#7a5500]">
                              {primaryVendor.promoText}
                            </span>
                          ) : null}
                          {primaryVendor.couponCode ? (
                            <span className="rounded-full border border-white/30 px-3 py-1 font-mono text-[11px] font-semibold text-white">
                              Code {primaryVendor.couponCode}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 lg:items-end">
                    <a
                      href={primaryVendor.affiliateUrl}
                      onClick={(event) => onVendorClick(primaryVendor, event)}
                      className="inline-flex min-w-[260px] items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-semibold text-[#0e1f1c] shadow-[0_14px_30px_rgba(15,184,138,0.45)]"
                      style={{ background: "linear-gradient(135deg, #0fb88a 0%, #22d3ee 100%)" }}
                    >
                      Check Eligibility at {primaryVendor.name}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <span className="text-[11px] text-white/55">No commitment</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-4 text-[12px] text-white/75">
                  {trustSignals.map((signal) => (
                    <span key={signal} className="inline-flex items-center gap-2">
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0fb88a] text-[9px] text-[#0e1f1c]">
                        ✓
                      </span>
                      {signal}
                    </span>
                  ))}
                </div>

                {alternateVendors.length > 0 ? (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">
                      Also available at
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {alternateVendors.map((vendor) => (
                        <a
                          key={vendor.id}
                          href={vendor.affiliateUrl}
                          onClick={(event) => onVendorClick(vendor, event)}
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-medium text-white/90"
                        >
                          <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-white text-[9px] font-bold text-[#0e1f1c]">
                            {vendor.logoMarkFallback}
                          </span>
                          {vendor.name}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-6 rounded-[18px] border border-white/10 bg-white/5 px-5 py-8 text-sm leading-7 text-white/72">
                We don’t have a live provider recommendation wired in for this match yet, but the fit itself is still valid and you can compare the other strong options below.
              </div>
            )}
          </div>
        </section>

        {secondaryMatches.length > 0 ? (
          <section className="mx-auto mt-8 max-w-[900px]">
            <button
              type="button"
              onClick={() => setShowSecondaryMatches((current) => !current)}
              className="flex w-full items-center justify-between rounded-[18px] border border-dashed border-[#cfd8d4] bg-white px-5 py-4 text-left transition hover:border-[#0fb88a]/40"
            >
              <span className="text-sm font-semibold text-[#0e1f1c]">
                Compare {secondaryMatches.length} other match{secondaryMatches.length === 1 ? "" : "es"}
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
