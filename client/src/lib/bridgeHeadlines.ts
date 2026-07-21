// UTM-aware headline map for the /match bridge page. Tiny by design (2-3
// entries). If a creative's utm_content or utm_campaign contains one of these
// tokens (case-insensitive substring), the hero swaps to match the ad's hook so
// the curiosity is honored rather than bait-and-switched. Default otherwise.
//
// COMPLIANCE: /match is an ad-adjacent bridge — hero/subline are PROVIDER-ANONYMOUS
// and DRUG-CLASS-FREE (eligibility framing, the /start standard). No drug/class names
// in any variant. NOTE: a code map for now; changing an entry needs a deploy.
export type BridgeHeadline = {
  token: string;
  headline: string;
  subline: string;
};

const DEFAULT: BridgeHeadline = {
  token: "default",
  headline: "Find your match for medically-supervised weight management.",
  subline:
    "A few quick questions — reviewed by licensed US clinicians — to see which program fits your goals and budget. No insurance needed.",
};

// Creative-specific variants (drug-class-free; reframed to eligibility hooks).
const VARIANTS: BridgeHeadline[] = [
  {
    token: "recovery",
    headline: "Curious where to start? Check your eligibility first.",
    subline:
      "A quick, clinician-reviewed check to see which medically-supervised weight-management program fits you — goals, budget, and state. No insurance needed.",
  },
  {
    token: "bpc",
    headline: "Curious where to start? Check your eligibility first.",
    subline:
      "A quick, clinician-reviewed check to see which medically-supervised weight-management program fits you — goals, budget, and state. No insurance needed.",
  },
];

/** Resolve the hero for the given utm_content / utm_campaign values. */
export function resolveBridgeHeadline(
  utmContent?: string | null,
  utmCampaign?: string | null,
): BridgeHeadline {
  const hay = `${utmContent ?? ""} ${utmCampaign ?? ""}`.toLowerCase();
  for (const v of VARIANTS) {
    if (hay.includes(v.token)) return v;
  }
  return DEFAULT;
}

export const DEFAULT_BRIDGE_HEADLINE = DEFAULT;
