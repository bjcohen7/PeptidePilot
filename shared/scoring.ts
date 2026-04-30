/**
 * PeptidePilot Scoring Engine
 * 10-question weight-loss-forward quiz.
 * Maps quiz answers to health aspect scores, then ranks peptide profiles.
 */

export type AspectKey =
  | "muscle" | "fatloss" | "recovery" | "joints" | "injury" | "gut"
  | "cognitive" | "mood" | "anxiety" | "sleep" | "energy" | "antiaging"
  | "longevity" | "skin" | "hair" | "collagen" | "libido" | "confidence"
  | "hormone" | "metabolic" | "appetite" | "inflammation" | "healing"
  | "neuroprotection" | "endurance" | "focus" | "cardiovascular"
  | "bmi_qualifies" | "glp1_budget" | "insurance";

export type AspectScores = Record<AspectKey, number>;

export function initAspects(): AspectScores {
  return {
    muscle: 0, fatloss: 0, recovery: 0, joints: 0, injury: 0, gut: 0,
    cognitive: 0, mood: 0, anxiety: 0, sleep: 0, energy: 0, antiaging: 0,
    longevity: 0, skin: 0, hair: 0, collagen: 0, libido: 0, confidence: 0,
    hormone: 0, metabolic: 0, appetite: 0, inflammation: 0, healing: 0,
    neuroprotection: 0, endurance: 0, focus: 0, cardiovascular: 0,
    bmi_qualifies: 0, glp1_budget: 0, insurance: 0,
  };
}

/** Each entry is a map from answer index → aspect deltas */
export type ScoreMap = Array<Partial<AspectScores>>;

export const scoreMaps: ScoreMap[] = [
  [
    { fatloss: 2, metabolic: 1, energy: 1 },
    { fatloss: 3, metabolic: 2, appetite: 2, bmi_qualifies: 3, glp1_budget: 1 },
    { metabolic: 2, energy: 2, appetite: 1 },
    { muscle: 2, recovery: 2, endurance: 1, fatloss: 1 },
    { antiaging: 2, longevity: 2, energy: 1 },
  ],
  [
    { fatloss: 1, appetite: 1 },
    { fatloss: 2, metabolic: 1, appetite: 1 },
    { fatloss: 3, metabolic: 2, appetite: 2, bmi_qualifies: 3, glp1_budget: 1 },
    { fatloss: 3, metabolic: 3, appetite: 2, bmi_qualifies: 5, glp1_budget: 2, insurance: 1 },
    { muscle: 2, fatloss: 2, recovery: 1 },
  ],
  [
    { appetite: 2, fatloss: 1 },
    { appetite: 3, fatloss: 2, metabolic: 1, bmi_qualifies: 2 },
    { metabolic: 3, fatloss: 2, energy: 1, bmi_qualifies: 2 },
    { metabolic: 2, energy: 2, appetite: 1 },
    { confidence: 1, recovery: 1 },
  ],
  [
    { appetite: 2, fatloss: 1 },
    { appetite: 3, mood: 1, anxiety: 1, fatloss: 1 },
    { recovery: 2, energy: 2, sleep: 1 },
    { metabolic: 3, fatloss: 2, appetite: 1, bmi_qualifies: 2 },
    { muscle: 3, recovery: 2, fatloss: 1, endurance: 1 },
  ],
  [
    { fatloss: 1 },
    { fatloss: 2, energy: 1 },
    { muscle: 2, recovery: 1 },
    { muscle: 3, recovery: 2, endurance: 1 },
    { muscle: 3, recovery: 2, endurance: 2, confidence: 1 },
  ],
  [
    { appetite: 1, fatloss: 1 },
    { appetite: 1, fatloss: 1, muscle: 1 },
    { fatloss: 1, muscle: 2, recovery: 2 },
    { muscle: 2, recovery: 2, confidence: 1 },
    { muscle: 3, recovery: 2, endurance: 1 },
  ],
  [
    { sleep: 3, energy: 2, recovery: 1, anxiety: 1 },
    { sleep: 2, energy: 1, recovery: 1 },
    { sleep: 1, recovery: 1 },
    { energy: 1 },
    {},
  ],
  [
    { metabolic: 3, appetite: 2, energy: 1, bmi_qualifies: 2 },
    { hormone: 3, fatloss: 2, antiaging: 1, longevity: 1 },
    { hormone: 3, libido: 1, muscle: 1, recovery: 1 },
    { anxiety: 2, mood: 2, sleep: 1, fatloss: 1 },
    {},
  ],
  [
    { glp1_budget: 0 },
    { glp1_budget: 1 },
    { glp1_budget: 2 },
    { glp1_budget: 3, insurance: 1 },
    { glp1_budget: 3, insurance: 1 },
  ],
  [
    { insurance: 2, glp1_budget: 2, metabolic: 1 },
    { metabolic: 1, fatloss: 1, appetite: 1 },
    { muscle: 2, recovery: 2, fatloss: 1 },
    { sleep: 1, anxiety: 1, recovery: 1 },
    { insurance: 1, glp1_budget: 1, metabolic: 1, fatloss: 1 },
  ],
];

