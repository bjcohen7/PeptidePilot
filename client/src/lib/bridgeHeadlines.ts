// UTM-aware headline map for the /match bridge page. Tiny by design (2-3
// entries). If a creative's utm_content or utm_campaign contains one of these
// tokens (case-insensitive substring), the hero swaps to match the ad's hook so
// the curiosity is honored rather than bait-and-switched. Default otherwise.
//
// NOTE (conservative choice, see LEG-5-REPORT): "editable without deploy" would
// require moving this map to a config table/endpoint. It's a code map for now;
// changing an entry currently needs a deploy. Flagged as a follow-up.
export type BridgeHeadline = {
  token: string;
  headline: string;
  subline: string;
};

const DEFAULT: BridgeHeadline = {
  token: "default",
  headline: "The most clinically proven peptide for weight loss is a GLP-1.",
  subline:
    "Semaglutide and tirzepatide are peptides — the ones with large-scale clinical trials behind them. See which licensed provider fits your body and budget.",
};

// 2 creative-specific variants.
const VARIANTS: BridgeHeadline[] = [
  {
    token: "recovery",
    headline: "Curious about peptides? Start with the one that's actually clinically proven.",
    subline:
      "Recovery peptides get the buzz, but GLP-1s (semaglutide, tirzepatide) are the peptides with large-scale trials behind them. See which licensed provider fits you.",
  },
  {
    token: "bpc",
    headline: "Curious about peptides? Start with the one that's actually clinically proven.",
    subline:
      "BPC-157 and friends are early-stage. GLP-1s (semaglutide, tirzepatide) are the peptides with large clinical trials. See which licensed provider fits you.",
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
