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
  | "neuroprotection" | "endurance" | "focus" | "cardiovascular";

export type AspectScores = Record<AspectKey, number>;

export function initAspects(): AspectScores {
  return {
    muscle: 0, fatloss: 0, recovery: 0, joints: 0, injury: 0, gut: 0,
    cognitive: 0, mood: 0, anxiety: 0, sleep: 0, energy: 0, antiaging: 0,
    longevity: 0, skin: 0, hair: 0, collagen: 0, libido: 0, confidence: 0,
    hormone: 0, metabolic: 0, appetite: 0, inflammation: 0, healing: 0,
    neuroprotection: 0, endurance: 0, focus: 0, cardiovascular: 0,
  };
}

/** Each entry is a map from answer index → aspect deltas */
export type ScoreMap = Array<Partial<AspectScores>>;

export const scoreMaps: ScoreMap[] = [
  // ─── CLUSTER 1: Hook (Q1–Q4) ─────────────────────────────────────────────
  // Q1, Q4 are heavy aspect signal; Q2–Q3 are supporting context.

  // Q1: What brought you here today?
  [
    { fatloss: 2, metabolic: 1 },                      // I want to lose weight
    { appetite: 2 },                                   // My relationship with food feels off
    { energy: 2 },                                     // My energy isn't what it used to be
    { inflammation: 2, metabolic: 1 },                 // My body feels inflamed or puffy
    { metabolic: 2, fatloss: 1 },                      // My metabolism just isn't working
  ],

  // Q2: How long have you been working on this?
  [
    { energy: 1 },                                     // Less than a year
    { fatloss: 1 },                                    // 1–3 years
    { fatloss: 1, metabolic: 1 },                      // 3–10 years
    { fatloss: 1, metabolic: 1, appetite: 1 },         // More than 10 years
    { fatloss: 2, appetite: 1, metabolic: 1 },         // Honestly, my whole adult life
  ],

  // Q3: Which of these sounds most like you?
  [
    { fatloss: 1, metabolic: 1 },                      // I lose weight, then it all comes back
    { metabolic: 1, inflammation: 1 },                  // I diet hard but my body fights me
    { metabolic: 2, fatloss: 1 },                      // I eat reasonably and still can't lose
    { fatloss: 1 },                                    // I've tried so many things
    { energy: 1 },                                     // I haven't really tried
  ],

  // Q4: Food noise — how loud is it for you?  (heavy appetite/satiety)
  [
    { appetite: 3, fatloss: 1 },                       // It's always there
    { appetite: 2 },                                   // Loud most days
    { appetite: 1 },                                   // Manageable but distracting
    { appetite: 1 },                                   // Comes and goes
    {},                                                // Not really a thing for me
  ],

  // ─── CLUSTER 2: Symptom mapping (Q5–Q10) ─────────────────────────────────
  // Q9 is heavy appetite/satiety signal.

  // Q5: How would you describe your energy day to day?
  [
    { energy: 2, metabolic: 1 },                       // I crash by 2pm, every day
    { energy: 2 },                                     // Wired but tired
    { energy: 1 },                                     // Mornings decent, evenings gone
    { energy: 1 },                                     // Inconsistent
    {},                                                // Generally pretty good
  ],

  // Q6: How's your sleep?
  [
    { sleep: 2, energy: 1 },                           // Sleep enough but don't feel rested
    { sleep: 2 },                                      // Trouble falling asleep
    { sleep: 2 },                                      // Trouble staying asleep
    {},                                                // Generally pretty good
    { sleep: 3, energy: 1 },                           // Honestly, terrible
  ],

  // Q7: Any of these going on — inflammation, joint pain, puffiness?
  [
    { inflammation: 2, metabolic: 1 },                  // All of the above
    { inflammation: 1, metabolic: 1 },                  // Mainly puffiness and bloating
    { inflammation: 1 },                                // Mainly joint pain
    { inflammation: 1 },                                // A bit of everything
    {},                                                // Not really
  ],

  // Q8: Cravings — what's the pattern?
  [
    { appetite: 2, metabolic: 1 },                     // Sugar specifically
    { appetite: 1, metabolic: 1 },                     // Carbs
    { appetite: 1 },                                   // Salty, crunchy snacks
    { appetite: 2 },                                   // Late-night snacking
    {},                                                // Not really a cravings issue
  ],

  // Q9: Pick the line that hits hardest.  (heavy appetite/satiety — quoted format)
  [
    { appetite: 3 },                                   // "I eat past full because the food is there."
    { appetite: 2, metabolic: 1 },                     // "I'm hungry again 90 minutes later."
    { appetite: 2 },                                   // "I can stop, but I never feel satisfied."
    { metabolic: 1 },                                  // "I eat normal portions — feeling full isn't the issue."
    {},                                                // "Honestly? None of these — I'm fine here."
  ],

  // Q10: How does stress affect your eating?
  [
    { appetite: 2, anxiety: 1 },                       // Stress eating is my whole problem
    { appetite: 1 },                                   // It's a factor
    { appetite: 1 },                                   // It hits sometimes
    {},                                                // Doesn't really affect me
    { appetite: 1 },                                   // I lose my appetite when I'm stressed
  ],

  // ─── CLUSTER 3: Personal context (Q11–Q15) ───────────────────────────────
  // Q12 is weight aspect signal; Q14 cumulative over multi-select options.

  // Q11: What's your age range?  (calibration — light deltas)
  [
    {},                                                // Under 25
    {},                                                // 25–34
    { metabolic: 1 },                                  // 35–44
    { metabolic: 1 },                                  // 45–54
    { metabolic: 1 },                                  // 55+
  ],

  // Q12: What is your target weight loss range?
  [
    { fatloss: 1 },                                    // Less than 20 lbs
    { fatloss: 2 },                                    // 20–50 lbs
    { fatloss: 3, metabolic: 1 },                      // 50–100 lbs
    { fatloss: 3, metabolic: 2 },                      // Greater than 100 lbs
    { fatloss: 1 },                                    // Body composition focus
  ],

  // Q13: Where are you carrying the weight, mostly?
  [
    { metabolic: 2, fatloss: 1 },                      // Belly and midsection
    { fatloss: 1 },                                    // Hips, thighs, legs
    { fatloss: 1 },                                    // Pretty evenly distributed
    { metabolic: 1 },                                  // It's shifted over the years
    {},                                                // Not sure / don't track
  ],

  // Q14: What have you already tried?  (multi-select — cumulative)
  [
    { fatloss: 1 },                                    // Calorie counting or tracking
    { fatloss: 1 },                                    // Keto or low-carb
    { metabolic: 1 },                                  // Intermittent fasting
    { energy: 1 },                                     // Personal trainer or serious exercise
    { fatloss: 1, metabolic: 1 },                      // Other weight loss medications
    { fatloss: 2 },                                    // Weight loss surgery consultation
    { fatloss: 1 },                                    // Honestly, a lot of stuff
  ],

  // Q15: How would you characterize your current physical activity level?
  [
    { metabolic: 1, energy: 1 },                       // Predominantly sedentary
    { energy: 1 },                                     // Light activity, unstructured
    { energy: 1 },                                     // Regular light activity
    {},                                                // Structured exercise, 2–4 sessions
    {},                                                // High activity, daily training
  ],

  // ─── CLUSTER 4: Medical screening (Q16–Q19) ──────────────────────────────
  // Mostly clinical flags; Q16 conditions signal metabolic fit.

  // Q16: Do you have any of these conditions?  (multi-select — cumulative)
  [
    { metabolic: 2 },                                  // Type 2 diabetes
    { metabolic: 2 },                                  // Pre-diabetes or insulin resistance
    { metabolic: 1 },                                  // High blood pressure
    { metabolic: 1 },                                  // High cholesterol
    { metabolic: 1, hormone: 1 },                      // PCOS
    { metabolic: 1, hormone: 1 },                      // Thyroid condition
    { sleep: 1, metabolic: 1 },                        // Sleep apnea
    {},                                                // None of these
  ],

  // Q17: Are any of these true for you?  (multi-select — off-ramp at Q17)
  // Contraindications are clinical flags, not aspect deltas.
  // Pregnancy and MTC route to off-ramp; others pass to provider screening.
  [
    {},                                                // Currently pregnant or trying to conceive
    {},                                                // Family history of medullary thyroid cancer
    {},                                                // History of pancreatitis
    {},                                                // Active gallbladder disease
    {},                                                // Severe gastrointestinal disorder
    {},                                                // None of these
  ],

  // Q18: Are you currently taking any prescription medications?
  [
    {},                                                // Yes, for chronic conditions
    {},                                                // Yes, occasionally
    {},                                                // No
    {},                                                // Prefer not to say
  ],

  // Q19: Have you ever taken a GLP-1 medication before?
  [
    { fatloss: 1, metabolic: 1 },                      // Yes, and it worked well
    { fatloss: 1 },                                    // Yes, but I stopped
    { fatloss: 1 },                                    // I've considered it but never started
    {},                                                // No, this is new to me
  ],

  // ─── CLUSTER 5: Readiness (Q20–Q22) ──────────────────────────────────────
  // Q20 is heavy aspect signal (top-2, cumulative).

  // Q20: If this works for you, what would feel different 6 months from now?  (top-2)
  [
    { fatloss: 1, confidence: 1 },                     // I'd want to be in photos again
    { fatloss: 1 },                                    // Getting dressed would feel easier
    { energy: 1 },                                     // Keeping up with kids or family
    { fatloss: 1 },                                    // A specific event coming up
    { metabolic: 2 },                                  // My next bloodwork or doctor's visit
    { confidence: 1, energy: 1 },                      // Feeling like myself again
    { energy: 2 },                                     // Energy that lasts past mid-afternoon
  ],

  // Q21: How important is it that your provider is a real licensed physician?
  [
    {},                                                // Critical
    {},                                                // Important
    {},                                                // Fast and easy matters more
    {},                                                // Whatever works
  ],

  // Q22: When would you ideally start?
  [
    { energy: 1 },                                     // This week
    { energy: 1 },                                     // This month
    {},                                                // In the next 1–3 months
    {},                                                // Just researching for now
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

export function calculateAspectScores(answers: (number | number[])[]): AspectScores {
  const aspects = initAspects();

  for (let i = 0; i < answers.length && i < scoreMaps.length; i++) {
    const answerVal = answers[i];
    const map = scoreMaps[i];
    const indices = Array.isArray(answerVal) ? answerVal : [answerVal];
    for (const answerIdx of indices) {
      if (answerIdx >= 0 && answerIdx < map.length) {
        const deltas = map[answerIdx];
        for (const [key, val] of Object.entries(deltas)) {
          aspects[key as AspectKey] += val as number;
        }
      }
    }
  }

  return aspects;
}

export function calculateMatches(answers: (number | number[])[]): MatchResult[] {
  const aspects = calculateAspectScores(answers);

  // Score each peptide
  const scored = peptideProfiles.map((peptide) => {
    let score = 0;
    for (const [aspect, weight] of Object.entries(peptide.weights)) {
      score += (aspects[aspect as AspectKey] ?? 0) * (weight as number);
    }
    return { peptide, score };
  });

  // Find max score for normalization
  const maxScore = Math.max(...scored.map((s) => s.score), 1);

  // Sort descending and compute match percent
  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ peptide, score }) => ({
      peptide,
      score,
      matchPercent: Math.round((score / maxScore) * 100),
    }));
}

