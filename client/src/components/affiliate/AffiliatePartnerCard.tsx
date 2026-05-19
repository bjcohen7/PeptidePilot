import { ArrowRight, Check } from "lucide-react";
import type { AffiliatePartnerCardData } from "./affiliate.types";

type Props = {
  variant: "featured" | "secondary";
  data: AffiliatePartnerCardData;
  onCtaClick: (partnerName: string, url: string) => void;
};

function Monogram({ letters, tone }: { letters: string; tone: "dark" | "light" }) {
  return (
    <div
      className={
        "inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl font-bold text-sm tracking-wide " +
        (tone === "dark"
          ? "bg-white text-[#0e1f1c]"
          : "bg-[#e6f7f1] text-[#0a6b54]")
      }
    >
      {letters}
    </div>
  );
}

function FeaturedCard({
  data,
  onCtaClick,
}: {
  data: AffiliatePartnerCardData;
  onCtaClick: Props["onCtaClick"];
}) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-[rgba(94,234,212,0.12)] bg-[#0a1815] p-5 text-[rgba(230,247,241,0.92)] sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,234,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gradient-to-br from-[#0fb88a] to-[#22d3ee] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#0e1f1c]">
            RECOMMENDED
          </span>
          {data.differentiatorBadge && (
            <span className="inline-flex items-center rounded-full bg-[rgba(94,234,212,0.14)] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#5eead4]">
              {data.differentiatorBadge}
            </span>
          )}
        </div>
        <div className="mb-3.5 flex items-center gap-3">
          <Monogram letters={data.monogram} tone="dark" />
          <h3 className="text-base font-bold leading-tight text-white">
            {data.partnerName}
          </h3>
        </div>
        {data.headline && (
          <p
            className="mb-2.5 font-serif text-[17px] font-medium italic leading-tight text-[#5eead4]"
            style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
          >
            {data.headline}
          </p>
        )}
        <p className="mb-4 flex-1 text-[13.5px] leading-relaxed text-[rgba(230,247,241,0.72)]">
          {data.promo}
        </p>
        {data.couponCode && data.couponLabel && (
          <div className="mb-4 inline-flex items-center gap-2.5 self-start rounded-lg border border-dashed border-[rgba(94,234,212,0.5)] bg-[rgba(94,234,212,0.08)] px-3 py-2 text-[12.5px] text-[rgba(230,247,241,0.92)]">
            <span
              aria-label="Coupon code"
              className="rounded bg-[rgba(94,234,212,0.16)] px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-[#5eead4]"
            >
              {data.couponCode}
            </span>
            <span>{data.couponLabel}</span>
          </div>
        )}
        <a
          href={data.url}
          target="_blank"
          rel="noopener sponsored"
          onClick={() => onCtaClick(data.partnerName, data.url)}
          className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-gradient-to-br from-[#0fb88a] to-[#22d3ee] px-6 py-3.5 text-sm font-semibold text-[#0e1f1c] shadow-[0_14px_30px_rgba(15,184,138,0.45)] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0fb88a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1815]"
        >
          {data.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </a>
        {data.trustSignals && data.trustSignals.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-[rgba(94,234,212,0.1)] pt-4">
            {data.trustSignals.map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center gap-1.5 text-[12.5px] text-[rgba(230,247,241,0.78)]"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#5eead4] text-[#0e1f1c]">
                  <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                </span>
                {signal}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function SecondaryCard({
  data,
  onCtaClick,
}: {
  data: AffiliatePartnerCardData;
  onCtaClick: Props["onCtaClick"];
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-[#e2e8e5] bg-white p-5 sm:p-6">
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {data.differentiatorBadge ? (
          <span className="inline-flex items-center rounded-full bg-[#e6f7f1] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#0a6b54]">
            {data.differentiatorBadge}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-[#cfe7df] bg-transparent px-3 py-1 text-[11px] font-semibold tracking-wide text-[#0a6b54]">
            Alternative
          </span>
        )}
      </div>
      <div className="mb-3.5 flex items-center gap-3">
        <Monogram letters={data.monogram} tone="light" />
        <h3 className="text-base font-bold leading-tight text-[#0e1f1c]">
          {data.partnerName}
        </h3>
      </div>
      {data.headline && (
        <p
          className="mb-2.5 font-serif text-[17px] font-medium italic leading-tight text-[#0a6b54]"
          style={{ fontFamily: "'Crimson Pro', Georgia, serif" }}
        >
          {data.headline}
        </p>
      )}
      <p className="mb-4 flex-1 text-[13.5px] leading-relaxed text-[#4a5b58]">
        {data.promo}
      </p>
      <a
        href={data.url}
        target="_blank"
        rel="noopener sponsored"
        onClick={() => onCtaClick(data.partnerName, data.url)}
        className="inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-[#cfe7df] bg-white px-4 py-2.5 text-sm font-semibold text-[#0a6b54] hover:bg-[#f6f8f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a6b54] focus-visible:ring-offset-2"
      >
        {data.ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </article>
  );
}

export function AffiliatePartnerCard({ variant, data, onCtaClick }: Props) {
  return variant === "featured" ? (
    <FeaturedCard data={data} onCtaClick={onCtaClick} />
  ) : (
    <SecondaryCard data={data} onCtaClick={onCtaClick} />
  );
}
