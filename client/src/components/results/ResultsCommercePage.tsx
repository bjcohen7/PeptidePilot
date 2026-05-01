import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ExternalLink, RotateCcw } from "lucide-react";
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
  focusOptions: string[];
  activeFocus: string;
  onFocusChange: (focus: string) => void;
  vendorFilter: ResultsVendorCategoryFilter;
  onVendorFilterChange: (filter: ResultsVendorCategoryFilter) => void;
  vendors: ResultsVendorCard[];
  leadId: string;
  isReturningUser: boolean;
  onRetake: () => void;
  onSelectMatch: (peptideId: string) => void;
  onVendorClick: (vendor: ResultsVendorCard) => void;
  vendorLoading?: boolean;
};

const vendorGradients = [
  "linear-gradient(135deg, #ff8a65 0%, #f06292 50%, #ba68c8 100%)",
  "linear-gradient(135deg, #4fc3f7 0%, #7e57c2 60%, #ec407a 100%)",
  "linear-gradient(135deg, #ffb74d 0%, #ff7043 50%, #ec407a 100%)",
];

const stackGradients = [
  "linear-gradient(135deg, #66bb6a 0%, #26a69a 60%, #5e35b1 100%)",
  "linear-gradient(135deg, #fdd835 0%, #fb8c00 50%, #d81b60 100%)",
];

function prettyFocusLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
  const [broken, setBroken] = useState(false);

  if (logoUrl && !broken) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[12px] bg-white p-2 shadow-[inset_0_0_0_1px_rgba(14,31,28,0.05)]">
        <img
          src={logoUrl}
          alt={logoAlt ?? fallback}
          onError={() => setBroken(true)}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-[12px] bg-white text-[15px] font-bold tracking-tight text-[#0e1f1c] shadow-[inset_0_0_0_1px_rgba(14,31,28,0.05)]">
      <span>{fallback}</span>
    </div>
  );
}

