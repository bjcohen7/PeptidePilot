import { useState } from "react";
import { Link } from "wouter";
import { matchPercentFromFitScore, shouldDisplayMatchPercent } from "@shared/matchDisplay";
import { WebviewEscapeHint } from "@/components/WebviewEscapeHint";

type ProviderDetail = {
  slug: string;
  displayName: string;
  priceFromCents: number;
  priceNote: string | null;
  included: string[];
  medsOffered: string;
  cashPayFriendly: boolean;
  shipDaysEstimate: number | null;
  affiliateUrlTemplate: string;
  promoCode: string | null;
  complianceNote: string | null;
};

type ProviderMatch = {
  slug: string;
  displayName: string;
  fitScore: number;
  whyMatch: string[];
};

export default function VerdictResults({
  providerMatches,
  providerDetails,
  publicId,
  leadId,
  emailDelivered = false,
  leadQuizData,
}: {
  providerMatches: ProviderMatch[];
  providerDetails: ProviderDetail[];
  publicId: string;
  leadId: string;
  emailDelivered?: boolean;
  leadQuizData?: {
    primaryGoal: string | null;
    budget: string | null;
    insurance: string | null;
  };
}) {
  const [altOpen, setAltOpen] = useState(false);

  const heroMatch = providerMatches[0];
  const altMatches = providerMatches.slice(1, 3);

  const heroDetail = providerDetails.find((p) => p.slug === heroMatch?.slug);
  const altDetails = altMatches
    .map((m) => providerDetails.find((p) => p.slug === m.slug))
    .filter(Boolean) as ProviderDetail[];

  const buildGoUrl = (slug: string, position: "hero" | "alt") =>
    `/go/${slug}/${publicId}?position=${position}`;

  const goalLabel = leadQuizData?.primaryGoal;
  const budgetLabel = leadQuizData?.budget;
  const insuranceLabel = leadQuizData?.insurance === "uninsured" ? "no insurance" : null;

  const personalizationPieces = [goalLabel, budgetLabel, insuranceLabel].filter(Boolean) as string[];
  const personalizationEcho = personalizationPieces.length > 0
    ? `Matched for ${personalizationPieces.join(", ").toLowerCase()}`
    : null;

  if (!heroMatch || !heroDetail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">No provider match found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-lg mx-auto px-4 pb-12">
        {/* Verdict Header */}
        <div className="pt-6 pb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-accent/10 text-accent border border-accent/20 mb-3">
            Your Match
          </div>
          <h1
            className="text-2xl font-normal text-foreground leading-tight mb-1"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            {heroMatch.displayName}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {heroMatch.whyMatch[0] ?? personalizationEcho ?? `Matched to your health profile and budget.`}
          </p>
          {emailDelivered && (
            <p className="text-xs text-muted-foreground/60 mt-3">
              Your results are saved at this link — we&apos;ve also emailed them to you.
            </p>
          )}
        </div>

        {/* Hero Provider Card */}
        <div
          className="rounded-2xl border-2 p-5 mb-6"
          style={{ borderColor: "var(--accent)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2
                className="text-xl font-normal text-foreground"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              >
                {heroDetail.displayName}
              </h2>
              {shouldDisplayMatchPercent(matchPercentFromFitScore(heroMatch.fitScore)) && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {matchPercentFromFitScore(heroMatch.fitScore)}% match
                </span>
              )}
            </div>
            <div className="text-right">
              <div
                className="text-2xl font-bold text-accent leading-none"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                ${(heroDetail.priceFromCents / 100).toFixed(0)}/mo
              </div>
              {heroDetail.priceNote && (
                <div className="text-xs text-muted-foreground mt-0.5">{heroDetail.priceNote}</div>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            From ${(heroDetail.priceFromCents / 100).toFixed(0)}/mo — medication, provider visits &amp; support included
          </p>

          <ul className="space-y-2 mb-4">
            {heroDetail.included.slice(0, 4).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-accent mt-0.5 flex-shrink-0">&#10003;</span>
                {item}
              </li>
            ))}
          </ul>

          {heroDetail.shipDaysEstimate && (
            <p className="text-xs text-muted-foreground mb-5">
              Typical ship time: {heroDetail.shipDaysEstimate} business days
            </p>
          )}

          <a
            href={buildGoUrl(heroDetail.slug, "hero")}
            className="block w-full rounded-xl font-bold text-center text-white transition-all hover:opacity-90 active:scale-[0.99]"
            style={{
              padding: "18px 24px",
              fontSize: "1.1rem",
              background: "var(--accent)",
            }}
          >
            See my plan at {heroDetail.displayName} &rarr;
          </a>
          <WebviewEscapeHint emailDelivered={emailDelivered} />
          <p className="text-xs text-muted-foreground/60 text-center mt-2">
            10-min intake &middot; provider review in 24&ndash;48h &middot; meds shipped
          </p>
          <p className="text-[11px] text-muted-foreground/70 text-center mt-1.5">
            Affiliate link &mdash; we may earn a commission at no extra cost to you. Not medical advice.
          </p>

          {heroDetail.complianceNote && (
            <p className="text-xs text-muted-foreground/50 text-center mt-3 leading-relaxed">
              {heroDetail.complianceNote}
            </p>
          )}
        </div>

        {/* Why This Match */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Why this match</h3>
          <div className="space-y-3">
            {(heroMatch.whyMatch.length > 0 ? heroMatch.whyMatch : [personalizationEcho ?? `Matched to your health profile and budget.`]).map((reason, i) => (
              <div key={i} className="flex items-start gap-3 border border-border/60 rounded-xl p-3.5">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "var(--accent)" }}
                >
                  {i + 1}
                </span>
                <p className="text-sm text-foreground leading-relaxed">{reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What Happens After You Click */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">What happens after you click</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { step: "1", title: "Online intake", desc: "10-min health questionnaire" },
              { step: "2", title: "Provider review", desc: "24–48h clinical review" },
              { step: "3", title: "Medication ships", desc: "Free delivery to your door" },
            ].map((s) => (
              <div key={s.step} className="border border-border/60 rounded-xl p-3 text-center">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white mx-auto mb-1.5"
                  style={{ background: "var(--accent)" }}
                >
                  {s.step}
                </span>
                <div className="text-xs font-semibold text-foreground">{s.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Objection Row */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {[
            {
              title: "Cost context",
              body: `Most GLP-1 plans run $300–$1,000+ without insurance. ${heroDetail.displayName} starts at $${(heroDetail.priceFromCents / 100).toFixed(0)}/mo, all-inclusive.`,
            },
            {
              title: "No insurance? No problem",
              body: `${heroDetail.displayName} is cash-pay friendly. No prior authorization or insurance needed to start.`,
            },
          ].map((card) => (
            <div key={card.title} className="border border-border/60 rounded-xl p-3">
              <div className="text-xs font-semibold text-foreground mb-1">{card.title}</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>

        {/* Alternatives */}
        {altDetails.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setAltOpen(!altOpen)}
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-medium">{altDetails.length} other strong {altDetails.length === 1 ? "fit" : "fits"}</span>
              <span className={`transition-transform ${altOpen ? "rotate-180" : ""}`}>&#9660;</span>
            </button>
            {altOpen && (
              <div className="mt-2 space-y-2">
                {altDetails.map((alt, i) => {
                  const altMatch = altMatches[i];
                  return (
                    <div
                      key={alt.slug}
                      className="rounded-xl border border-border/60 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">{alt.displayName}</span>
                        <span className="text-sm font-bold text-muted-foreground">
                          ${(alt.priceFromCents / 100).toFixed(0)}/mo
                        </span>
                      </div>
                      {altMatch?.whyMatch && altMatch.whyMatch.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                          {altMatch.whyMatch[0]}
                        </p>
                      )}
                      <a
                        href={buildGoUrl(alt.slug, "alt")}
                        className="block w-full rounded-lg text-center text-sm font-semibold text-white py-3 transition-all hover:opacity-90"
                        style={{ background: "var(--accent)" }}
                      >
                        See plan at {alt.displayName} &rarr;
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Affiliate Disclosure */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground/50 leading-relaxed">
            We earn a commission when you start treatment through our links. Not medical advice.
          </p>
          <Link href="/disclaimer" className="text-xs text-accent/60 hover:text-accent underline underline-offset-2 mt-1 inline-block">
            Medical disclaimer
          </Link>
        </div>
      </main>
    </div>
  );
}
