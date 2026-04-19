/**
 * PeptidePilot Scoring Engine
 * 20-question quiz (2–3 per section × 8 sections).
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
  // ─── SECTION 1: Goals & Priorities ───────────────────────────────────────

  // Q1: What is your single most important health goal right now?
  [
    { muscle: 2, energy: 1 },                          // Build muscle and increase strength
    { fatloss: 2, metabolic: 1 },                      // Lose body fat and improve body composition
    { energy: 2, cognitive: 1, focus: 1 },             // Boost daily energy and mental clarity
    { antiaging: 2, longevity: 2 },                    // Slow aging and optimize longevity
    { sleep: 2, recovery: 1 },                         // Improve sleep quality and depth
    { injury: 2, healing: 2, joints: 1 },              // Heal an injury or chronic pain
    { libido: 2, hormone: 1, confidence: 1 },          // Enhance libido and sexual vitality
    { recovery: 2, inflammation: 1 },                  // Speed up recovery and reduce soreness
  ],

  // Q2: If you could change one thing about how your body feels day-to-day?
  [
    { energy: 2 },                                     // More energy from morning to night
    { joints: 1, inflammation: 1, injury: 1 },         // Less pain or physical discomfort
    { cognitive: 2, focus: 2 },                        // Sharper focus and mental performance
    { mood: 2, anxiety: 1 },                           // Better mood and emotional balance
    { antiaging: 2, longevity: 1 },                    // Feeling younger and more vital
    { sleep: 2 },                                      // Deeper, more restorative sleep
    { confidence: 2, hormone: 1 },                     // Greater confidence in my body
    { muscle: 1, fatloss: 1, recovery: 1 },            // Faster physical results from my efforts
  ],

  // ─── SECTION 2: Body & Fitness ───────────────────────────────────────────

  // Q3: How would you describe your current activity level?
  [
    { fatloss: 1, metabolic: 1 },                      // Sedentary
    { energy: 1, fatloss: 1 },                         // Lightly active
    { muscle: 1, recovery: 1 },                        // Moderately active
    { muscle: 2, recovery: 2, endurance: 1 },          // Very active
    { muscle: 2, recovery: 2, endurance: 2 },          // Competitive athlete
  ],

  // Q4: How would you describe your current body composition?
  [
    { muscle: 1, recovery: 1 },                        // Lean and muscular
    { fatloss: 1, muscle: 1 },                         // Average build
    { fatloss: 2, metabolic: 2, appetite: 1 },         // Carrying extra body fat
    { muscle: 2 },                                     // Underweight or struggling to gain
    { recovery: 2, injury: 2, healing: 1 },            // Post-injury or post-illness
  ],

  // Q5: How often do you experience muscle soreness or delayed recovery?
  [
    {},                                                // Rarely — recover quickly
    { recovery: 1 },                                   // Sometimes — usually fine
    { recovery: 2, inflammation: 1 },                  // Often — soreness lasts 2–3 days
    { recovery: 3, inflammation: 2, injury: 1 },       // Almost always — major limiting factor
  ],

  // ─── SECTION 3: Age & Hormones ───────────────────────────────────────────

  // Q6: What is your age range?
  [
    {},                                                // 18–25
    { hormone: 1 },                                    // 26–35
    { antiaging: 1, hormone: 1 },                      // 36–45
    { antiaging: 2, hormone: 2, longevity: 1 },        // 46–55
    { antiaging: 2, hormone: 2, longevity: 2 },        // 56–65
    { antiaging: 3, hormone: 2, longevity: 3 },        // 65+
  ],

  // Q7: Do you have any known hormonal imbalances?
  [
    {},                                                // No — levels normal
    { hormone: 1 },                                    // Possibly — symptoms but untested
    { hormone: 3, libido: 1 },                         // Yes — low testosterone or estrogen
    { hormone: 2, metabolic: 1 },                      // Yes — thyroid or other
    { hormone: 2 },                                    // Currently on HRT or TRT
  ],

  // Q8: How is your libido compared to where you'd like it to be?
  [
    {},                                                // Great — no concerns
    { libido: 1 },                                     // Slightly lower
    { libido: 2, hormone: 1, mood: 1 },                // Noticeably reduced — bothers me
    { libido: 3, hormone: 2, confidence: 1 },          // Very low — priority issue
    {},                                                // Prefer not to say
  ],

  // ─── SECTION 4: Sleep & Recovery ─────────────────────────────────────────

  // Q9: How would you rate your overall sleep quality?
  [
    {},                                                // Excellent
    { sleep: 1 },                                      // Good — mostly fine
    { sleep: 2, energy: 1 },                           // Fair — often tired
    { sleep: 3, energy: 2, recovery: 1 },              // Poor — struggle to fall/stay asleep
    { sleep: 3, energy: 2, recovery: 2, anxiety: 1 }, // Very poor — significant daily problem
  ],

  // Q10: Do you wake up feeling rested and ready for the day?
  [
    {},                                                // Yes — almost every morning
    { sleep: 1 },                                      // Usually — most days fine
    { sleep: 2, energy: 2 },                           // Rarely — almost always groggy
    { sleep: 3, energy: 3, recovery: 1 },              // Never — fatigue constant
  ],

  // ─── SECTION 5: Pain & Injury ─────────────────────────────────────────────

  // Q11: Do you currently have any joint, tendon, or ligament pain?
  [
    {},                                                // No — completely pain free
    { joints: 1, inflammation: 1 },                    // Minor occasional discomfort
    { joints: 2, inflammation: 2, recovery: 1 },       // Moderate — affects training
    { joints: 3, inflammation: 2, injury: 2 },         // Significant — recurring and limiting
    { injury: 3, joints: 2, healing: 2 },              // Currently recovering from specific injury
  ],

  // Q12: Do you experience gut issues such as IBS, leaky gut, or digestive discomfort?
  [
    {},                                                // No gut issues
    { gut: 1, inflammation: 1 },                       // Mild occasional bloating
    { gut: 2, inflammation: 2 },                       // Moderate — regular digestive issues
    { gut: 3, inflammation: 2, healing: 1 },           // Significant — major concern
    { gut: 3, inflammation: 3, healing: 2 },           // Diagnosed gut condition
  ],

  // ─── SECTION 6: Cognition & Mood ─────────────────────────────────────────

  // Q13: How would you rate your day-to-day mental clarity and focus?
  [
    {},                                                // Sharp — focused and clear
    { cognitive: 1, focus: 1 },                        // Average — manageable with some fog
    { cognitive: 2, focus: 2, neuroprotection: 1 },    // Below average — struggle
    { cognitive: 3, focus: 3, neuroprotection: 2 },    // Poor — significantly impacts life
  ],

  // Q14: Do you experience anxiety, chronic stress, or difficulty managing emotions?
  [
    {},                                                // No — generally calm
    { anxiety: 1, mood: 1 },                           // Mild anxiety or stress occasionally
    { anxiety: 2, mood: 2, neuroprotection: 1 },       // Moderate — regular issue
    { anxiety: 3, mood: 2, neuroprotection: 2 },       // Significant — impacts quality of life
  ],

  // ─── SECTION 7: Skin, Hair & Appearance ──────────────────────────────────

  // Q15: How would you describe your current skin condition?
  [
    {},                                                // Great — healthy and youthful
    { skin: 1, collagen: 1 },                          // Minor concerns — fine lines
    { skin: 2, collagen: 2, antiaging: 1 },            // Moderate concerns — visible aging
    { skin: 3, collagen: 2, antiaging: 2 },            // Significant — skin health priority
  ],

  // Q16: Are you experiencing hair thinning or hair loss?
  [
    {},                                                // No — full and healthy
    { hair: 1 },                                       // Slight thinning noticed
    { hair: 2, hormone: 1 },                           // Moderate thinning — bothers me
    { hair: 3, hormone: 2 },                           // Significant hair loss — major concern
    { hair: 2, hormone: 1 },                           // Already using treatments
  ],

  // ─── SECTION 8: Lifestyle & Preferences ──────────────────────────────────

  // Q17: How experienced are you with peptides or biohacking?
  [
    {},                                                // Complete beginner
    { cognitive: 1 },                                  // Familiar — researched but not used
    { muscle: 1, recovery: 1 },                        // Intermediate — used some
    { muscle: 1, recovery: 1, longevity: 1 },          // Advanced — active protocols
  ],

  // Q18: What is your monthly budget for peptide supplementation?
  [
    {},                                                // Under $50
    { fatloss: 1, energy: 1 },                         // $50–$100
    { muscle: 1, recovery: 1, hormone: 1 },            // $100–$200
    { hormone: 2, antiaging: 1, longevity: 1 },        // $200–$500
    { hormone: 2, antiaging: 2, longevity: 2 },        // $500 or more
  ],

  // Q19: Do you currently work with a doctor or health coach?
  [
    { hormone: 1, longevity: 1 },                      // Yes — professional medical guidance
    {},                                                // Sometimes — consult occasionally
    {},                                                // No — self-direct protocols
    {},                                                // No — but would like to find one
  ],

  // Q20: What outcome would make this quiz feel like a total success?
  [
    { fatloss: 2, metabolic: 1 },                      // Visible body composition changes
    { muscle: 2, recovery: 2 },                        // Feeling stronger and recovering faster
    { skin: 2, antiaging: 2, collagen: 1 },            // Looking noticeably younger
    { cognitive: 2, anxiety: 1, focus: 2 },            // Thinking more clearly with less stress
    { sleep: 2, energy: 2 },                           // Sleeping better with sustained energy
    { injury: 2, healing: 2, joints: 1 },              // Healing injury or resolving chronic pain
    { confidence: 2, hormone: 1, energy: 1 },          // Feeling more confident and vital
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
    weights: { fatloss: 3, metabolic: 3, appetite: 3, energy: 1, inflammation: 1 },
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
 * Determine lead tier based on 20-question quiz answers.
 * Q6 (index 5) = age range
 * Q7 (index 6) = hormonal imbalances
 * Q8 (index 7) = libido
 * Q18 (index 17) = budget
 */
