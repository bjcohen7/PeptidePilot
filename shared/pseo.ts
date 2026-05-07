import { pseoSections } from "./pseoIndex.generated";

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

export { pseoSections };

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