export interface PeptideProfile {
  id: string;
  name: string;
  description: string;
  categories: string[];
  weights: Partial<AspectScores>;
  vendors: Array<{ name: string; url: string }>;
}

export const libraryBackedPeptideProfileIds = [
  "bpc157",
  "tb500",
  "sermorelin",
  "semaglutide",
  "epithalon",
  "pt141",
  "ghk_cu",
] as const;

export const peptideProfiles: PeptideProfile[] = [
  {
    id: "bpc157",
    name: "BPC-157",
    description: "Body Protection Compound-157 is a synthetic peptide derived from a protein found in gastric juice. It has demonstrated remarkable regenerative properties in preclinical studies, particularly for healing tendons, ligaments, joints, and gut tissue. It is widely researched for its anti-inflammatory effects and ability to accelerate recovery from musculoskeletal injuries.",
    categories: ["recovery", "joint health", "gut healing", "injury repair"],
    weights: { recovery: 3, joints: 3, injury: 3, gut: 3, muscle: 1, inflammation: 2 },
    vendors: [
      { name: "Peptide Sciences", url: "https://www.peptidesciences.com" },
      { name: "Limitless Life", url: "https://limitlesslifenootropics.com" },
    ],
  },
  {
    id: "tb500",
    name: "TB-500",
    description: "Thymosin Beta-4 is a naturally occurring peptide found in high concentrations in blood platelets and wound fluid. It promotes cell migration and differentiation, making it highly effective for tissue repair, wound healing, and reducing inflammation. Athletes use it to recover from injuries faster and improve overall tissue resilience.",
    categories: ["recovery", "injury repair", "anti-inflammatory", "endurance"],
    weights: { recovery: 3, injury: 3, joints: 2, inflammation: 3, muscle: 1, endurance: 1 },
    vendors: [
      { name: "Peptide Sciences", url: "https://www.peptidesciences.com" },
      { name: "Core Peptides", url: "https://corepeptides.com" },
    ],
  },
  {
    id: "ipamorelin_cjc1295",
    name: "Ipamorelin / CJC-1295",
    description: "This synergistic combination stimulates the pituitary gland to release growth hormone in a natural, pulsatile pattern. Ipamorelin is a selective growth hormone secretagogue, while CJC-1295 extends the half-life of the release. Together, they support lean muscle gain, fat loss, improved sleep quality, and enhanced recovery — making them one of the most popular peptide stacks.",
    categories: ["muscle growth", "fat loss", "anti-aging", "sleep quality"],
    weights: { muscle: 3, fatloss: 2, antiaging: 3, sleep: 2, recovery: 2, energy: 2 },
    vendors: [
      { name: "Peptide Sciences", url: "https://www.peptidesciences.com" },
      { name: "Paradigm Peptides", url: "https://paradigmpeptides.com" },
    ],
  },
  {
    id: "sermorelin",
    name: "Sermorelin",
    description: "Sermorelin is a growth hormone-releasing hormone (GHRH) analogue that stimulates the pituitary to produce more growth hormone naturally. It is one of the most clinically studied peptides for anti-aging, with benefits including improved sleep architecture, body composition, energy levels, and longevity markers. It is often preferred for its safety profile and natural mechanism of action.",
    categories: ["anti-aging", "sleep", "energy", "longevity"],
    weights: { antiaging: 3, sleep: 3, muscle: 2, fatloss: 1, energy: 3, longevity: 2 },
    vendors: [
      { name: "Hone Health", url: "https://honehealth.com" },
      { name: "Defy Medical", url: "https://defymedical.com" },
    ],
  },
  {
    id: "semaglutide",
    name: "Semaglutide / Tirzepatide",
    description: "GLP-1 receptor agonists like Semaglutide and the dual GIP/GLP-1 agonist Tirzepatide represent the most clinically validated peptides for metabolic health and weight management. They work by regulating appetite, slowing gastric emptying, and improving insulin sensitivity. Clinical trials have demonstrated significant and sustained reductions in body weight and improvements in metabolic markers.",
    categories: ["fat loss", "metabolic health", "appetite control", "energy"],
    weights: {
      fatloss: 3,
      metabolic: 3,
      appetite: 3,
      energy: 1,
      inflammation: 1,
      bmi_qualifies: 5,
      glp1_budget: 2,
      insurance: 1,
    },
    vendors: [
      { name: "Hone Health", url: "https://honehealth.com" },
      { name: "LifeMD", url: "https://www.lifemd.com" },
    ],
  },
  {
    id: "epithalon",
    name: "Epithalon",
    description: "Epithalon is a tetrapeptide derived from the pineal gland that has been studied extensively for its role in regulating the aging process. It activates telomerase, the enzyme responsible for maintaining telomere length — a key biomarker of cellular aging. Research suggests benefits for sleep quality, immune function, and overall longevity.",
    categories: ["anti-aging", "longevity", "sleep", "cellular health"],
    weights: { antiaging: 3, sleep: 2, longevity: 3, energy: 1, inflammation: 1 },
    vendors: [
      { name: "Peptide Sciences", url: "https://www.peptidesciences.com" },
      { name: "Limitless Life", url: "https://limitlesslifenootropics.com" },
    ],
  },
  {
    id: "pt141",
    name: "PT-141 (Bremelanotide)",
    description: "PT-141 is a melanocortin receptor agonist that acts centrally on the nervous system to enhance sexual desire and arousal in both men and women. Unlike PDE5 inhibitors that work peripherally, PT-141 addresses libido at the neurological level, making it effective for individuals whose low libido has a psychological or hormonal component. It is FDA-approved under the name Vyleesi for hypoactive sexual desire disorder.",
    categories: ["libido", "sexual health", "mood", "confidence"],
    weights: { libido: 3, mood: 2, energy: 1, confidence: 2 },
    vendors: [
      { name: "Hone Health", url: "https://honehealth.com" },
      { name: "Defy Medical", url: "https://defymedical.com" },
    ],
  },
  {
    id: "selank_semax",
    name: "Selank / Semax",
    description: "Selank and Semax are nootropic peptides developed in Russia with extensive research supporting their cognitive-enhancing and anxiolytic properties. Selank is derived from tuftsin and demonstrates significant anti-anxiety effects without sedation. Semax is an ACTH analogue that enhances BDNF production, improving focus, memory, and neuroprotection. Both are administered nasally for rapid central nervous system absorption.",
    categories: ["cognitive enhancement", "anxiety relief", "focus", "neuroprotection"],
    weights: { cognitive: 3, focus: 3, anxiety: 3, mood: 2, neuroprotection: 3 },
    vendors: [
      { name: "Peptide Sciences", url: "https://www.peptidesciences.com" },
      { name: "Cosmic Nootropic", url: "https://cosmicnootropic.com" },
    ],
  },
  {
    id: "ghk_cu",
    name: "GHK-Cu (Copper Peptide)",
    description: "GHK-Cu is a naturally occurring copper peptide with a remarkable range of regenerative properties. It stimulates collagen and elastin synthesis, promotes wound healing, and exhibits potent anti-inflammatory and antioxidant effects. In cosmetic applications, it has been shown to reduce fine lines, improve skin firmness, and promote hair follicle health — making it a standout peptide for those prioritizing appearance and skin quality.",
    categories: ["skin health", "hair growth", "anti-aging", "collagen synthesis"],
    weights: { skin: 3, hair: 3, antiaging: 2, healing: 2, inflammation: 1, collagen: 3 },
    vendors: [
      { name: "Peptide Sciences", url: "https://www.peptidesciences.com" },
      { name: "Limitless Life", url: "https://limitlesslifenootropics.com" },
    ],
  },
  {
    id: "ss31",
    name: "SS-31 (Elamipretide)",
    description: "SS-31 is a mitochondria-targeted peptide that protects and restores mitochondrial function — the fundamental energy-producing organelles in every cell. By reducing oxidative stress and improving mitochondrial efficiency, SS-31 shows promise for increasing cellular energy production, supporting cardiovascular health, and addressing age-related decline in energy and vitality. It is one of the most exciting longevity-focused peptides in current research.",
    categories: ["energy", "anti-aging", "longevity", "cardiovascular health"],
    weights: { energy: 3, antiaging: 3, longevity: 3, cognitive: 1, cardiovascular: 2, inflammation: 2 },
    vendors: [
      { name: "Peptide Sciences", url: "https://www.peptidesciences.com" },
      { name: "Core Peptides", url: "https://corepeptides.com" },
    ],
  },
  {
    id: "mots_c",
    name: "MOTS-c",
    description: "MOTS-c is a mitochondrial-derived peptide that acts as a metabolic regulator, improving insulin sensitivity and activating AMPK pathways — the body's master metabolic switch. Research demonstrates significant improvements in fat oxidation, endurance capacity, and metabolic flexibility. It is particularly promising for individuals with metabolic syndrome, insulin resistance, or those seeking to improve body composition and physical performance.",
    categories: ["metabolic health", "fat loss", "endurance", "longevity"],
    weights: { fatloss: 2, metabolic: 3, endurance: 2, muscle: 1, longevity: 2, energy: 2 },
    vendors: [
      { name: "Peptide Sciences", url: "https://www.peptidesciences.com" },
      { name: "Paradigm Peptides", url: "https://paradigmpeptides.com" },
    ],
  },
  {
    id: "dsip",
    name: "DSIP (Delta Sleep-Inducing Peptide)",
    description: "Delta Sleep-Inducing Peptide is a neuropeptide that modulates sleep architecture, promoting deeper, more restorative slow-wave sleep. Beyond its sleep-regulating properties, DSIP has been studied for its effects on stress hormone regulation, anxiety reduction, and hormonal balance. It is particularly relevant for individuals whose poor sleep is driven by stress, hormonal disruption, or irregular circadian rhythms.",
    categories: ["sleep quality", "recovery", "anxiety relief", "hormonal balance"],
    weights: { sleep: 3, recovery: 2, anxiety: 2, energy: 1, hormone: 2 },
    vendors: [
      { name: "Peptide Sciences", url: "https://www.peptidesciences.com" },
      { name: "Limitless Life", url: "https://limitlesslifenootropics.com" },
    ],
  },
];

