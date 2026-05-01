export type ResultsVendorCategory = "research-peptides" | "telehealth";

export type ResultsVendorPresentation = {
  id: string;
  name: string;
  aliases?: string[];
  category: ResultsVendorCategory;
  officialUrl: string;
  logoUrl?: string;
  logoAlt?: string;
  logoMarkFallback: string;
  cardBadge?: string;
  cardFeatures?: string[];
  sourceStatus: "verified-public-asset" | "fallback-only" | "manual-review";
  notes?: string;
};

export const resultsVendorPresentation: ResultsVendorPresentation[] = [
  {
    id: "peptide-sciences",
    name: "Peptide Sciences",
    category: "research-peptides",
    officialUrl: "https://peptidesciencesinc.com/",
    logoMarkFallback: "PS",
    sourceStatus: "manual-review",
    notes:
      "Code still references a legacy domain. Public indexing suggests the brand is operating on a newer domain and should be business-confirmed before card launch.",
  },
  {
    id: "core-peptides",
    name: "Core Peptides",
    category: "research-peptides",
    officialUrl: "https://www.corepeptides.com",
    logoMarkFallback: "CP",
    sourceStatus: "fallback-only",
    notes: "Public site is live, but V1 should be prepared to ship with a fallback mark until a clean official logo asset is localized.",
  },
  {
    id: "hone-health",
    name: "Hone Health",
    aliases: ["Hone"],
    category: "telehealth",
    officialUrl: "https://honehealth.com",
    logoUrl: "/partner-logos/hone-health.png",
    logoAlt: "Hone Health",
    logoMarkFallback: "HH",
    cardBadge: "Doctor Guided",
    cardFeatures: ["Video Visits", "Dedicated Care Team", "Prescription Support", "Lab Review"],
    sourceStatus: "verified-public-asset",
    notes: "Verified public logo asset surfaced from the live site JSON-LD and localized into the repo.",
  },
  {
    id: "lifemd",
    name: "LifeMD",
    category: "telehealth",
    officialUrl: "https://www.lifemd.com",
    logoUrl: "/partner-logos/lifemd.svg",
    logoAlt: "LifeMD",
    logoMarkFallback: "LM",
    cardBadge: "Best Overall",
    cardFeatures: ["Video Visits", "Secure Messaging", "Prescription Support", "Lab Review"],
    sourceStatus: "verified-public-asset",
    notes: "Verified public logo asset surfaced from the live site and localized into the repo.",
  },
  {
    id: "limitless-life",
    name: "Limitless Life",
    aliases: ["Limitless Biotech", "Limitless Life Nootropics"],
    category: "research-peptides",
    officialUrl: "https://limitlesslifenootropics.com",
    logoAlt: "Limitless Life",
    logoMarkFallback: "LL",
    cardBadge: "Best Value",
    sourceStatus: "manual-review",
    notes: "Public storefront exposes a usable official logo asset, but the exact CDN path needs a clean follow-up capture before localization. Brand naming differs slightly across sources, so aliases are included for matching.",
  },
  {
    id: "paradigm-peptides",
    name: "Paradigm Peptides",
    category: "research-peptides",
    officialUrl: "https://paradigmpeptidesstore.com/",
    logoMarkFallback: "PP",
    sourceStatus: "manual-review",
    notes: "Public search results surface a storefront, but canonical domain and logo asset should be business-confirmed before launch.",
  },
  {
    id: "defy-medical",
    name: "Defy Medical",
    category: "telehealth",
    officialUrl: "https://defymedical.com",
    logoMarkFallback: "DM",
    cardBadge: "Most Support",
    cardFeatures: ["Video Visits", "Dedicated Care Team", "Secure Messaging", "Lab Review"],
    sourceStatus: "fallback-only",
    notes: "Brand is active, but logo asset sourcing is not yet clean enough for automatic inclusion.",
  },
  {
    id: "cosmic-nootropic",
    name: "Cosmic Nootropic",
    category: "research-peptides",
    officialUrl: "https://go.cosmicnootropic.com/",
    logoMarkFallback: "CN",
    sourceStatus: "manual-review",
    notes: "Public domain is reachable, but a clean official logo asset still needs manual capture.",
  },
  {
    id: "amino-asylum",
    name: "Amino Asylum",
    category: "research-peptides",
    officialUrl: "https://aminoasylum.shop",
    logoMarkFallback: "AA",
    sourceStatus: "manual-review",
    notes: "Current public URL redirects away from a stable brand destination. Manual review required before card inclusion.",
  },
  {
    id: "tonik",
    name: "Tonik",
    aliases: ["Tonik Wellness"],
    category: "telehealth",
    officialUrl: "https://www.tonikwellness.com/",
    logoMarkFallback: "TN",
    cardBadge: "Fastest Start",
    cardFeatures: ["Secure Messaging", "Prescription Support", "Ongoing Check-Ins"],
    sourceStatus: "manual-review",
    notes: "Public site and pricing pages are live. Brand should be normalized separately from tracked RevOffers destination URLs.",
  },
  {
    id: "medvi",
    name: "Medvi",
    category: "telehealth",
    officialUrl: "https://glp.medvi.org/",
    logoMarkFallback: "MV",
    cardBadge: "Best Overall",
    cardFeatures: ["Video Visits", "Dedicated Care Team", "Prescription Support", "Lab Review"],
    sourceStatus: "manual-review",
    notes: "Live GLP results-card affiliate. Logo and pricing normalization still pending.",
  },
  {
    id: "skinnyrx",
    name: "SkinnyRX",
    aliases: ["Skinny Rx"],
    category: "telehealth",
    officialUrl: "https://skinnyrx.com/",
    logoMarkFallback: "SR",
    cardBadge: "Lowest Price",
    cardFeatures: ["Prescription Support", "Secure Messaging", "Monthly Plan"],
    sourceStatus: "manual-review",
    notes: "Live GLP affiliate sourced through RevOffers. Logo and pricing normalization still pending.",
  },
  {
    id: "gala",
    name: "Gala",
    category: "telehealth",
    officialUrl: "https://galaglp1.com/",
    logoMarkFallback: "GA",
    cardBadge: "Insurance Friendly",
    cardFeatures: ["Video Visits", "Prescription Support", "Ongoing Check-Ins"],
    sourceStatus: "manual-review",
    notes: "Live GLP affiliate. Logo and pricing normalization still pending.",
  },
  {
    id: "direct-meds",
    name: "Direct Meds",
    category: "telehealth",
    officialUrl: "https://www.directmeds.com/",
    logoMarkFallback: "DM",
    cardBadge: "Fastest Start",
    cardFeatures: ["Secure Messaging", "Prescription Support", "Monthly Plan"],
    sourceStatus: "manual-review",
    notes: "Live GLP affiliate sourced through RevOffers. Logo and pricing normalization still pending.",
  },
  {
    id: "sprout",
    name: "Sprout",
    category: "telehealth",
    officialUrl: "https://www.sprouthealthgroup.com/",
    logoMarkFallback: "SP",
    cardBadge: "Most Support",
    cardFeatures: ["Dedicated Care Team", "Secure Messaging", "Ongoing Check-Ins"],
    sourceStatus: "manual-review",
    notes: "Live GLP affiliate sourced through RevOffers. Logo and pricing normalization still pending.",
  },
  {
    id: "petermd",
    name: "PeterMD",
    category: "telehealth",
    officialUrl: "https://petermd.com/",
    logoMarkFallback: "PM",
    cardBadge: "Doctor Guided",
    cardFeatures: ["Video Visits", "Prescription Support", "Lab Review"],
    sourceStatus: "manual-review",
    notes: "Live Sermorelin affiliate sourced through RevOffers. Logo and pricing normalization still pending.",
  },
  {
    id: "trulab",
    name: "Trulab",
    aliases: ["TruLab", "Trulab Peptides"],
    category: "research-peptides",
    officialUrl: "https://trulabpeptides.com/",
    logoMarkFallback: "TL",
    cardBadge: "Fast Shipping",
    cardFeatures: ["COA Available", "Fast Shipping", "Research-Use Focus"],
    sourceStatus: "manual-review",
    notes: "Live BPC-157 affiliate. Logo and pricing normalization still pending.",
  },
];

export const resultsVendorPresentationById = Object.fromEntries(
  resultsVendorPresentation.map((vendor) => [vendor.id, vendor]),
) as Record<string, ResultsVendorPresentation>;

function normalizeVendorKey(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findResultsVendorPresentation(nameOrAlias: string) {
  const needle = normalizeVendorKey(nameOrAlias);

  return (
    resultsVendorPresentation.find((vendor) => {
      if (normalizeVendorKey(vendor.name) === needle) return true;
      return (vendor.aliases ?? []).some((alias) => normalizeVendorKey(alias) === needle);
    }) ?? null
  );
}
