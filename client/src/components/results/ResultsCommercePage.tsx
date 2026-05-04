import { Link } from "wouter";
import { ArrowRight, RotateCcw } from "lucide-react";
import PeptidePilotLogo from "@/components/PeptidePilotLogo";
import { Button } from "@/components/ui/button";
import type { ReturningMatchSummary } from "../../../../shared/scoring";

export type ResultsVendorCategoryFilter = "all" | "research-peptides" | "telehealth";

export type ResultsVendorCard = {
  id: string;
  name: string;
  category: ResultsVendorCategoryFilter;
  affiliateUrl: string;
  learnMoreUrl: string;
  logoUrl?: string;
  logoAlt?: string;
  logoMarkFallback: string;
  badge?: string | null;
  headlineValue: string;
  headlineUnit: string;
  promoText?: string | null;
  couponCode?: string | null;
  planName: string;
  planDetail: string;
  supplyTag: string;
  features: string[];
  trustNote?: string | null;
};

type ResultsCommercePageProps = {
  matches: ReturningMatchSummary[];
  selectedMatch: ReturningMatchSummary;
  vendors: ResultsVendorCard[];
  onRetake: () => void;
  onSelectMatch: (peptideId: string) => void;
  onVendorClick: (vendor: ResultsVendorCard) => void;
  vendorLoading?: boolean;
};

function prettyFocusLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildHeroReason(match: ReturningMatchSummary) {
  const labels = match.categories.slice(0, 2).map((category) => prettyFocusLabel(category).toLowerCase());

  if (labels.length === 0) {
    return "Best aligned with the goals you prioritized in your quiz.";
  }

  if (labels.length === 1) {
    return `Best aligned with your ${labels[0]} goals.`;
  }

  return `Best aligned with your ${labels[0]} and ${labels[1]} goals.`;
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
      <div className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-white p-2 shadow-[inset_0_0_0_1px_rgba(14,31,28,0.06)]">
        <img
          src={logoUrl}
          alt={logoAlt ?? fallback}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-[12px] bg-white text-[15px] font-bold tracking-tight text-[#0e1f1c] shadow-[inset_0_0_0_1px_rgba(14,31,28,0.06)]">
      <span>{fallback}</span>
    </div>
  );
}