export interface MatchResult {
  peptide: PeptideProfile;
  score: number;
  matchPercent: number;
}

/**
 * Serializable match shape used by the returning-results hydration flow.
 */
export interface ReturningMatchSummary {
  peptideId: string;
  name: string;
  description: string;
  categories: string[];
  matchPercent: number;
}

export function toReturningMatchSummary(result: MatchResult): ReturningMatchSummary {
  return {
    peptideId: result.peptide.id,
    name: result.peptide.name,
    description: result.peptide.description,
    categories: result.peptide.categories,
    matchPercent: result.matchPercent,
  };
}

export function calculateAspectScores(answers: number[]): AspectScores {
  const aspects = initAspects();

  for (let i = 0; i < answers.length && i < scoreMaps.length; i++) {
    const answerIdx = answers[i];
    const map = scoreMaps[i];
    if (answerIdx >= 0 && answerIdx < map.length) {
      const deltas = map[answerIdx];
      for (const [key, val] of Object.entries(deltas)) {
        aspects[key as AspectKey] += val as number;
      }
    }
  }

  return aspects;
}

export function calculateMatches(answers: number[]): MatchResult[] {
  const aspects = calculateAspectScores(answers);

  const scored = peptideProfiles.map((peptide) => {
    let score = 0;
    for (const [aspect, weight] of Object.entries(peptide.weights)) {
      score += (aspects[aspect as AspectKey] ?? 0) * (weight as number);
    }
    return { peptide, score };
  });

  const maxScore = Math.max(...scored.map((s) => s.score), 1);

  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ peptide, score }) => ({
      peptide,
      score,
      matchPercent: Math.round((score / maxScore) * 100),
    }));
}

