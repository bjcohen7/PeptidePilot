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
  defaultOffer?: {
    headlineValue: string;
    headlineUnit: string;
    promoText?: string;
  };
  offersByPeptideId?: Record<
    string,
    {
      headlineValue: string;
      headlineUnit: string;
      promoText?: string;
    }
  >;
  differentiatorBadge?: string;
  headline?: string;
  promo?: string;
  couponCode?: string;
  couponLabel?: string;
  trustSignals?: string[];
  ctaLabel?: string;
  secondaryHeadline?: string;
  secondaryCtaLabel?: string;
  sourceStatus: "verified-public-asset" | "fallback-only" | "manual-review" | "official-site";
  notes?: string;
};

export const resultsVendorPresentation: ResultsVendorPresentation[] = [
  {
    id: "peptide-sciences",
    name: "Peptide Sciences",
    aliases: ["Peptide Sciences Inc"],
    category: "research-peptides",
    officialUrl: "https://peptidesciencesinc.com/",
    logoMarkFallback: "PS",
    cardBadge: "Lab Tested",
    cardFeatures: ["Third-Party Tested", "US Based", "Extensive Catalog", "Fast Shipping"],
    differentiatorBadge: "Lab Tested",
    headline: "America's most trusted research peptide source",
    promo:
      "Peptide Sciences offers one of the industry's largest catalogs of research-grade peptides, each batch third-party tested with COAs available for your peace of mind.",
    trustSignals: ["Third-Party Tested", "US Based", "Extensive Catalog", "Fast Shipping"],
    secondaryHeadline: "Trusted research peptides",
    secondaryCtaLabel: "Shop Now",
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
    cardBadge: "COA Backed",
    cardFeatures: ["COA Available", "Research-Grade", "Quality Focused"],
    differentiatorBadge: "COA Backed",
    headline: "Quality-driven research peptides",
    promo:
      "Core Peptides provides research-grade compounds backed by certificate-of-analysis quality assurance at competitive prices.",
    trustSignals: ["COA Available", "Research-Grade", "Quality Focused"],
    secondaryHeadline: "Research-grade core peptides",
    secondaryCtaLabel: "Shop Now",
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
    defaultOffer: {
      headlineValue: "Provider",
      headlineUnit: "pricing varies",
    },
    differentiatorBadge: "Doctor Guided",
    headline: "Expert-led care from home",
    promo: "Connect with a licensed provider who can assess your needs and prescribe peptide therapies tailored to your goals.",
    trustSignals: ["Video Visits", "Dedicated Care Team", "Prescription Support", "Lab Review"],
    secondaryHeadline: "Expert-led telehealth care",
    secondaryCtaLabel: "View Provider",
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
    cardBadge: "All-Inclusive",
    cardFeatures: ["Video Visits", "Secure Messaging", "Prescription Support", "Lab Review"],
    defaultOffer: {
      headlineValue: "Provider",
      headlineUnit: "pricing varies",
    },
    differentiatorBadge: "All-Inclusive",
    headline: "All-inclusive care starts here",
    promo: "Get access to comprehensive telehealth services with medication management included in your membership.",
    trustSignals: ["Video Visits", "Secure Messaging", "Prescription Support", "Lab Review"],
    secondaryHeadline: "All-inclusive telehealth",
    secondaryCtaLabel: "Explore Plan",
    sourceStatus: "verified-public-asset",
    notes: "Verified public logo asset surfaced from the live site and localized into the repo.",
  },
  {
    id: "limitless-life",
    name: "Limitless Life",
    aliases: ["Limitless Biotech", "Limitless Life Nootropics"],
    category: "research-peptides",
    officialUrl: "https://limitlesslifenootropics.com",
    logoUrl: "/partner-logos/limitless.png",
    logoAlt: "Limitless Life",
    logoMarkFallback: "LL",
    cardBadge: "10% Off",
    offersByPeptideId: {
      sermorelin: {
        headlineValue: "$47.99",
        headlineUnit: "5mg vial",
        promoText: "10% off first order",
      },
    },
    differentiatorBadge: "10% Off",
    headline: "Research-grade peptides delivered",
    promo: "Shop a curated selection of research peptides with fast shipping and frequent savings on multi-vial orders.",
    couponCode: "PILOT10",
    couponLabel: "Use code PILOT10 at checkout",
    trustSignals: ["Research-use catalog", "Direct checkout", "Independent vendor"],
    secondaryHeadline: "Research-grade peptides",
    secondaryCtaLabel: "Shop Now",
    sourceStatus: "manual-review",
    notes: "Public storefront exposes a usable official logo asset, but the exact CDN path needs a clean follow-up capture before localization. Brand naming differs slightly across sources, so aliases are included for matching.",
  },
  {
    id: "paradigm-peptides",
    name: "Paradigm Peptides",
    category: "research-peptides",
    officialUrl: "https://paradigmpeptidesstore.com/",
    logoMarkFallback: "PP",
    cardBadge: "Value Pricing",
    cardFeatures: ["Value Pricing", "Research Compounds", "Reliable Service"],
    differentiatorBadge: "Value Pricing",
    headline: "Research peptides at competitive prices",
    promo:
      "Paradigm Peptides offers a curated selection of research compounds with competitive pricing and reliable service you can count on.",
    trustSignals: ["Value Pricing", "Research Compounds", "Reliable Service"],
    secondaryHeadline: "Competitively priced research peptides",
    secondaryCtaLabel: "Shop Now",
    sourceStatus: "manual-review",
    notes: "Public search results surface a storefront, but canonical domain and logo asset should be business-confirmed before launch.",
  },
  {
    id: "defy-medical",
    name: "Defy Medical",
    category: "telehealth",
    officialUrl: "https://defymedical.com",
    logoUrl: "/partner-logos/defy-medical.png",
    logoAlt: "Defy Medical",
    logoMarkFallback: "DM",
    cardBadge: "Care Team",
    cardFeatures: ["Video Visits", "Dedicated Care Team", "Secure Messaging", "Lab Review"],
    differentiatorBadge: "Care Team",
    headline: "Dedicated care, your terms",
    promo: "Work with a dedicated care team that provides personalized guidance and ongoing support for your peptide therapy journey.",
    trustSignals: ["Video Visits", "Dedicated Care Team", "Secure Messaging", "Lab Review"],
    secondaryHeadline: "Dedicated care team",
    secondaryCtaLabel: "Learn More",
    sourceStatus: "official-site",
    notes: "Logo sourced from Defy Medical's public site and localized for results cards.",
  },
  {
    id: "cosmic-nootropic",
    name: "Cosmic Nootropic",
    category: "research-peptides",
    officialUrl: "https://go.cosmicnootropic.com/",
    logoMarkFallback: "CN",
    cardBadge: "Nootropic Focus",
    cardFeatures: ["Nootropic Specialists", "Biohacker Trusted", "Research Compounds"],
    differentiatorBadge: "Nootropic Focus",
    headline: "Specialists in nootropic peptides",
    promo:
      "Cosmic Nootropic is a dedicated source for hard-to-find nootropic peptides trusted by the biohacking community for quality and reliability.",
    trustSignals: ["Nootropic Specialists", "Biohacker Trusted", "Research Compounds"],
    secondaryHeadline: "Nootropic peptide specialists",
    secondaryCtaLabel: "Shop Now",
    sourceStatus: "manual-review",
    notes: "Public domain is reachable, but a clean official logo asset still needs manual capture.",
  },
  {
    id: "dynamic-peptides",
    name: "Dynamic Peptides",
    category: "research-peptides",
    officialUrl: "",
    logoMarkFallback: "DP",
    cardBadge: "Top Pick",
    cardFeatures: ["Research-Grade", "US Based", "Fast Shipping"],
    differentiatorBadge: "Top Pick",
    headline: "Top-rated peptide source trusted by researchers",
    promo:
      "Dynamic Peptides is a leading provider of research-grade peptides with rigorous quality standards and reliable nationwide shipping.",
    trustSignals: ["Research-Grade", "US Based", "Fast Shipping"],
    secondaryHeadline: "Research peptides you can trust",
    secondaryCtaLabel: "Shop Now",
    sourceStatus: "manual-review",
    notes:
      "Partner was added through the admin panel DB. Source URL, logo asset, and business details need to be confirmed and localized for the override entry.",
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
    logoUrl: "/partner-logos/tonik.png",
    logoAlt: "Tonik",
    logoMarkFallback: "TN",
    cardBadge: "From $149",
    cardFeatures: ["Secure Messaging", "Prescription Support", "Ongoing Check-Ins"],
    offersByPeptideId: {
      sermorelin: {
        headlineValue: "As low as $149",
        headlineUnit: "per month",
      },
    },
    differentiatorBadge: "From $149",
    headline: "Affordable peptide therapy",
    promo: "Tonik Wellness offers accessible pricing on peptide therapies with secure messaging and ongoing provider check-ins.",
    trustSignals: ["Secure Messaging", "Prescription Support", "Ongoing Check-Ins"],
    secondaryHeadline: "Affordable care from $149",
    secondaryCtaLabel: "Get Started",
    sourceStatus: "manual-review",
    notes: "Public site and pricing pages are live. Brand should be normalized separately from tracked RevOffers destination URLs.",
  },
  {
    id: "medvi",
    name: "Medvi",
    category: "telehealth",
    officialUrl: "https://glp.medvi.org/",
    logoUrl: "/partner-logos/medvi.png",
    logoAlt: "Medvi",
    logoMarkFallback: "MV",
    cardBadge: "From $179",
    cardFeatures: ["Video Visits", "Dedicated Care Team", "Prescription Support", "Lab Review"],
    defaultOffer: {
      headlineValue: "From $179",
      headlineUnit: "first month",
      promoText: "Refills locked at $299",
    },
    differentiatorBadge: "From $179",
    headline: "GLP-1 care, locked-in savings",
    promo: "Start at $179 for your first month with refills locked at $299 — transparent pricing from a dedicated telehealth team.",
    trustSignals: ["Video Visits", "Dedicated Care Team", "Prescription Support", "Lab Review"],
    secondaryHeadline: "From $179 first month",
    secondaryCtaLabel: "View Offer",
    sourceStatus: "manual-review",
    notes: "Live GLP results-card affiliate. Logo and pricing normalization still pending.",
  },
  {
    id: "skinnyrx",
    name: "SkinnyRX",
    aliases: ["Skinny Rx"],
    category: "telehealth",
    officialUrl: "https://skinnyrx.com/",
    logoUrl: "/partner-logos/skinnyrx.png",
    logoAlt: "SkinnyRX",
    logoMarkFallback: "SR",
    cardBadge: "Quick Assessment",
    cardFeatures: ["Prescription Support", "Secure Messaging", "Monthly Plan"],
    defaultOffer: {
      headlineValue: "Check current",
      headlineUnit: "GLP-1 pricing",
    },
    differentiatorBadge: "Quick Assessment",
    headline: "Fast-track your GLP-1 journey",
    promo: "Complete a quick online assessment and get matched with a treatment plan tailored to your needs.",
    trustSignals: ["Prescription Support", "Secure Messaging", "Monthly Plan"],
    secondaryHeadline: "Quick assessment GLP-1 care",
    secondaryCtaLabel: "Get Started",
    sourceStatus: "manual-review",
    notes: "Live GLP affiliate sourced through RevOffers. Logo and pricing normalization still pending.",
  },
  {
    id: "gala",
    name: "Gala",
    category: "telehealth",
    officialUrl: "https://galaglp1.com/",
    logoUrl: "/partner-logos/gala.png",
    logoAlt: "Gala",
    logoMarkFallback: "GA",
    cardBadge: "No Hidden Fees",
    cardFeatures: ["Video Visits", "Prescription Support", "Ongoing Check-Ins"],
    defaultOffer: {
      headlineValue: "From $179",
      headlineUnit: "per month",
      promoText: "No hidden fees",
    },
    differentiatorBadge: "No Hidden Fees",
    headline: "Transparent GLP-1 pricing",
    promo: "Get started with Gala's straightforward pricing — no hidden fees, no surprises.",
    trustSignals: ["Video Visits", "Prescription Support", "Ongoing Check-Ins"],
    secondaryHeadline: "Transparent monthly pricing",
    secondaryCtaLabel: "View Offer",
    sourceStatus: "manual-review",
    notes: "Live GLP affiliate. Logo and pricing normalization still pending.",
  },
  {
    id: "direct-meds",
    name: "Direct Meds",
    category: "telehealth",
    officialUrl: "https://www.directmeds.com/",
    logoUrl: "/partner-logos/direct-meds.png",
    logoAlt: "Direct Meds",
    logoMarkFallback: "DM",
    cardBadge: "Current Promo",
    cardFeatures: ["Secure Messaging", "Prescription Support", "Monthly Plan"],
    defaultOffer: {
      headlineValue: "From $147",
      headlineUnit: "current promo",
      promoText: "Up to $150 off",
    },
    differentiatorBadge: "Current Promo",
    headline: "Save on your first month",
    promo: "Direct Meds makes GLP-1 therapy accessible with a simple online visit and transparent pricing starting at $147.",
    couponCode: "PILOT50",
    couponLabel: "Use code PILOT50 at checkout",
    trustSignals: ["Secure Messaging", "Prescription Support", "Monthly Plan"],
    secondaryHeadline: "From $147 per month",
    secondaryCtaLabel: "View Offer",
    sourceStatus: "manual-review",
    notes: "Live GLP affiliate sourced through RevOffers. Logo and pricing normalization still pending.",
  },
  {
    id: "sprout",
    name: "Sprout",
    category: "telehealth",
    officialUrl: "https://joinsprouthealth.com/weightloss-semaglutide/",
    logoUrl: "/partner-logos/sprout.png",
    logoAlt: "Sprout",
    logoMarkFallback: "SP",
    cardBadge: "First-Month Offer",
    cardFeatures: ["Dedicated Care Team", "Secure Messaging", "Ongoing Check-Ins"],
    defaultOffer: {
      headlineValue: "From $199",
      headlineUnit: "first month",
      promoText: "Standard $249/mo",
    },
    differentiatorBadge: "First-Month Offer",
    headline: "Start your GLP-1 journey",
    promo: "Sprout Health offers an affordable entry point with a dedicated care team to support you every step of the way.",
    trustSignals: ["Dedicated Care Team", "Secure Messaging", "Ongoing Check-Ins"],
    secondaryHeadline: "From $199 first month",
    secondaryCtaLabel: "Get Started",
    sourceStatus: "manual-review",
    notes: "Live GLP affiliate sourced through RevOffers. Logo and pricing normalization still pending.",
  },
  {
    id: "petermd",
    name: "PeterMD",
    category: "telehealth",
    officialUrl: "https://getpetermd.com/",
    logoUrl: "/partner-logos/petermd.png",
    logoAlt: "PeterMD",
    logoMarkFallback: "PM",
    cardBadge: "Doctor Guided",
    cardFeatures: ["Video Visits", "Prescription Support", "Lab Review"],
    defaultOffer: {
      headlineValue: "Provider",
      headlineUnit: "pricing varies",
    },
    differentiatorBadge: "Doctor-Led",
    headline: "Professional-grade peptide access",
    promo: "PeterMD connects you with licensed providers who can assess and prescribe peptide therapies for your specific needs.",
    trustSignals: ["Video Visits", "Prescription Support", "Lab Review"],
    secondaryHeadline: "Doctor-led peptide care",
    secondaryCtaLabel: "Learn More",
    sourceStatus: "manual-review",
    notes: "Live Sermorelin affiliate sourced through RevOffers. Canonical site updated to getpetermd.com based on public release coverage; logo still wants a cleaner source asset.",
  },
  {
    id: "trulab",
    name: "Trulab",
    aliases: ["TruLab", "Trulab Peptides"],
    category: "research-peptides",
    officialUrl: "https://trulabpeptides.com/",
    logoUrl: "/partner-logos/trulab.png",
    logoAlt: "TruLab Peptides",
    logoMarkFallback: "TL",
    cardBadge: "Fast Shipping",
    cardFeatures: ["COA Available", "Fast Shipping", "Research-Use Focus"],
    offersByPeptideId: {
      bpc157: {
        headlineValue: "$35",
        headlineUnit: "5mg vial",
        promoText: "Buy 2 save 12%",
      },
    },
    differentiatorBadge: "Fast Shipping",
    headline: "Quality peptides, fast delivery",
    promo: "Trulab offers COA-backed research peptides with fast shipping and competitive multi-vial pricing.",
    trustSignals: ["COA Available", "Fast Shipping", "Research-Use Focus"],
    secondaryHeadline: "Research peptides, fast",
    secondaryCtaLabel: "Shop Now",
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
