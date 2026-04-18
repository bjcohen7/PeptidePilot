import {
  comparisonPages,
  forConditionPages,
  goalPages,
  guidePages,
  peptidePages,
  reviewPages,
  stackPages,
} from "./pseoData";

export type PseoSectionKey =
  | "peptides"
  | "goals"
  | "compare"
  | "stacks"
  | "guides"
  | "for"
  | "reviews";

export type PseoEntry = {
  slug: string;
  path: string;
  title: string;
};

export type PseoSection = {
  key: PseoSectionKey;
  label: string;
  path: string;
  description: string;
  entries: PseoEntry[];
};

function toEntry(slug: string, path: string, title: string): PseoEntry {
  return { slug, path, title };
}

export const pseoSections: PseoSection[] = [
  {
    key: "peptides",
    label: "Peptide Library",
    path: "/peptides",
    description: "Profiles for 12+ research peptides.",
    entries: peptidePages.map((page) => toEntry(page.slug, `/peptides/${page.slug}`, page.name)),
  },
  {
    key: "goals",
    label: "Goals",
    path: "/goals",
    description: "Find peptides by health goal.",
    entries: goalPages.map((page) => toEntry(page.slug, `/goals/${page.slug}`, page.title)),
  },
  {
    key: "compare",
    label: "Compare",
    path: "/compare",
    description: "Head-to-head peptide comparisons.",
    entries: comparisonPages.map((page) =>
      toEntry(page.slug, `/compare/${page.slug}`, `${page.peptideA} vs ${page.peptideB}`),
    ),
  },
  {
    key: "stacks",
    label: "Stacks",
    path: "/stacks",
    description: "Curated peptide protocols.",
    entries: stackPages.map((page) => toEntry(page.slug, `/stacks/${page.slug}`, page.name)),
  },
  {
    key: "guides",
    label: "Guides",
    path: "/guides",
    description: "How-to dosing and injection guides.",
    entries: guidePages.map((page) => toEntry(page.slug, `/guides/${page.slug}`, page.title)),
  },
  {
    key: "for",
    label: "For",
    path: "/for",
    description: "Find peptides by condition or concern.",
    entries: forConditionPages.map((page) => toEntry(page.slug, `/for/${page.slug}`, page.condition)),
  },
  {
    key: "reviews",
    label: "Reviews",
    path: "/reviews",
    description: "Independent peptide reviews.",
    entries: reviewPages.map((page) => toEntry(page.slug, `/reviews/${page.slug}`, page.h1)),
  },
];

export const pseoEntries = pseoSections.flatMap((section) =>
  section.entries.map((entry) => ({ ...entry, sectionKey: section.key })),
);

export function getPseoSection(key: string): PseoSection | undefined {
  return pseoSections.find((section) => section.key === key);
}

export function getPseoEntry(
  sectionKey: string,
  slug: string,
): { section: PseoSection; entry: PseoEntry } | undefined {
  const section = getPseoSection(sectionKey);
  const entry = section?.entries.find((candidate) => candidate.slug === slug);
  return section && entry ? { section, entry } : undefined;
}