export const QUIZ_INDEX = {
  PRIMARY_GOAL: 0,
  HORMONE: 7,
  BUDGET: 8,
  APPROACH: 9,
} as const;

export const PRIMARY_GOAL_OPTIONS = [
  "Lose body fat and improve body composition",
  "Reduce appetite and feel more in control around food",
  "Improve energy and metabolic health",
  "Preserve muscle while leaning out",
  "Improve long-term health and aging markers",
] as const;

export const BUDGET_OPTIONS = [
  "Under $100/month",
  "$100–$250/month",
  "$250–$500/month",
  "$500–$1,000/month",
  "Flexible if the fit is strong",
] as const;

export function determineTier(answers: number[]): 1 | 2 | 3 {
  const hormoneIdx = answers[QUIZ_INDEX.HORMONE] ?? -1;
  const hasHormonalIssues = hormoneIdx >= 0 && hormoneIdx <= 3;

  const budgetIdx = answers[QUIZ_INDEX.BUDGET] ?? -1;
  const isPremiumBudget = budgetIdx >= 3;
  const isStandardBudget = budgetIdx >= 1;

  const matches = calculateMatches(answers);
  const topMatch = matches[0]?.peptide.id ?? "";
  const isPremiumPeptide =
    topMatch === "semaglutide" || topMatch === "sermorelin" || topMatch === "ipamorelin_cjc1295";

  if (hasHormonalIssues && isPremiumBudget && isPremiumPeptide) {
    return 1;
  }
  if (isStandardBudget) {
    return 2;
  }
  return 3;
}

