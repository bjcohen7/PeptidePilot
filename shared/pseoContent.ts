export type PseoContentBlock = {
  heading: string;
  body: string;
};

export type PseoContentRecord = {
  path: string;
  summary: string;
  keyPoints: string[];
  blocks: PseoContentBlock[];
};

export const pseoContentRecords: Record<string, PseoContentRecord> = {
  "/compare/semaglutide-vs-tirzepatide": {
    path: "/compare/semaglutide-vs-tirzepatide",
    summary:
      "Semaglutide and tirzepatide are both incretin-based medications used in metabolic care, but they work through different receptor patterns and can create different expectations around appetite, weight loss, tolerability, and clinical supervision.",
    keyPoints: [
      "Semaglutide is a GLP-1 receptor agonist.",
      "Tirzepatide targets both GIP and GLP-1 receptors.",
      "Both require clinician oversight, especially for people with diabetes, gallbladder history, or complex medication profiles.",
    ],
    blocks: [
      {
        heading: "Main difference",
        body:
          "Semaglutide acts primarily through GLP-1 signaling, while tirzepatide adds GIP activity. That dual mechanism is one reason tirzepatide is often discussed separately in weight-management conversations.",
      },
      {
        heading: "Decision context",
        body:
          "The right comparison is not only total weight-loss potential. Cost, access, side effects, contraindications, current medications, and follow-up care all matter.",
      },
    ],
  },
  "/goals/fat-loss": {
    path: "/goals/fat-loss",
    summary:
      "Fat-loss peptide research usually clusters around appetite regulation, metabolic signaling, growth hormone pathways, and recovery support. The best-fit direction depends on the user's health status and clinical context.",
    keyPoints: [
      "GLP-1 and dual incretin therapies are the most clinically established category for appetite and weight management.",
      "Research peptides such as AOD-9604 and MOTS-c are discussed differently from prescription metabolic drugs.",
      "Sustainable fat loss still depends on nutrition, resistance training, sleep, and medical screening.",
    ],
    blocks: [
      {
        heading: "Commonly discussed options",
        body:
          "Semaglutide, tirzepatide, MOTS-c, AOD-9604, and growth-hormone secretagogues appear often in fat-loss research conversations, but they do not share the same evidence level or regulatory status.",
      },
      {
        heading: "What to verify",
        body:
          "Users should verify whether they are considering a prescription medication, compounded medication, or research compound. Those categories carry very different safety, legal, and sourcing questions.",
      },
    ],
  },
  "/peptides/bpc-157": {
    path: "/peptides/bpc-157",
    summary:
      "BPC-157 is one of the most searched recovery peptides, commonly discussed for soft-tissue repair, tendon and ligament issues, joint discomfort, and gut health. Human evidence remains limited.",
    keyPoints: [
      "Most BPC-157 discussion is based on preclinical and anecdotal evidence.",
      "It is commonly researched around musculoskeletal recovery and gut barrier support.",
      "Sourcing quality and clinician guidance are especially important because regulatory status varies.",
    ],
    blocks: [
      {
        heading: "Why people research it",
        body:
          "BPC-157 is often connected with tendon, ligament, joint, and gut-healing conversations because preclinical work suggests effects on tissue repair pathways.",
      },
      {
        heading: "Safety frame",
        body:
          "The main concern is not just whether BPC-157 sounds promising. Users need to understand source quality, sterility, route of administration, and the lack of large human clinical trials.",
      },
    ],
  },
  "/guides/how-to-reconstitute-peptides": {
    path: "/guides/how-to-reconstitute-peptides",
    summary:
      "Reconstitution is the process of adding bacteriostatic water or another appropriate diluent to a lyophilized peptide vial. It should be handled with sterile technique and clinical guidance.",
    keyPoints: [
      "Use sterile supplies and avoid touching sterile surfaces.",
      "Confirm the vial amount, diluent volume, and intended concentration before mixing.",
      "Do not use cloudy, contaminated, expired, or questionable material.",
    ],
    blocks: [
      {
        heading: "Core concept",
        body:
          "Reconstitution changes a dry vial into a measurable liquid concentration. The math matters because dose volume depends on how much diluent was added.",
      },
      {
        heading: "Common mistake",
        body:
          "People often copy a dose volume from someone else without matching vial size and diluent volume. That can create large dosing errors.",
      },
    ],
  },
  "/reviews/semaglutide-review": {
    path: "/reviews/semaglutide-review",
    summary:
      "Semaglutide is a clinically established GLP-1 medication used in diabetes and weight-management care under branded and compounded contexts. It is not the same category as a gray-market research peptide.",
    keyPoints: [
      "Semaglutide has substantial clinical evidence for metabolic outcomes.",
      "Side effects and contraindications should be reviewed with a clinician.",
      "The biggest consumer distinction is branded prescription, compounded care, or unsafe/unverified sourcing.",
    ],
    blocks: [
      {
        heading: "What it does",
        body:
          "Semaglutide mimics GLP-1 signaling, which can affect appetite, satiety, glucose regulation, and gastric emptying.",
      },
      {
        heading: "Review lens",
        body:
          "A good semaglutide provider review should look at medical screening, follow-up care, pricing clarity, medication sourcing, side-effect support, and refill reliability.",
      },
    ],
  },
};

export function getPseoContent(path: string) {
  return pseoContentRecords[path];
}

