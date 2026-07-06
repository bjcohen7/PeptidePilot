export type GLP1Provider = {
  id: "gala" | "direct_med" | "sprout";
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
    id: "gala",
    name: "Gala Health",
    brandName: "Gala Health",
    startingPrice: 179,
    priceTag: "$179/mo",
    positioningTag: "Best Value",

    medications: "Compounded semaglutide",
    providerModel: "Licensed providers",
    timeToFirstDose: "3\u20135 days",
    labWorkRequired: "optional",
    cancelPolicy: "Anytime",
    insuranceAccepted: false,
    insuranceLabel: "Cash pay",

    affiliateUrl: "https://galaglp1.com/lp/glp1?a=price&_ef_transaction_id=&oid=1&affid=13",
    isAffiliate: true,
    category: "telehealth",
    officialUrl: "https://galaglp1.com/",
    logoMarkFallback: "GA",
    notes: "LegitScript Certified — $179/mo all doses, no hidden fees",
    subDescription: "Licensed providers in all 50 states — $179/mo all doses, no hidden fees",
  },
  {
    id: "direct_med",
    name: "Direct Meds",
    brandName: "Direct Meds",
    startingPrice: 199,
    priceTag: "$199/mo",
    positioningTag: "Most Trusted",

    medications: "Compounded sema & tirz",
    providerModel: "Board-cert MD",
    timeToFirstDose: "3\u20135 days",
    labWorkRequired: "optional",
    cancelPolicy: "Anytime",
    insuranceAccepted: false,
    insuranceLabel: "Cash pay",

    affiliateUrl: "https://track.revoffers.com/aff_c?offer_id=1304&aff_id=12185",
    isAffiliate: true,
    category: "telehealth",
    officialUrl: "https://www.directmeds.com/",
    logoMarkFallback: "DM",
    notes: "LegitScript Certified — use code PILOT50 at checkout",
    subDescription: "Doctor prescribed and supervised — personalized care plans",
  },
  {
    id: "sprout",
    name: "Sprout",
    brandName: "Sprout",
    startingPrice: 199,
    priceTag: "$199/mo",
    positioningTag: "No Contracts",

    medications: "Compounded semaglutide",
    providerModel: "Patient care team",
    timeToFirstDose: "3\u20137 days",
    labWorkRequired: "optional",
    cancelPolicy: "Anytime",
    insuranceAccepted: false,
    insuranceLabel: "Cash pay",

    affiliateUrl: "https://track.revoffers.com/aff_c?offer_id=1286&aff_id=12185",
    isAffiliate: true,
    category: "telehealth",
    officialUrl: "https://sprouthealth.com/",
    logoMarkFallback: "SP",
    notes: "LegitScript Certified — no contracts, no surprise fees",
    subDescription: "Prepared by state-licensed US pharmacies — fast shipping",
  },
];

export const providerById: Record<string, GLP1Provider> = Object.fromEntries(
  GLP1_PROVIDERS.map((p) => [p.id, p]),
);

/**
 * Lowest advertised provider price, derived (never hardcoded) from the provider
 * list above — the single source for the "from $X/mo" floor shown in CTAs and
 * static content. This mirrors the DB `providers.price_from_cents`; because
 * prerendered pages can't query the live DB, a startup consistency check
 * (server) logs loudly if this constant drifts from the live table. NOTE: a
 * price change requires a rebuild to reflect on static/prerendered pages.
 */
export const PROVIDER_FLOOR_PRICE = Math.min(...GLP1_PROVIDERS.map((p) => p.startingPrice));

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