export const QUIZ_QUESTIONS = [
  {
    section: "Body Composition",
    question: "What’s your main goal right now?",
    options: [
      "Lose body fat and improve body composition",
      "Reduce appetite and feel more in control around food",
      "Improve energy and metabolic health",
      "Preserve muscle while leaning out",
      "Improve long-term health and aging markers",
    ],
  },
  {
    section: "Body Composition",
    question: "How much weight or body fat are you realistically trying to lose?",
    options: [
      "5–10 pounds",
      "10–25 pounds",
      "25–50 pounds",
      "50+ pounds",
      "I care more about recomposition than scale weight",
    ],
  },
  {
    section: "Appetite & Cravings",
    question: "Which feels most true for you right now?",
    options: [
      "I’m hungry more often than I should be",
      "I deal with cravings or food noise daily",
      "I eat reasonably well but still struggle to lose weight",
      "My energy and metabolism feel inconsistent",
      "My challenge is staying consistent, not hunger",
    ],
  },
  {
    section: "Appetite & Cravings",
    question: "When you try to lose weight, what usually gets in the way?",
    options: [
      "Appetite and portion control",
      "Cravings, snacking, or emotional eating",
      "Low energy or poor recovery",
      "Slow progress despite effort",
      "Losing muscle or looking flat",
    ],
  },
  {
    section: "Activity & Training",
    question: "How active are you currently?",
    options: [
      "Mostly sedentary",
      "Light walking or occasional workouts",
      "3–4 workouts per week",
      "5+ workouts per week",
      "Very active and trying to optimize body composition",
    ],
  },
  {
    section: "Activity & Training",
    question: "How important is muscle retention while losing weight?",
    options: [
      "Not very important right now",
      "Somewhat important",
      "Very important",
      "It’s one of my top priorities",
      "I care more about recomposition than weight loss alone",
    ],
  },
  {
    section: "Recovery",
    question: "How well are you sleeping lately?",
    options: [
      "Poorly",
      "Inconsistently",
      "Decently, but not great",
      "Pretty well",
      "Very well",
    ],
  },
  {
    section: "Hormones & Metabolism",
    question: "Which best describes your current metabolic or hormone context?",
    options: [
      "I suspect insulin resistance or blood sugar issues",
      "Perimenopause or menopause may be affecting weight",
      "Low testosterone or hormone imbalance may be affecting me",
      "High stress or cortisol seems like a major factor",
      "None of these really stand out",
    ],
  },
  {
    section: "Practical Fit",
    question: "What monthly budget feels realistic for your plan?",
    options: [...BUDGET_OPTIONS],
  },
  {
    section: "Practical Fit",
    question: "Which approach are you most open to?",
    options: [
      "Prescription-based support if it works best",
      "Peptides or non-GLP options first",
      "A muscle-preserving fat-loss approach",
      "The gentlest, lowest-side-effect option",
      "I’m open, but want the most effective fit",
    ],
  },
];
