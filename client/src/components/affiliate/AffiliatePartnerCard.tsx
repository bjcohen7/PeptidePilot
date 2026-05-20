import { ArrowRight, Check } from "lucide-react";
import { CouponCopyButton } from "./CouponCopyButton";
import type { AffiliatePartnerCardData } from "./affiliate.types";

type Props = {
  variant: "featured" | "secondary";
  data: AffiliatePartnerCardData;
  onCtaClick: (partnerName: string, url: string) => void;
};

export function AffiliatePartnerCard({ variant, data, onCtaClick }: Props) {
  return variant === "featured" ? (
    <FeaturedCard data={data} onCtaClick={onCtaClick} />
  ) : (
    <SecondaryCard data={data} onCtaClick={onCtaClick} />
  );
}

/* =====================================================================
   FEATURED VARIANT (dark)
   ===================================================================== */

function FeaturedCard({
  data,
  onCtaClick,
}: {
  data: AffiliatePartnerCardData;
  onCtaClick: Props["onCtaClick"];
}) {
  const hasCoupon = Boolean(data.couponCode && data.couponLabel);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-[rgba(94,234,212,0.12)] bg-[#0a1815] p-5 sm:p-6 flex flex-col text-[rgba(230,247,241,0.92)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(94,234,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(94,234,212,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-2 flex-wrap mb-3.5">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-gradient-to-br from-[#0fb88a] to-[#22d3ee] text-[#0e1f1c]">
            RECOMMENDED
          </span>
          {data.differentiatorBadge && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-[rgba(94,234,212,0.14)] text-[#5eead4]">
              {data.differentiatorBadge}
            </span>
          )}
        </div>
        {data.headline && (
          <h3
            className={`font-serif italic font-medium leading-tight text-[#5eead4] text-[20px] ${hasCoupon ? "mb-3.5" : "mb-3"}`}
          >
            {data.headline}
          </h3>
        )}
        <div className={`flex items-center gap-2 ${hasCoupon ? "mb-3.5" : "mb-3"}`}>
          <Monogram letters={data.monogram} tone="dark" />
          <span className="text-sm font-semibold text-white/96">
            {data.partnerName}
          </span>
        </div>
        {hasCoupon && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-3.5 rounded-lg bg-[rgba(94,234,212,0.05)] border border-dashed border-[rgba(94,234,212,0.35)]">
            <span
              aria-label="Coupon code"
              className="font-mono font-semibold text-xs tracking-wider px-1.5 py-0.5 bg-[rgba(94,234,212,0.16)] text-[#5eead4] rounded"
            >
              {data.couponCode}
            </span>
            <span className="text-[12.5px] flex-1 text-[rgba(230,247,241,0.85)]">
              {data.couponLabel}
            </span>
            <CouponCopyButton
              code={data.couponCode!}
              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[rgba(94,234,212,0.16)] text-[#5eead4] hover:bg-[rgba(94,234,212,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eead4] motion-safe:transition-colors"
            />
          </div>
        )}
        {data.trustSignals && data.trustSignals.length > 0 && (
          hasCoupon ? (
            <div className="flex flex-wrap gap-x-3.5 gap-y-2 mb-4">
              {data.trustSignals.map((signal) => (
                <TrustItem key={signal} signal={signal} tone="dark" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 mb-4 pt-2.5 border-t border-[rgba(94,234,212,0.14)]">
              {data.trustSignals.map((signal) => (
                <TrustItem key={signal} signal={signal} tone="dark" size="lg" />
              ))}
            </div>
          )
        )}
        <a
          href={data.url}
          target="_blank"
          rel="noopener sponsored"
          onClick={() => onCtaClick(data.partnerName, data.url)}
          className="mt-auto flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-full bg-gradient-to-br from-[#0fb88a] to-[#22d3ee] text-[#0e1f1c] font-semibold text-sm shadow-[0_14px_30px_rgba(15,184,138,0.45)] motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0fb88a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1815]"
        >
          {data.ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </article>
  );
}

/* =====================================================================
   SECONDARY VARIANT (light)
   ===================================================================== */

function SecondaryCard({
  data,
  onCtaClick,
}: {
  data: AffiliatePartnerCardData;
  onCtaClick: Props["onCtaClick"];
}) {
  const hasCoupon = Boolean(data.couponCode && data.couponLabel);

  return (
    <article className="relative overflow-hidden rounded-2xl bg-[#e6ede9] border border-[#d8e0db] p-5 sm:p-6 flex flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(10,107,84,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(10,107,84,0.045) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-2 flex-wrap mb-3.5">
          {data.differentiatorBadge ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-[#d4e3d9] text-[#0a6b54]">
              {data.differentiatorBadge}
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-transparent text-[#0a6b54] border border-[#cfe7df]">
              Alternative
            </span>
          )}
        </div>
        {data.headline && (
          <h3
            className={`font-serif italic font-medium leading-tight text-[#0a6b54] text-[20px] ${hasCoupon ? "mb-3.5" : "mb-3"}`}
          >
            {data.headline}
          </h3>
        )}
        <div className={`flex items-center gap-2 ${hasCoupon ? "mb-3.5" : "mb-3"}`}>
          <Monogram letters={data.monogram} tone="light" />
          <span className="text-sm font-semibold text-[#0e1f1c]">
            {data.partnerName}
          </span>
        </div>
        {hasCoupon && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-3.5 rounded-lg bg-white/55 border border-dashed border-[rgba(10,107,84,0.3)]">
            <span
              aria-label="Coupon code"
              className="font-mono font-semibold text-xs tracking-wider px-1.5 py-0.5 bg-white text-[#0a6b54] border border-[#cfe7df] rounded"
            >
              {data.couponCode}
            </span>
            <span className="text-[12.5px] flex-1 text-[#4a5b58]">
              {data.couponLabel}
            </span>
            <CouponCopyButton
              code={data.couponCode!}
              className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white border border-[#cfe7df] text-[#0a6b54] hover:bg-[#f4f8f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a6b54] motion-safe:transition-colors"
            />
          </div>
        )}
        {data.trustSignals && data.trustSignals.length > 0 && (
          hasCoupon ? (
            <div className="flex flex-wrap gap-x-3.5 gap-y-2 mb-4">
              {data.trustSignals.map((signal) => (
                <TrustItem key={signal} signal={signal} tone="light" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 mb-4 pt-2.5 border-t border-[rgba(10,107,84,0.12)]">
              {data.trustSignals.map((signal) => (
                <TrustItem key={signal} signal={signal} tone="light" size="lg" />
              ))}
            </div>
          )
        )}
        <a
          href={data.url}
          target="_blank"
          rel="noopener sponsored"
          onClick={() => onCtaClick(data.partnerName, data.url)}
          className="mt-auto flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-transparent border border-[1.5px] border-[#0a6b54] text-[#0a6b54] font-semibold text-sm hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a6b54] focus-visible:ring-offset-2 focus-visible:ring-offset-[#e6ede9]"
        >
          {data.ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </article>
  );
}

/* =====================================================================
   SHARED SUB-COMPONENTS
   ===================================================================== */

function Monogram({ letters, tone }: { letters: string; tone: "dark" | "light" }) {
  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 w-[30px] h-[30px] rounded-md bg-white font-bold text-[11px] tracking-wide ${tone === "dark" ? "text-[#0e1f1c]" : "text-[#0a6b54]"}`}
    >
      {letters}
    </div>
  );
}

function TrustItem({
  signal,
  tone,
  size = "sm",
}: {
  signal: string;
  tone: "dark" | "light";
  size?: "sm" | "lg";
}) {
  const textCls = size === "lg" ? "text-[12.5px] leading-snug" : "text-[11.5px]";
  const itemCls = tone === "dark" ? "text-[rgba(230,247,241,0.72)]" : "text-[#4a5b58]";
  const checkBgCls = tone === "dark"
    ? "bg-[rgba(94,234,212,0.18)] text-[#5eead4]"
    : "bg-white text-[#0a6b54]";

  return (
    <span className={`inline-flex items-center gap-1.5 ${textCls} ${itemCls}`}>
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center w-[13px] h-[13px] rounded-full ${checkBgCls}`}
      >
        <Check className="w-2 h-2" strokeWidth={3.5} />
      </span>
      {signal}
    </span>
  );
}
