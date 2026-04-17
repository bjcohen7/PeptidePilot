export type AffiliatePartnerStatus = "active" | "draft" | "paused";

export type AffiliatePartnerSeed = {
  id: string;
  name: string;
  category: string;
  status: AffiliatePartnerStatus;
  primaryUrl: string;
  notes: string;
};

export const affiliatePartnerSeeds: AffiliatePartnerSeed[] = [
  {
    id: "peptide-sciences",
    name: "Peptide Sciences",
    category: "Research peptides",
    status: "active",
    primaryUrl: "https://www.peptidesciences.com",
    notes: "Legacy vendor link used across peptide result cards.",
  },
  {
    id: "core-peptides",
    name: "Core Peptides",
    category: "Research peptides",
    status: "active",
    primaryUrl: "https://corepeptides.com",
    notes: "Legacy vendor link used across recovery-oriented result cards.",
  },
  {
    id: "hone-health",
    name: "Hone Health",
    category: "Telehealth",
    status: "active",
    primaryUrl: "https://honehealth.com",
    notes: "Telehealth partner candidate for hormone and GLP-1 intent.",
  },
  {
    id: "lifemd",
    name: "LifeMD",
    category: "Telehealth",
    status: "active",
    primaryUrl: "https://www.lifemd.com",
    notes: "Telehealth partner candidate for GLP-1 intent.",
  },
];

