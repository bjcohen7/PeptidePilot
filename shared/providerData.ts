export type GLP1Provider = {
  id: "direct_meds" | "skinny_rx" | "medvi";
  name: string;
  brandName: string;
  startingPrice: number;
  priceTag: string;
  positioningTag: string;

  medications: string;
  providerModel: string;
  timeToFirstDose: string;
  labWorkRequired: "optional" | "required";
  cancelPolicy: string;
  insuranceAccepted: boolean;
  insuranceLabel: string;

  affiliateUrl: string;
  isAffiliate: true;

  category: "telehealth";
  officialUrl: string;
  logoUrl?: string;
  logoAlt?: string;
  logoMarkFallback: string;
  notes?: string;
  subDescription?: string;
};

export const GLP1_PROVIDERS: GLP1Provider[] = [
  {
    id: "direct_meds",
    name: "Direct Meds",
    brandName: "Direct Meds",
    startingPrice: 179,
    priceTag: "$179/mo",
    positioningTag: "Best · 92%",

    medications: "Compounded sema & tirz",
    providerModel: "Board-cert MD",
    timeToFirstDose: "3\u20135 days",
    labWorkRequired: "optional",
    cancelPolicy: "Anytime",
    insuranceAccepted: false,
    insuranceLabel: "Cash pay",

    // TODO(v2): make recommendedProviderId dynamic based on quiz answers
    // price_sensitivity=high → Direct Meds, has_insurance=true → SkinnyRX, want_continuity=high → Medvi
    affiliateUrl: "https://www.directmeds.com/",
    isAffiliate: true,
    category: "telehealth",
    officialUrl: "https://www.directmeds.com/",
    logoUrl: "/partner-logos/direct-meds.png",
    logoAlt: "Direct Meds",
    logoMarkFallback: "DM",
    notes: "Recommended provider for v1 — best fit for broadest user profile",
    subDescription: "Board-certified MD oversight — optional labs, ships in 3\u20135 days",
  },
  {
    id: "skinny_rx",
    name: "SkinnyRX",
    brandName: "SkinnyRX",
    startingPrice: 249,
    priceTag: "$249/mo",
    positioningTag: "w/ insurance",

    medications: "Brand + compounded",
    providerModel: "MD-led + NP",
    timeToFirstDose: "5\u201310 days",
    labWorkRequired: "required",
    cancelPolicy: "Monthly",
    insuranceAccepted: true,
    insuranceLabel: "Yes",

    affiliateUrl: "https://skinnyrx.com/",
    isAffiliate: true,
    category: "telehealth",
    officialUrl: "https://skinnyrx.com/",
    logoUrl: "/partner-logos/skinnyrx.png",
    logoAlt: "SkinnyRX",
    logoMarkFallback: "SR",
    subDescription: "Brand + compounded options, accepts insurance, MD-led team",
  },
  {
    id: "medvi",
    name: "Medvi",
    brandName: "Medvi",
    startingPrice: 299,
    priceTag: "$299/mo",
    positioningTag: "Concierge",

    medications: "Compounded only",
    providerModel: "Same MD each visit",
    timeToFirstDose: "7\u201310 days",
    labWorkRequired: "required",
    cancelPolicy: "30-day notice",
    insuranceAccepted: false,
    insuranceLabel: "Cash pay",

    affiliateUrl: "https://glp.medvi.org/",
    isAffiliate: true,
    category: "telehealth",
    officialUrl: "https://glp.medvi.org/",
    logoUrl: "/partner-logos/medvi.png",
    logoAlt: "Medvi",
    logoMarkFallback: "MV",
    subDescription: "Same clinician each visit, concierge model, 30-day cancel",
  },
];

export const providerById: Record<string, GLP1Provider> = Object.fromEntries(
  GLP1_PROVIDERS.map((p) => [p.id, p]),
);

export const ASPECT_LABELS: Record<string, string> = {
  fatloss: "Weight loss",
  appetite: "Food noise",
  metabolic: "Metabolic health",
  energy: "Energy",
  inflammation: "Inflammation",
  sleep: "Sleep",
  recovery: "Recovery",
  muscle: "Muscle tone",
  joints: "Joint health",
  gut: "Gut health",
  cognitive: "Cognitive",
  mood: "Mood",
  anxiety: "Anxiety",
  antiaging: "Anti-aging",
  longevity: "Longevity",
  skin: "Skin",
  hair: "Hair",
  collagen: "Collagen",
  libido: "Libido",
  confidence: "Confidence",
  hormone: "Hormonal balance",
  healing: "Healing",
  neuroprotection: "Neuroprotection",
  endurance: "Endurance",
  focus: "Focus",
  cardiovascular: "Cardiovascular",
  injury: "Injury recovery",
};

export function topAspectLabels(aspectScores: Record<string, number>, count = 4): string[] {
  return Object.entries(aspectScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([key]) => ASPECT_LABELS[key] ?? key)
    .filter(Boolean);
}
