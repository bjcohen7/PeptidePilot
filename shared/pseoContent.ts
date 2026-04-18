export type PseoContentBlock = {
  heading: string;
  body: string;
};

export type PseoFaq = {
  question: string;
  answer: string;
};

export type PseoScore = {
  label: string;
  value: number;
  note: string;
};

export type PseoContentRecord = {
  path: string;
  summary: string;
  keyPoints: string[];
  blocks: PseoContentBlock[];
  scorecard?: PseoScore[];
  decisionChecklist?: string[];
  faqs?: PseoFaq[];
};

export const pseoContentRecords: Record<string, PseoContentRecord> = {
  "/compare/semaglutide-vs-tirzepatide": {
    path: "/compare/semaglutide-vs-tirzepatide",
    summary:
      "Semaglutide and tirzepatide are both incretin-based medications used in metabolic care, but they do not work identically and they should not be treated as interchangeable shortcuts. The most practical differences usually come down to receptor activity, expected weight-loss response, side-effect profile, cost, and the quality of medical follow-up.",
    keyPoints: [
      "Semaglutide is a GLP-1 receptor agonist, while tirzepatide targets both GIP and GLP-1 receptors.",
      "Tirzepatide is often discussed for stronger average weight-loss outcomes, but tolerability, access, and supervision still matter more than headline numbers alone.",
      "A responsible comparison looks at screening, dose escalation, contraindications, and follow-up support, not just before-and-after stories.",
    ],
    scorecard: [
      { label: "Evidence", value: 9, note: "Strong clinical use and outcome data" },
      { label: "Goal fit", value: 9, note: "Highly relevant for metabolic and weight-loss research" },
      { label: "Complexity", value: 6, note: "Requires screening, titration, and follow-up" },
      { label: "Caution", value: 7, note: "Important contraindication and side-effect review" },
    ],
    blocks: [
      {
        heading: "Mechanism difference",
        body:
          "Semaglutide works through GLP-1 signaling. Tirzepatide adds GIP receptor activity on top of GLP-1 activity, which is one reason it is often discussed as a distinct option rather than just a newer version of semaglutide.",
      },
      {
        heading: "Who asks this question",
        body:
          "People usually compare semaglutide and tirzepatide when they want appetite control, weight reduction, improved metabolic markers, or a change after plateauing on another plan. The right answer depends on clinician screening, cost, insurance, history of side effects, and whether someone is treating diabetes, obesity, or another metabolic condition.",
      },
      {
        heading: "What a good provider should explain",
        body:
          "A strong clinical program should explain dose escalation, expected gastrointestinal side effects, red-flag symptoms, medication sourcing, refill timing, and when a patient should stop and contact a clinician. Those practical details matter as much as the medication name.",
      },
    ],
    decisionChecklist: [
      "Clarify whether you are comparing branded prescriptions, compounded care, or unsafe gray-market sourcing.",
      "Ask how dose titration is handled and what happens if side effects appear.",
      "Verify who reviews contraindications such as pancreatitis history, gallbladder disease, or complex medication interactions.",
      "Compare the total monthly cost, not just the teaser price.",
    ],
    faqs: [
      {
        question: "Is tirzepatide always better than semaglutide?",
        answer:
          "Not automatically. Average outcome data can look stronger in some contexts, but real-world fit depends on side effects, access, cost, clinician support, and the user's health history.",
      },
      {
        question: "Are these research peptides?",
        answer:
          "No. These are clinically used metabolic medications and should not be framed the same way as gray-market research compounds.",
      },
    ],
  },
  "/goals/fat-loss": {
    path: "/goals/fat-loss",
    summary:
      "Fat-loss peptide research usually splits into very different buckets: clinically established incretin medications, recovery or mitochondrial research compounds, and growth-hormone related pathways. Those categories should not be flattened into the same promise because they carry different evidence levels, legal status, and safety questions.",
    keyPoints: [
      "GLP-1 and dual incretin therapies are the most clinically established category for appetite and weight management.",
      "Research compounds like MOTS-c or AOD-9604 are discussed differently from prescription metabolic drugs and should be framed accordingly.",
      "Sustainable fat loss still depends on nutrition, resistance training, sleep, and medical screening.",
    ],
    scorecard: [
      { label: "Evidence", value: 8, note: "Mixed by category, strongest around incretin therapies" },
      { label: "Goal fit", value: 9, note: "Very high interest and broad practical relevance" },
      { label: "Complexity", value: 7, note: "Source type and mechanism change the decision" },
      { label: "Caution", value: 7, note: "Medical context and sourcing quality matter" },
    ],
    blocks: [
      {
        heading: "Common categories",
        body:
          "Users researching fat loss usually encounter semaglutide, tirzepatide, MOTS-c, AOD-9604, Tesamorelin, and growth-hormone secretagogues. Those names live in very different evidence tiers, which means the safest next step is not simply choosing the most exciting one.",
      },
      {
        heading: "What actually changes the decision",
        body:
          "The important distinctions are whether a person needs appetite regulation, glycemic support, body-composition improvement, visceral-fat reduction, or better recovery so they can train consistently. The right framework is more specific than simply 'burn fat.'",
      },
      {
        heading: "Sourcing and supervision",
        body:
          "The biggest mistakes usually happen when people treat prescription care, compounded medication, and research-only compounds as if they are interchangeable. Provider quality, medication sourcing, injection safety, and monitoring all need to be evaluated separately.",
      },
    ],
    decisionChecklist: [
      "Decide whether you are evaluating prescription care, compounded care, or research-only compounds.",
      "Match the goal to the mechanism: appetite, glycemic control, visceral fat, or training recovery.",
      "Ask what monitoring is available if side effects or plateaus show up.",
      "Avoid any source that promises dramatic results without screening or follow-up.",
    ],
    faqs: [
      {
        question: "Are fat-loss peptides enough by themselves?",
        answer:
          "No. Even clinically established therapies work best alongside nutrition, resistance training, sleep, and medical oversight.",
      },
      {
        question: "Is every peptide discussed for fat loss medically approved?",
        answer:
          "No. Many compounds in fat-loss discussions are still research-focused or appear in gray-market conversations rather than established prescription care.",
      },
    ],
  },
  "/peptides/bpc-157": {
    path: "/peptides/bpc-157",
    summary:
      "BPC-157 is one of the most searched recovery peptides, usually discussed around tendon, ligament, joint, soft-tissue, and gut support. The interest is strong, but human evidence remains limited, which means the safety conversation has to be more careful than the marketing conversation.",
    keyPoints: [
      "Most BPC-157 discussion is based on preclinical and anecdotal evidence rather than large human trials.",
      "The most common research themes are musculoskeletal recovery and gut barrier support.",
      "Source quality, sterility, and clinical judgment matter because regulatory status is unsettled and gray-market sourcing is common.",
    ],
    scorecard: [
      { label: "Evidence", value: 4, note: "Strong interest, limited human evidence" },
      { label: "Goal fit", value: 8, note: "Frequently researched for recovery and tissue support" },
      { label: "Complexity", value: 7, note: "Handling and sourcing quality change the risk" },
      { label: "Caution", value: 8, note: "Gray-market quality issues deserve real skepticism" },
    ],
    blocks: [
      {
        heading: "Why people research it",
        body:
          "BPC-157 shows up in conversations about tendon pain, ligament strain, post-training recovery, joint irritation, and gut support. The appeal comes from preclinical studies and strong anecdotal momentum rather than the kind of large clinical evidence people might assume from how confidently it is marketed online.",
      },
      {
        heading: "Where caution belongs",
        body:
          "The main question is not whether BPC-157 sounds promising. The harder question is whether the source is sterile, whether the product is what it claims to be, and whether someone understands the limits of the evidence before considering injections or self-experimentation.",
      },
      {
        heading: "How to evaluate a provider",
        body:
          "A decent provider or vendor page should be clear about sourcing, testing, sterility expectations, and what is known versus speculative. Pages that imply clinical certainty without acknowledging evidence limits deserve more skepticism, not less.",
      },
    ],
    decisionChecklist: [
      "Separate preclinical promise from proven human benefit.",
      "Verify whether the source provides real testing and appropriate sterile handling information.",
      "Be wary of aggressive claims around injury healing timelines.",
      "Discuss injection, recovery, and orthopedic questions with a clinician when pain or structural injury is involved.",
    ],
    faqs: [
      {
        question: "Is BPC-157 approved as a standard prescription therapy?",
        answer:
          "It is not generally positioned like mainstream approved medications. That is part of why sourcing and evidence quality matter so much in this space.",
      },
      {
        question: "Why is BPC-157 so popular despite limited human data?",
        answer:
          "Because recovery stories spread quickly and people with stubborn injuries are often willing to explore compounds that sound promising before the evidence is fully mature.",
      },
    ],
  },
  "/guides/how-to-reconstitute-peptides": {
    path: "/guides/how-to-reconstitute-peptides",
    summary:
      "Reconstitution is the process of turning a lyophilized peptide vial into a measurable liquid solution. The two big risks are contamination and dosing math errors, which is why sterile technique and concentration math matter more than internet shortcuts.",
    keyPoints: [
      "Use sterile supplies and avoid touching sterile surfaces.",
      "Confirm the vial amount, diluent volume, and intended concentration before mixing anything.",
      "Do not use cloudy, contaminated, expired, or questionable material.",
    ],
    scorecard: [
      { label: "Clarity", value: 9, note: "Core concepts are teachable and repeatable" },
      { label: "Practical value", value: 9, note: "High-value page for real user mistakes" },
      { label: "Complexity", value: 8, note: "Math and sterile handling both matter" },
      { label: "Caution", value: 9, note: "Dosing and contamination mistakes can snowball fast" },
    ],
    blocks: [
      {
        heading: "Core concept",
        body:
          "Reconstitution changes a dry vial into a liquid concentration that can be measured. Dose volume depends on both how much peptide is in the vial and how much diluent was added. People get into trouble when they copy someone else's injection volume without matching the same concentration.",
      },
      {
        heading: "Common error pattern",
        body:
          "The most common mistakes are using the wrong vial strength, misreading syringe units, reusing supplies incorrectly, or assuming every peptide is reconstituted the same way. Those are practical errors, not theoretical ones, and they can change dosing dramatically.",
      },
      {
        heading: "When to stop",
        body:
          "If the vial looks contaminated, the storage history is unclear, or the math does not make sense, stop and re-check everything. Uncertainty is a reason to pause, not a reason to guess.",
      },
    ],
    decisionChecklist: [
      "Write down the vial strength and planned diluent volume before mixing.",
      "Check whether the resulting concentration matches the dose you think you are taking.",
      "Use clean technique and do not touch sterile surfaces.",
      "Do not rely on screenshot math from strangers if your vial size or dilution volume differs.",
    ],
    faqs: [
      {
        question: "Why do people mis-dose peptides after reconstitution?",
        answer:
          "Usually because they copy syringe-unit instructions from another person without matching the same vial size, diluent volume, or target concentration.",
      },
      {
        question: "Does every peptide use the same reconstitution approach?",
        answer:
          "No. The math and handling depend on the vial strength, the intended concentration, the diluent used, and the route of administration under clinician guidance.",
      },
    ],
  },
  "/reviews/semaglutide-review": {
    path: "/reviews/semaglutide-review",
    summary:
      "Semaglutide is a clinically established GLP-1 medication used in diabetes and weight-management care, but the experience someone gets still depends heavily on the provider, medication sourcing, screening, side-effect support, and pricing clarity. A real review should focus on the care model, not just the molecule.",
    keyPoints: [
      "Semaglutide has substantial clinical evidence for metabolic outcomes.",
      "The biggest review questions are provider quality, sourcing transparency, and side-effect support.",
      "A serious review separates branded prescription care, compounded care, and unsafe or unverifiable sourcing.",
    ],
    scorecard: [
      { label: "Evidence", value: 9, note: "Substantial clinical backing in metabolic care" },
      { label: "Provider fit", value: 8, note: "Program quality changes the real experience" },
      { label: "Complexity", value: 6, note: "Straightforward concept, but not plug-and-play" },
      { label: "Caution", value: 7, note: "Screening and sourcing still need scrutiny" },
    ],
    blocks: [
      {
        heading: "What semaglutide does",
        body:
          "Semaglutide mimics GLP-1 signaling, which can affect appetite, satiety, gastric emptying, and glucose regulation. That is why it belongs in a medication-and-provider review context rather than a generic peptide hype context.",
      },
      {
        heading: "How to review a provider",
        body:
          "A good semaglutide program should explain screening, refill reliability, dose escalation, side-effect protocols, medication sourcing, clinician access, and total cost. Reviews that focus only on convenience or dramatic outcomes miss the actual operating risks.",
      },
      {
        heading: "What to be skeptical of",
        body:
          "Be careful with offers that hide refill pricing, imply that everyone qualifies, skip meaningful screening, or blur the difference between licensed care and loosely sourced products. The care model matters as much as the product name.",
      },
    ],
    decisionChecklist: [
      "Verify who is prescribing and what screening happens before treatment.",
      "Ask whether the medication is branded, compounded, or sourced another way.",
      "Check how side effects, refills, and follow-up questions are handled.",
      "Compare the full ongoing monthly cost, not just the first-month headline.",
    ],
    faqs: [
      {
        question: "Is semaglutide the same kind of thing as a research peptide?",
        answer:
          "No. It belongs in the category of clinically used metabolic medication and should be evaluated through a medical-care lens.",
      },
      {
        question: "What makes one semaglutide provider better than another?",
        answer:
          "Screening quality, sourcing transparency, follow-up access, side-effect support, and pricing clarity are usually the deciding factors.",
      },
    ],
  },
};

export function getPseoContent(path: string) {
  return pseoContentRecords[path];
}