function VendorCard({
  vendor,
  index,
  onClick,
}: {
  vendor: ResultsVendorCard;
  index: number;
  onClick: (vendor: ResultsVendorCard) => void;
}) {
  const gradient = vendorGradients[index % vendorGradients.length];

  return (
    <article
      className="min-w-[88%] max-w-[380px] snap-center overflow-hidden rounded-[22px] bg-[#0e1f1c] text-white shadow-[0_1px_2px_rgba(14,31,28,0.04),0_12px_28px_rgba(14,31,28,0.10)] md:min-w-[380px] xl:min-w-[420px]"
      data-vendor-card
    >
      <div style={{ background: gradient }} className="flex items-start justify-between gap-4 px-[18px] pb-[8px] pt-[14px] md:px-5 md:pb-[10px] md:pt-[18px]">
        <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-white/12 text-[17px] font-bold tracking-tight text-white backdrop-blur-md">
          <VendorLogo logoUrl={vendor.logoUrl} logoAlt={vendor.logoAlt} fallback={vendor.logoMarkFallback} />
        </div>
        <div className="text-right">
          <div className="text-[28px] font-extrabold leading-none tracking-[-0.02em] md:text-[34px]">
            {vendor.headlineValue}
          </div>
          <div className="mt-1 text-[12px] text-white/80">{vendor.headlineUnit}</div>
          {vendor.promoText ? (
            <div className="mt-2 inline-flex rounded-full bg-white/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-white/95">
              {vendor.promoText}
            </div>
          ) : null}
          {vendor.couponCode ? (
            <div className="mt-2 inline-flex rounded-full border border-white/25 bg-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-white/95">
              Code {vendor.couponCode}
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ background: gradient }} className="flex items-end justify-between gap-3 px-[18px] pb-4 pt-1 md:px-5">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="text-[18px] font-bold md:text-[19px]">{vendor.name}</div>
          {vendor.badge ? (
            <span className="inline-flex self-start rounded-full bg-white/20 px-[10px] py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white backdrop-blur-md">
              {vendor.badge}
            </span>
          ) : null}
        </div>

        <a
          href={vendor.learnMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="whitespace-nowrap text-[13px] text-white/90 hover:underline"
        >
          Learn more →
        </a>
      </div>

      <div className="flex flex-col gap-3 px-[18px] pb-3 pt-3 md:px-5 md:pb-5 md:pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[14px] font-semibold text-[#0fb88a]">{vendor.planName}</div>
            <div className="mt-1 text-[12px] text-white/65">{vendor.planDetail}</div>
          </div>
          <div className="whitespace-nowrap text-right text-[12px] text-white/70">{vendor.supplyTag}</div>
        </div>

        {vendor.features.length > 0 ? (
          <div className="border-t border-white/10 pt-3">
            <div className="mb-2 hidden items-center justify-between md:flex">
              <span className="text-[13px] font-semibold">Vendor Features</span>
              <span className="rounded-full bg-[#0fb88a]/20 px-2 py-1 text-[11px] font-semibold text-[#0fb88a]">
                {vendor.features.length} signals
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {vendor.features.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-white/10 bg-white/10 px-[9px] py-[3px] text-[11px] text-white/90"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-white/10 px-[18px] pb-[14px] pt-3 md:px-5 md:pb-[18px]">
        <span className="text-[12px] text-white/70">
          {vendor.category === "telehealth" ? "Telehealth partner" : "Research peptide vendor"}
        </span>
        <a
          href={vendor.affiliateUrl}
          onClick={() => onClick(vendor)}
          className="inline-flex items-center gap-1 rounded-full bg-white px-[18px] py-[11px] text-[14px] font-semibold text-[#0e1f1c] transition hover:opacity-90"
        >
          Get Started <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

function CompareCard({
  match,
  index,
  onSelect,
}: {
  match: ReturningMatchSummary;
  index: number;
  onSelect: (peptideId: string) => void;
}) {
  const gradient = stackGradients[index % stackGradients.length];
  const eyebrow = prettyFocusLabel(match.categories[0] ?? "Alternative fit");

  return (
    <article className="min-w-[78%] max-w-[320px] snap-center overflow-hidden rounded-[22px] bg-[#0e1f1c] text-white shadow-[0_1px_2px_rgba(14,31,28,0.04),0_12px_28px_rgba(14,31,28,0.10)] md:min-w-[320px]">
      <div style={{ background: gradient }} className="flex min-h-[90px] items-start justify-between gap-4 px-4 py-4">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/85">{eyebrow}</div>
          <div className="text-[22px] font-bold leading-tight">{match.name}</div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-extrabold leading-none">{match.matchPercent}%</div>
          <div className="mt-1 text-[11px] text-white/85">fit</div>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4 pt-3">
        <p className="text-[13px] leading-6 text-white/85">{match.description}</p>
        <div className="flex flex-wrap gap-2">
          {match.categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className="rounded-full border border-white/10 bg-white/10 px-2 py-[3px] text-[10.5px] text-white/85"
            >
              {prettyFocusLabel(category)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 pb-4 pt-3">
        <span className="text-[11px] text-white/55">Alternative match</span>
        <button
          onClick={() => onSelect(match.peptideId)}
          className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#0e1f1c] transition hover:opacity-90"
        >
          View vendors →
        </button>
      </div>
    </article>
  );
}

export default function ResultsCommercePage({
  matches,
  selectedMatch,
  focusOptions,
  activeFocus,
  onFocusChange,
  vendorFilter,
  onVendorFilterChange,
  vendors,
  leadId,
  isReturningUser,
  onRetake,
  onSelectMatch,
  onVendorClick,
  vendorLoading = false,
}: ResultsCommercePageProps) {
  const [currentVendorIdx, setCurrentVendorIdx] = useState(0);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const vendorSectionRef = useRef<HTMLElement | null>(null);

  const filteredVendors = useMemo(() => {
    if (vendorFilter === "all") return vendors;
    return vendors.filter((vendor) => vendor.category === vendorFilter);
  }, [vendorFilter, vendors]);

  const compareMatches = useMemo(
    () => matches.filter((match) => match.peptideId !== selectedMatch.peptideId),
    [matches, selectedMatch.peptideId],
  );

  useEffect(() => {
    setCurrentVendorIdx(0);
  }, [selectedMatch.peptideId, vendorFilter]);

  useEffect(() => {
    const root = carouselRef.current;
    if (!root) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-vendor-card]"));
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio >= 0.7) {
            const idx = cards.indexOf(entry.target as HTMLElement);
            if (idx >= 0) setCurrentVendorIdx(idx);
          }
        });
      },
      { root, threshold: [0.7] },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [filteredVendors]);

  const headlineMeta = selectedMatch.categories.slice(0, 3).map(prettyFocusLabel);

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-[#0e1f1c]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e2e8e5] bg-white px-5 py-3">
        <Link href="/" className="flex items-center">
          <PeptidePilotLogo height={26} variant="dark" />
        </Link>
        <div className="hidden text-[12px] text-[#4a5b58] sm:inline-flex sm:items-center sm:gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0fb88a]" />
          {isReturningUser ? "Saved profile" : "Quiz complete"}
        </div>
        <button className="text-[12px] text-[#4a5b58] underline" onClick={onRetake}>
          Retake
        </button>
      </header>

      <section className="mx-auto max-w-[760px] px-5 pb-2 pt-4 md:px-10 md:pt-6">
        <div className="mb-2 hidden flex-wrap gap-1 text-[13px] md:flex">
          <span className="font-medium text-[#0fb88a]">Top match</span>
          {headlineMeta.length > 0 ? <span className="text-[#7c8b88]">·</span> : null}
          {headlineMeta.map((item, index) => (
            <span key={item} className={index === 0 ? "font-medium text-[#0fb88a]" : "text-[#7c8b88]"}>
              {item}
            </span>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.06em] text-[#7c8b88]">
            Focus
          </span>
          {focusOptions.map((focus) => (
            <button
              key={focus}
              onClick={() => onFocusChange(focus)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-[12px] font-medium ${
                activeFocus === focus
                  ? "border-[#0e1f1c] bg-[#0e1f1c] text-white"
                  : "border-[#e2e8e5] bg-transparent text-[#0e1f1c]"
              }`}
            >
              {prettyFocusLabel(focus)}
            </button>
          ))}
        </div>

        <div className="mb-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1
              className="m-0 text-[28px] italic leading-none tracking-[-0.02em] md:text-[50px]"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
            >
              {selectedMatch.name}
            </h1>
            <span className="inline-flex items-center rounded-full bg-[#e6f7f1] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#0fb88a]">
              {selectedMatch.matchPercent}% match
            </span>
          </div>
          <div className="hidden flex-wrap items-baseline gap-2 text-[13px] text-[#4a5b58] md:flex">
            <span className="text-[22px] font-extrabold tracking-[-0.02em] text-[#0e1f1c]">
              {filteredVendors.length}
            </span>
            <span>{filteredVendors.length === 1 ? "partner option" : "partner options"}</span>
            <span className="px-1 text-[#7c8b88]">·</span>
            <span>Fully ungated</span>
            <span className="px-1 text-[#7c8b88]">·</span>
            <span>Immediate access</span>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[760px] items-center gap-2 overflow-x-auto px-5 pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-10">
        {(["all", "research-peptides", "telehealth"] as ResultsVendorCategoryFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => onVendorFilterChange(filter)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold ${
              vendorFilter === filter
                ? "bg-[#0e1f1c] text-white"
                : "border border-[#e2e8e5] bg-transparent text-[#0e1f1c]"
            }`}
          >
            {filter === "all" ? "All vendors" : filter === "research-peptides" ? "Research" : "Telehealth"}
          </button>
        ))}
        <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-[#e2e8e5] bg-white px-3 py-2 text-[13px] text-[#0e1f1c]">
          {filteredVendors.length} showing
        </div>
      </div>

      <section ref={vendorSectionRef} className="pb-2">
        <div className="mb-2 flex items-center justify-between px-5 md:mx-auto md:max-w-[760px] md:px-10">
          <h2
            className="hidden text-[22px] italic md:block"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
          >
            Your Top Picks
          </h2>
          <span className="text-[12px] text-[#4a5b58]">
            {filteredVendors.length ? `${Math.min(currentVendorIdx + 1, filteredVendors.length)} of ${filteredVendors.length}` : "No matches"}
          </span>
        </div>

        {filteredVendors.length > 1 ? (
          <div className="mb-3 flex justify-center gap-1.5">
            {filteredVendors.map((vendor, index) => (
              <button
                key={vendor.id}
                aria-label={`Vendor ${index + 1}`}
                onClick={() => {
                  const card = carouselRef.current?.querySelectorAll<HTMLElement>("[data-vendor-card]")[index];
                  card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentVendorIdx ? "w-[22px] bg-[#0e1f1c]" : "w-1.5 bg-[#e2e8e5]"
                }`}
              />
            ))}
          </div>
        ) : null}

        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-[14px] overflow-x-auto px-5 pb-5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:max-w-[1080px] md:px-10"
        >
          {vendorLoading ? (
            <div className="rounded-[22px] bg-white px-5 py-10 text-sm text-[#4a5b58] shadow-sm">
              Loading vendor options…
            </div>
          ) : filteredVendors.length > 0 ? (
            filteredVendors.map((vendor, index) => (
              <VendorCard key={vendor.id} vendor={vendor} index={index} onClick={onVendorClick} />
            ))
          ) : (
            <div className="max-w-[520px] rounded-[22px] border border-[#e2e8e5] bg-white px-5 py-8 text-sm leading-7 text-[#4a5b58] shadow-sm">
              We don’t have a live partner card for this filter yet. Switch back to <strong>All vendors</strong> or choose another match to keep exploring.
            </div>
          )}
        </div>

        {matches.length > 1 ? (
          <button
            onClick={() => setShowAllMatches((current) => !current)}
            className="mx-5 block w-[calc(100%-40px)] rounded-full border border-[#e2e8e5] px-4 py-3 text-center text-[14px] font-semibold text-[#0e1f1c] transition hover:bg-white md:mx-auto md:max-w-[760px]"
          >
            {showAllMatches ? "Hide other match options" : `See all ${matches.length} match options →`}
          </button>
        ) : null}
      </section>

      {showAllMatches && compareMatches.length > 0 ? (
        <section className="mx-auto mt-4 max-w-[760px] px-5 md:px-10">
          <div className="rounded-[22px] border border-[#e2e8e5] bg-white p-5 shadow-sm">
            <h3
              className="mb-2 text-[24px] italic"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
            >
              Compare your other strong fits
            </h3>
            <p className="mb-4 text-sm leading-7 text-[#4a5b58]">
              Your top match is still the strongest overall fit, but these alternatives may deserve a closer look depending on budget, vendor preference, or whether you want a different route into the same goal.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {compareMatches.map((match) => (
                <button
                  key={match.peptideId}
                  onClick={() => {
                    onSelectMatch(match.peptideId);
                    setShowAllMatches(false);
                    vendorSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-2xl border border-[#e2e8e5] bg-[#f6f8f7] p-4 text-left transition hover:border-[#0fb88a]/40 hover:bg-white"
                >
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span
                      className="text-[22px] italic text-[#0e1f1c]"
                      style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
                    >
                      {match.name}
                    </span>
                    <span className="text-sm font-semibold text-[#0fb88a]">{match.matchPercent}%</span>
                  </div>
                  <p className="mb-3 text-sm leading-6 text-[#4a5b58]">{match.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {match.categories.slice(0, 3).map((category) => (
                      <span
                        key={category}
                        className="rounded-full border border-[#e2e8e5] bg-white px-2 py-1 text-[11px] text-[#4a5b58]"
                      >
                        {prettyFocusLabel(category)}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {compareMatches.length > 0 ? (
        <section className="mt-6 border-t-[8px] border-[#e2e8e5] pt-5">
          <div className="mx-auto max-w-[760px] px-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4a5b58] md:px-10">
            Also worth exploring
          </div>
          <div className="mx-auto mb-3 mt-1 flex max-w-[760px] items-baseline justify-between px-5 md:px-10">
            <h2
              className="text-[20px] italic"
              style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontWeight: 700 }}
            >
              Compare other strong fits
            </h2>
            <span className="text-[12px] text-[#4a5b58]">{compareMatches.length} options</span>
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-5 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:max-w-[1080px] md:px-10">
            {compareMatches.slice(0, 3).map((match, index) => (
              <CompareCard key={match.peptideId} match={match} index={index} onSelect={(peptideId) => {
                onSelectMatch(peptideId);
                vendorSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-[760px] px-5 pb-10 pt-2 text-center md:px-10">
        <p className="mb-5 text-[11px] leading-6 text-[#7c8b88]">
          Educational guidance only. PeptidePilot does not provide medical advice, diagnosis, or treatment. Research and prescription compounds vary by jurisdiction and clinical suitability.
          {" "}
          <Link href="/disclaimer" className="text-[#4a5b58] underline">
            Full disclaimer
          </Link>
        </p>
        <Button variant="outline" onClick={onRetake} className="gap-2 border-[#e2e8e5] text-[#4a5b58]">
          <RotateCcw className="h-4 w-4" />
          Retake the quiz
        </Button>
        {!leadId ? (
          <p className="mt-4 text-xs text-[#7c8b88]">
            You can explore everything immediately. Save/share flows can be layered in later without slowing this page down.
          </p>
        ) : null}
      </div>
    </div>
  );
}