/**
 * v3 QUIZ_INDEX — maps v3 question indices for downstream use.
 */
export const QUIZ_INDEX = {
  AGE_RANGE: 10,   // Q11 (0-indexed)
} as const;

/**
 * Hardcoded tier for v1 since determineTier was removed.
 * All GLP-1 quiz completions route to tier 2 (standard) by default.
 */
export function determineTier(_answers: number[]): 1 | 2 | 3 {
  return 2;
}

// ─── QUIZ QUESTIONS (22 total, v3 GLP-1) ─────────────────────────────────────

export const QUIZ_QUESTIONS = [
  // ── Cluster 1: Hook (Q1–Q4) ───────────────────────────────────────────────
  {
    section: "Hook",
    question: "What brought you here today?",
    options: [
      "I want to lose weight",
      "My relationship with food feels off",
      "My energy isn't what it used to be",
      "My body feels inflamed or puffy",
      "My metabolism just isn't working",
    ],
  },
  {
    section: "Hook",
    question: "How long have you been working on this?",
    options: [
      "Less than a year",
      "1–3 years",
      "3–10 years",
      "More than 10 years",
      "Honestly, my whole adult life",
    ],
  },
  {
    section: "Hook",
    question: "Which of these sounds most like you?",
    options: [
      "I lose weight, then it all comes back (and then some)",
      "I diet hard but my body fights me every time",
      "I eat reasonably and still can't lose",
      "I've tried so many things I've lost count",
      "I haven't really tried — but I'm ready now",
    ],
  },
  {
    section: "Hook",
    question: 'How loud is your food noise?',
    options: [
      "It's always there. I can't turn it off.",
      "Loud most days, especially afternoons and evenings",
      "Manageable but distracting",
      "Comes and goes",
      "Not really a thing for me",
    ],
  },

  // ── Cluster 2: Symptom mapping (Q5–Q10) ───────────────────────────────────
  {
    section: "Symptom Mapping",
    question: "How would you describe your energy day to day?",
    options: [
      "I crash by 2pm, every day",
      "Wired but tired \u2014 running on caffeine",
      "Mornings are decent, evenings are gone",
      "Inconsistent \u2014 good days and bad days",
      "Generally pretty good",
    ],
  },
  {
    section: "Symptom Mapping",
    question: "How's your sleep?",
    options: [
      "I sleep enough but I don't feel rested",
      "Trouble falling asleep",
      "Trouble staying asleep",
      "Generally pretty good",
      "Honestly, terrible",
    ],
  },
  {
    section: "Symptom Mapping",
    question: "Any of these going on \u2014 inflammation, joint pain, puffiness?",
    options: [
      "All of the above",
      "Mainly puffiness and bloating",
      "Mainly joint pain",
      "A bit of everything but manageable",
      "Not really",
    ],
  },
  {
    section: "Symptom Mapping",
    question: "Cravings \u2014 what's the pattern?",
    options: [
      "Sugar specifically",
      "Carbs \u2014 bread, pasta, the comfort stuff",
      "Salty, crunchy snacks",
      "Late-night snacking",
      "Not really a cravings issue",
    ],
  },
  {
    section: "Symptom Mapping",
    question: "Pick the line that hits hardest.",
    options: [
      '"I eat past full because the food is there."',
      '"I\'m hungry again 90 minutes later."',
      '"I can stop, but I never feel satisfied."',
      '"I eat normal portions \u2014 feeling full isn\'t the issue."',
      '"Honestly? None of these \u2014 I\'m fine here."',
    ],
  },
  {
    section: "Symptom Mapping",
    question: "How does stress affect your eating?",
    options: [
      "Stress eating is my whole problem",
      "It's a factor but not the main thing",
      "It hits sometimes",
      "Doesn't really affect me",
      "I lose my appetite when I'm stressed",
    ],
  },

  // ── Cluster 3: Personal context (Q11–Q15) ─────────────────────────────────
  {
    section: "Personal Context",
    question: "What's your age range?",
    options: [
      "Under 25",
      "25\u201334",
      "35\u201344",
      "45\u201354",
      "55+",
    ],
  },
  {
    section: "Personal Context",
    question: "What is your target weight loss range?",
    options: [
      "Less than 20 lbs",
      "20\u201350 lbs",
      "50\u2013100 lbs",
      "Greater than 100 lbs",
      "Body composition focus rather than scale",
    ],
  },
  {
    section: "Personal Context",
    question: "Where are you carrying the weight, mostly?",
    options: [
      "Belly and midsection",
      "Hips, thighs, legs",
      "Pretty evenly distributed",
      "It's shifted over the years",
      "Not sure / don't track this",
    ],
  },
  {
    section: "Personal Context",
    question: "What have you already tried?",
    options: [
      "Calorie counting or tracking",
      "Keto or low-carb",
      "Intermittent fasting",
      "Personal trainer or serious exercise program",
      "Other weight loss medications",
      "Weight loss surgery consultation",
      "Honestly, a lot of stuff",
    ],
  },
  {
    section: "Personal Context",
    question: "How would you characterize your current physical activity level?",
    options: [
      "Predominantly sedentary",
      "Light activity, unstructured",
      "Regular light activity",
      "Structured exercise, 2\u20134 sessions weekly",
      "High activity, daily training",
    ],
  },

  // ── Cluster 4: Medical screening (Q16–Q19) ────────────────────────────────
  {
    section: "Medical Screening",
    question: "Do you have any of these conditions?",
    options: [
      "Type 2 diabetes",
      "Pre-diabetes or insulin resistance",
      "High blood pressure",
      "High cholesterol",
      "PCOS",
      "Thyroid condition",
      "Sleep apnea",
      "None of these",
    ],
  },
  {
    section: "Medical Screening",
    question: "Are any of these true for you?",
    options: [
      "I'm currently pregnant or trying to conceive",
      "Personal or family history of medullary thyroid cancer",
      "History of pancreatitis",
      "Active gallbladder disease",
      "Severe gastrointestinal disorder",
      "None of these",
    ],
  },
  {
    section: "Medical Screening",
    question: "Are you currently taking any prescription medications?",
    options: [
      "Yes, for chronic conditions",
      "Yes, occasionally",
      "No",
      "Prefer not to say",
    ],
  },
  {
    section: "Medical Screening",
    question: "Have you ever taken a GLP-1 medication before? (Ozempic, Wegovy, Mounjaro, Zepbound, etc.)",
    options: [
      "Yes, and it worked well",
      "Yes, but I stopped for some reason",
      "I've considered it but never started",
      "No, this is new to me",
    ],
  },

  // ── Cluster 5: Readiness (Q20–Q22) ────────────────────────────────────────
  {
    section: "Readiness",
    question: "If this works for you, what would feel different 6 months from now?",
    options: [
      "I'd want to be in photos again",
      "Getting dressed would feel easier",
      "Keeping up with kids or family",
      "A specific event coming up",
      "My next bloodwork or doctor's visit",
      "Feeling like myself again",
      "Energy that lasts past mid-afternoon",
    ],
  },
  {
    section: "Readiness",
    question: "How important is it that your provider is a real licensed physician?",
    options: [
      "Critical \u2014 this is medical, I want a real doctor",
      "Important, but I value convenience too",
      "Honestly, fast and easy matters more",
      "Whatever works",
    ],
  },
  {
    section: "Readiness",
    question: "When would you ideally start?",
    options: [
      "This week",
      "This month",
      "In the next 1\u20133 months",
      "Just researching for now",
    ],
  },
];