function VendorCard({
  vendor,
  onClick,
}: {
  vendor: ResultsVendorCard;
  onClick: (vendor: ResultsVendorCard) => void;
}) {
  return (
    <article className="flex h-full flex-col rounded-[22px] border border-[#e2e8e5] bg-white p-5 shadow-[0_1px_2px_rgba(14,31,28,0.04),0_12px_28px_rgba(14,31,28,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <VendorLogo logoUrl={vendor.logoUrl} logoAlt={vendor.logoAlt} fallback={vendor.logoMarkFallback} />
          <div>
            <div className="text-[18px] font-bold text-[#0e1f1c]">{vendor.name}</div>
            {vendor.badge ? (
              <span className="mt-2 inline-flex rounded-full bg-[#e6f7f1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.05em] text-[#0fb88a]">
                {vendor.badge}
              </span>
            ) : null}
          </div>
        </div>
        <a
          href={vendor.learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap text-[13px] text-[#4a5b58] hover:underline"
        >
          Learn more
        </a>
      </div>

      <div className="mt-5">
        <div className="text-[30px] font-extrabold leading-none tracking-[-0.03em] text-[#0e1f1c]">
          {vendor.headlineValue}
        </div>
        <div className="mt-1 text-[13px] text-[#4a5b58]">{vendor.headlineUnit}</div>
      </div>

      {vendor.promoText || vendor.couponCode ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {vendor.promoText ? (
            <span className="rounded-full bg-[#0e1f1c] px-3 py-1 text-[11px] font-semibold text-white">
              {vendor.promoText}
            </span>
          ) : null}
          {vendor.couponCode ? (
            <span className="rounded-full border border-[#d9e3df] px-3 py-1 text-[11px] font-semibold text-[#0e1f1c]">
              Code {vendor.couponCode}
            </span>
          ) : null}
        </div>
      ) : null}

      {vendor.features.length > 0 ? (
        <ul className="mt-5 space-y-2 text-[13px] leading-6 text-[#4a5b58]">
          {vendor.features.slice(0, 3).map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span className="mt-[8px] h-1.5 w-1.5 rounded-full bg-[#0fb88a]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-5">
        <a
          href={vendor.affiliateUrl}
          onClick={() => onClick(vendor)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0e1f1c] px-5 py-3 text-[14px] font-semibold text-white transition hover:opacity-92"
        >
          Get Started <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </article>
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
      className="w-full rounded-[18px] border border-[#e2e8e5] bg-white p-4 text-left transition hover:border-[#cfd8d4] hover:bg-[#fbfcfb]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="text-[21px] italic text-[#0e1f1c]"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
        >
          {match.name}
        </span>
        <span className="text-[12px] font-semibold text-[#4a5b58]">{match.matchPercent}% match</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#4a5b58]">{match.description}</p>
      <div className="mt-3 text-[13px] font-semibold text-[#0e1f1c]">View vendors</div>
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
  const topVendors = vendors.slice(0, 3);
  const compareMatches = matches.filter((match) => match.peptideId !== selectedMatch.peptideId);
  const heroReason = buildHeroReason(selectedMatch);

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#0e1f1c]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e2e8e5] bg-white px-5 py-3">
        <Link href="/" className="flex items-center">
          <PeptidePilotLogo height={26} variant="dark" />
        </Link>
        <button className="text-[12px] text-[#4a5b58] underline" onClick={onRetake}>
          Retake Quiz
        </button>
      </header>

      <main className="mx-auto max-w-[1120px] px-5 pb-12 pt-6 md:px-10 md:pt-10">
        <section className="mx-auto max-w-[760px] text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4a5b58]">
            Your Top Match
          </div>
          <h1
            className="mt-3 text-[38px] italic leading-none tracking-[-0.03em] text-[#0e1f1c] md:text-[58px]"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
          >
            {selectedMatch.name}
          </h1>
          <p className="mx-auto mt-4 max-w-[620px] text-[15px] leading-7 text-[#4a5b58]">
            {heroReason}
          </p>
          <div className="mt-4 inline-flex items-center rounded-full bg-[#e6f7f1] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#0fb88a]">
            {selectedMatch.matchPercent}% match
          </div>
        </section>

        <section className="mt-8 md:mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2
                className="text-[24px] italic text-[#0e1f1c]"
                style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
              >
                Your Top Picks
              </h2>
              <p className="mt-1 text-sm text-[#4a5b58]">
                Start with the cleanest options for your top match.
              </p>
            </div>
            <div className="hidden text-[12px] text-[#4a5b58] md:block">
              {topVendors.length > 0 ? `Showing ${topVendors.length} option${topVendors.length === 1 ? "" : "s"}` : ""}
            </div>
          </div>

          {vendorLoading ? (
            <div className="rounded-[22px] border border-[#e2e8e5] bg-white px-5 py-10 text-sm text-[#4a5b58] shadow-sm">
              Loading vendor options…
            </div>
          ) : topVendors.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {topVendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} onClick={onVendorClick} />
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-[#e2e8e5] bg-white px-5 py-8 text-sm leading-7 text-[#4a5b58] shadow-sm">
              We’re lining up vendor options for this match now. Try another fit below if you want to keep exploring.
            </div>
          )}
        </section>

        {compareMatches.length > 0 ? (
          <section className="mx-auto mt-12 max-w-[900px] border-t border-[#e2e8e5] pt-8">
            <div className="mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4a5b58]">
                Other Peptides to Consider
              </div>
              <p className="mt-2 text-sm leading-7 text-[#4a5b58]">
                Strong alternatives if you want a different route, vendor mix, or price profile.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {compareMatches.slice(0, 3).map((match) => (
                <SecondaryMatchCard key={match.peptideId} match={match} onSelect={onSelectMatch} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mx-auto max-w-[760px] px-1 pb-2 pt-10 text-center">
          <p className="mb-5 text-[11px] leading-6 text-[#7c8b88]">
            Educational guidance only. PeptidePilot does not provide medical advice, diagnosis, or treatment. Research and prescription compounds vary by jurisdiction and clinical suitability.{" "}
            <Link href="/disclaimer" className="text-[#4a5b58] underline">
              Full disclaimer
            </Link>
          </p>
          <Button variant="outline" onClick={onRetake} className="gap-2 border-[#e2e8e5] text-[#4a5b58]">
            <RotateCcw className="h-4 w-4" />
            Retake the quiz
          </Button>
        </div>
      </main>
    </div>
  );
}