export function determineTier(answers: number[]): 1 | 2 | 3 {
  const ageIdx = answers[5] ?? -1;          // Q6: age range
  const isOlderAge = ageIdx >= 3;           // 46-55, 56-65, 65+

  const hormoneIdx = answers[6] ?? -1;      // Q7: hormonal issues
  const hasHormonalIssues = hormoneIdx >= 2;

  const libidoIdx = answers[7] ?? -1;       // Q8: libido
  const hasLowLibido = libidoIdx >= 2;

  const budgetIdx = answers[17] ?? -1;      // Q18: budget
  const isPremiumBudget = budgetIdx >= 3;   // $200+
  const isStandardBudget = budgetIdx >= 1;  // $50+

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

// ─── QUIZ QUESTIONS (20 total, 2–3 per section) ───────────────────────────────

export const QUIZ_QUESTIONS = [
  // ── Section 1: Goals & Priorities ──────────────────────────────────────────
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

  // ── Section 2: Body & Fitness ───────────────────────────────────────────────
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

  // ── Section 3: Age & Hormones ───────────────────────────────────────────────
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

  // ── Section 4: Sleep & Recovery ─────────────────────────────────────────────
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

  // ── Section 5: Pain & Injury ────────────────────────────────────────────────
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

  // ── Section 6: Cognition & Mood ─────────────────────────────────────────────
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

  // ── Section 7: Skin, Hair & Appearance ──────────────────────────────────────
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

  // ── Section 8: Lifestyle & Preferences ──────────────────────────────────────
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
