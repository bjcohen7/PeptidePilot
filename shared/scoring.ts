/**
 * PeptidePilot Scoring Engine
 * 22-question quiz with conditional GLP-1 branching for weight-loss users.
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
    { muscle: 2, energy: 1 },
    { fatloss: 2, metabolic: 1 },
    { energy: 2, cognitive: 1, focus: 1 },
    { antiaging: 2, longevity: 2 },
    { sleep: 2, recovery: 1 },
    { injury: 2, healing: 2, joints: 1 },
    { libido: 2, hormone: 1, confidence: 1 },
    { recovery: 2, inflammation: 1 },
  ],
  [
    { energy: 2 },
    { joints: 1, inflammation: 1, injury: 1 },
    { cognitive: 2, focus: 2 },
    { mood: 2, anxiety: 1 },
    { antiaging: 2, longevity: 1 },
    { sleep: 2 },
    { confidence: 2, hormone: 1 },
    { muscle: 1, fatloss: 1, recovery: 1 },
  ],
  [
    { fatloss: 1, metabolic: 1 },
    { energy: 1, fatloss: 1 },
    { muscle: 1, recovery: 1 },
    { muscle: 2, recovery: 2, endurance: 1 },
    { muscle: 2, recovery: 2, endurance: 2 },
  ],
  [
    { muscle: 1, recovery: 1 },
    { fatloss: 1, muscle: 1 },
    { fatloss: 2, metabolic: 2, appetite: 1 },
    { muscle: 2 },
    { recovery: 2, injury: 2, healing: 1 },
  ],
  [
    {},
    { recovery: 1 },
    { recovery: 2, inflammation: 1 },
    { recovery: 3, inflammation: 2, injury: 1 },
  ],
  [
    {},
    { fatloss: 1 },
    { bmi_qualifies: 3, fatloss: 2, metabolic: 1 },
    { bmi_qualifies: 5, fatloss: 3, metabolic: 2 },
  ],
  [
    { insurance: 2, glp1_budget: 1 },
    { insurance: 1 },
    { glp1_budget: 1 },
  ],
  [
    {},
    { hormone: 1 },
    { antiaging: 1, hormone: 1 },
    { antiaging: 2, hormone: 2, longevity: 1 },
    { antiaging: 2, hormone: 2, longevity: 2 },
    { antiaging: 3, hormone: 2, longevity: 3 },
  ],
  [
    {},
    { hormone: 1 },
    { hormone: 3, libido: 1 },
    { hormone: 2, metabolic: 1 },
    { hormone: 2 },
  ],
  [
    {},
    { libido: 1 },
    { libido: 2, hormone: 1, mood: 1 },
    { libido: 3, hormone: 2, confidence: 1 },
    {},
  ],
  [
    {},
    { sleep: 1 },
    { sleep: 2, energy: 1 },
    { sleep: 3, energy: 2, recovery: 1 },
    { sleep: 3, energy: 2, recovery: 2, anxiety: 1 },
  ],
  [
    {},
    { sleep: 1 },
    { sleep: 2, energy: 2 },
    { sleep: 3, energy: 3, recovery: 1 },
  ],
  [
    {},
    { joints: 1, inflammation: 1 },
    { joints: 2, inflammation: 2, recovery: 1 },
    { joints: 3, inflammation: 2, injury: 2 },
    { injury: 3, joints: 2, healing: 2 },
  ],
  [
    {},
    { gut: 1, inflammation: 1 },
    { gut: 2, inflammation: 2 },
    { gut: 3, inflammation: 2, healing: 1 },
    { gut: 3, inflammation: 3, healing: 2 },
  ],
  [
    {},
    { cognitive: 1, focus: 1 },
    { cognitive: 2, focus: 2, neuroprotection: 1 },
    { cognitive: 3, focus: 3, neuroprotection: 2 },
  ],
  [
    {},
    { anxiety: 1, mood: 1 },
    { anxiety: 2, mood: 2, neuroprotection: 1 },
    { anxiety: 3, mood: 2, neuroprotection: 2 },
  ],
  [
    {},
    { skin: 1, collagen: 1 },
    { skin: 2, collagen: 2, antiaging: 1 },
    { skin: 3, collagen: 2, antiaging: 2 },
  ],
  [
    {},
    { hair: 1 },
    { hair: 2, hormone: 1 },
    { hair: 3, hormone: 2 },
    { hair: 2, hormone: 1 },
  ],
  [
    {},
    { cognitive: 1 },
    { muscle: 1, recovery: 1 },
    { muscle: 1, recovery: 1, longevity: 1 },
  ],
  [
    {},
    { fatloss: 1, energy: 1 },
    { muscle: 1, recovery: 1, hormone: 1 },
    { hormone: 2, antiaging: 1, longevity: 1 },
    { hormone: 2, antiaging: 2, longevity: 2 },
  ],
  [
    { hormone: 1, longevity: 1 },
    {},
    {},
    {},
  ],
  [
    { fatloss: 2, metabolic: 1 },
    { muscle: 2, recovery: 2 },
    { skin: 2, antiaging: 2, collagen: 1 },
    { cognitive: 2, anxiety: 1, focus: 2 },
    { sleep: 2, energy: 2 },
    { injury: 2, healing: 2, joints: 1 },
    { confidence: 2, hormone: 1, energy: 1 },
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
  GLP1_BMI: 5,
  GLP1_INSURANCE: 6,
  AGE_RANGE: 7,
  HORMONE: 8,
  LIBIDO: 9,
  BUDGET: 19,
} as const;

export const AGE_RANGE_OPTIONS = ["18–25", "26–35", "36–45", "46–55", "56–65", "65+"] as const;

export const PRIMARY_GOAL_OPTIONS = [
  "Build muscle and increase strength",
  "Lose body fat and improve body composition",
  "Boost daily energy and mental clarity",
  "Slow aging and optimize longevity",
  "Improve sleep quality and depth",
  "Heal an injury or chronic pain",
  "Enhance libido and sexual vitality",
  "Speed up recovery and reduce soreness",
] as const;

export const BUDGET_OPTIONS = [
  "Under $50/month",
  "$50–$100/month",
  "$100–$200/month",
  "$200–$500/month",
  "$500+/month",
] as const;

export function determineTier(answers: number[]): 1 | 2 | 3 {
  const ageIdx = answers[QUIZ_INDEX.AGE_RANGE] ?? -1;
  const isOlderAge = ageIdx >= 3;

  const hormoneIdx = answers[QUIZ_INDEX.HORMONE] ?? -1;
  const hasHormonalIssues = hormoneIdx >= 2;

  const libidoIdx = answers[QUIZ_INDEX.LIBIDO] ?? -1;
  const hasLowLibido = libidoIdx >= 2;

  const budgetIdx = answers[QUIZ_INDEX.BUDGET] ?? -1;
  const isPremiumBudget = budgetIdx >= 3;
  const isStandardBudget = budgetIdx >= 1;

  const matches = calculateMatches(answers);
  const topMatch = matches[0]?.peptide.id ?? "";
  const isPremiumPeptide = topMatch === "pt141" || topMatch === "sermorelin";

  if (isOlderAge && (hasHormonalIssues || hasLowLibido) && isPremiumBudget && isPremiumPeptide) {
    return 1;
  }
  if (isStandardBudget) {
    return 2;
  }
  return 3;
}

export const QUIZ_QUESTIONS = [
  {
    section: "Goals & Priorities",
    question: "What is your single most important health goal right now?",
    options: [
      "Build muscle and increase strength",
      "Lose body fat and improve body composition",
      "Boost daily energy and mental clarity",
      "Slow aging and optimize longevity",
      "Improve sleep quality and depth",
      "Heal an injury or chronic pain",
      "Enhance libido and sexual vitality",
      "Speed up recovery and reduce soreness",
    ],
  },
  {
    section: "Goals & Priorities",
    question: "If you could change one thing about how your body feels day-to-day, what would it be?",
    options: [
      "More energy from morning to night",
      "Less pain or physical discomfort",
      "Sharper focus and mental performance",
      "Better mood and emotional balance",
      "Feeling younger and more vital",
      "Deeper, more restorative sleep",
      "Greater confidence in my body",
      "Faster physical results from my efforts",
    ],
  },
  {
    section: "Body & Fitness",
    question: "How would you describe your current activity level?",
    options: [
      "Sedentary — mostly desk work, little exercise",
      "Lightly active — walks or gym once or twice a week",
      "Moderately active — exercise 3 to 4 times per week",
      "Very active — train 5 or more days per week",
      "Competitive athlete or daily high-performance training",
    ],
  },
  {
    section: "Body & Fitness",
    question: "How would you describe your current body composition?",
    options: [
      "Lean and muscular — looking to optimize",
      "Average build — want to improve tone",
      "Carrying extra body fat — weight loss is needed",
      "Underweight or struggling to gain mass",
      "Post-injury or post-illness, rebuilding",
    ],
  },
  {
    section: "Body & Fitness",
    question: "How often do you experience muscle soreness or delayed recovery after training?",
    options: [
      "Rarely — I recover quickly",
      "Sometimes — usually fine within a day or two",
      "Often — soreness lasts 2 to 3 days",
      "Almost always — recovery is a major limiting factor",
    ],
  },
  {
    section: "Metabolic Health",
    question: "What is your current BMI range?",
    options: [
      "Under 25 (normal weight)",
      "25 to 27 (overweight)",
      "27 to 30 (overweight with risk factors)",
      "Over 30 (obesity range)",
    ],
  },
  {
    section: "Metabolic Health",
    question: "Do you have health insurance that could help cover prescription care?",
    options: [
      "Yes — commercial insurance or ACA plan",
      "Yes — Medicare or Medicaid",
      "No — uninsured or self-pay",
    ],
  },
  {
    section: "Age & Hormones",
    question: "What is your age range?",
    options: ["18–25", "26–35", "36–45", "46–55", "56–65", "65+"],
  },
  {
    section: "Age & Hormones",
    question: "Do you have any known hormonal imbalances or have you been told your hormones are low?",
    options: [
      "No — levels are normal as far as I know",
      "Possibly — I have symptoms but haven't been tested",
      "Yes — diagnosed with low testosterone or low estrogen",
      "Yes — thyroid or other hormonal issues",
      "I'm currently on HRT or TRT",
    ],
  },
  {
    section: "Age & Hormones",
    question: "How is your libido compared to where you'd like it to be?",
    options: [
      "Great — no concerns",
      "Slightly lower than I'd like",
      "Noticeably reduced — it bothers me",
      "Very low — this is a priority issue",
      "Prefer not to say",
    ],
  },
  {
    section: "Sleep & Recovery",
    question: "How would you rate your overall sleep quality?",
    options: [
      "Excellent — I sleep deeply and wake refreshed",
      "Good — mostly fine with occasional bad nights",
      "Fair — I often feel tired despite sleeping 7 to 8 hours",
      "Poor — I struggle to fall or stay asleep",
      "Very poor — sleep is a significant daily problem",
    ],
  },
  {
    section: "Sleep & Recovery",
    question: "Do you wake up feeling rested and ready for the day?",
    options: [
      "Yes — almost every morning",
      "Usually — most days are fine",
      "Rarely — I almost always feel groggy",
      "Never — fatigue is constant regardless of sleep",
    ],
  },
  {
    section: "Pain & Injury",
    question: "Do you currently have any joint, tendon, or ligament pain?",
    options: [
      "No — completely pain free",
      "Minor occasional discomfort",
      "Moderate — affects my training sometimes",
      "Significant — a recurring and limiting problem",
      "Currently recovering from a specific injury",
    ],
  },
  {
    section: "Pain & Injury",
    question: "Do you experience gut issues such as IBS, leaky gut, or digestive discomfort?",
    options: [
      "No gut issues at all",
      "Mild occasional bloating or discomfort",
      "Moderate — regular digestive issues",
      "Significant — gut health is a major concern",
      "Diagnosed with a gut condition (Crohn's, IBS, etc.)",
    ],
  },
  {
    section: "Cognition & Mood",
    question: "How would you rate your day-to-day mental clarity and focus?",
    options: [
      "Sharp — focused and clear most of the time",
      "Average — manageable with some brain fog",
      "Below average — focus and memory are a struggle",
      "Poor — cognitive performance significantly impacts my life",
    ],
  },
  {
    section: "Cognition & Mood",
    question: "Do you experience anxiety, chronic stress, or difficulty managing emotions?",
    options: [
      "No — generally calm and resilient",
      "Mild anxiety or stress occasionally",
      "Moderate — anxiety or stress is a regular issue",
      "Significant — it meaningfully impacts my quality of life",
    ],
  },
  {
    section: "Skin, Hair & Appearance",
    question: "How would you describe your current skin condition?",
    options: [
      "Great — healthy, firm, and youthful looking",
      "Minor concerns — some fine lines or dullness",
      "Moderate concerns — visible aging or skin issues",
      "Significant concerns — skin health is a priority for me",
    ],
  },
  {
    section: "Skin, Hair & Appearance",
    question: "Are you experiencing hair thinning or hair loss?",
    options: [
      "No — hair is full and healthy",
      "Slight thinning I've noticed recently",
      "Moderate thinning — it bothers me",
      "Significant hair loss — a major concern",
      "Already using treatments for hair loss",
    ],
  },
  {
    section: "Lifestyle & Preferences",
    question: "How experienced are you with peptides or biohacking in general?",
    options: [
      "Complete beginner — never tried anything like this",
      "Familiar — I've researched but haven't used peptides yet",
      "Intermediate — I've used some peptides or advanced supplements",
      "Advanced — I actively run peptide protocols and track results",
    ],
  },
  {
    section: "Lifestyle & Preferences",
    question: "What is your monthly budget for peptide supplementation?",
    options: [
      "Under $50 per month",
      "$50 to $100 per month",
      "$100 to $200 per month",
      "$200 to $500 per month",
      "$500 or more — I invest heavily in my health",
    ],
  },
  {
    section: "Lifestyle & Preferences",
    question: "Do you currently work with a doctor, functional medicine practitioner, or health coach?",
    options: [
      "Yes — I have professional medical guidance",
      "Sometimes — I consult occasionally",
      "No — I self-direct my health protocols",
      "No — but I'd like to find one",
    ],
  },
  {
    section: "Lifestyle & Preferences",
    question: "What outcome would make this quiz feel like a total success for you?",
    options: [
      "Visible body composition changes within 3 months",
      "Feeling stronger and recovering faster from training",
      "Looking noticeably younger and healthier",
      "Thinking more clearly with less stress",
      "Sleeping better and having sustained daily energy",
      "Healing a specific injury or resolving chronic pain",
      "Feeling more confident, vital, and motivated overall",
    ],
  },
];
