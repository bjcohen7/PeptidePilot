import { Link } from "wouter";
import { ArrowRight, CheckCircle2, FlaskConical, ShieldAlert, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { getPseoEntry, getPseoSection, pseoSections, type PseoSectionKey } from "@/data/pseo";
import { getPseoContent } from "../../../shared/pseoContent";
import { peptideProfiles } from "../../../shared/scoring";

const SECTION_COPY: Record<
  PseoSectionKey,
  { eyebrow: string; headline: string; body: string; detailIntro: string }
> = {
  peptides: {
    eyebrow: "Peptide Library",
    headline: "Research peptide profiles",
    body: "Browse independent profiles for commonly researched peptides and related compounds. Each page is designed as an educational starting point, not medical advice.",
    detailIntro: "Review the research context, common discussion points, and safety considerations for this compound.",
  },
  goals: {
    eyebrow: "Goals",
    headline: "Find peptides by goal",
    body: "Explore goal-based research pages for recovery, metabolic health, sleep, cognition, skin, longevity, and performance.",
    detailIntro: "This goal page frames the compounds most often discussed for this outcome and explains what to verify before making decisions.",
  },
  compare: {
    eyebrow: "Compare",
    headline: "Head-to-head comparisons",
    body: "Compare peptides, GLP-1 medications, nootropics, and related compounds by research context, use case, and practical considerations.",
    detailIntro: "This comparison is built to clarify the difference between two commonly searched options.",
  },
  stacks: {
    eyebrow: "Stacks",
    headline: "Curated protocol concepts",
    body: "Review stack concepts by outcome area. These pages are educational and should be discussed with a qualified clinician before use.",
    detailIntro: "This stack page explains why these compounds are often discussed together and which safety questions matter most.",
  },
  guides: {
    eyebrow: "Guides",
    headline: "How-to peptide guides",
    body: "Practical education for safer research: storage, reconstitution, COA review, vendor evaluation, and protocol planning.",
    detailIntro: "This guide focuses on the key decisions, risks, and research terms people should understand first.",
  },
  for: {
    eyebrow: "For",
    headline: "Condition-focused research pages",
    body: "Explore symptom and condition intent pages that map common search needs to evidence-aware peptide education.",
    detailIntro: "This page reviews the research themes people commonly explore for this concern.",
  },
  reviews: {
    eyebrow: "Reviews",
    headline: "Independent review pages",
    body: "Read review-style pages that summarize the evidence, typical claims, and decision points around specific compounds.",
    detailIntro: "This review page separates common claims from the questions that deserve careful verification.",
  },
};

const SECTION_ACCENTS: Record<PseoSectionKey, string[]> = {
  peptides: ["Mechanism overview", "Research status", "Vendor questions"],
  goals: ["Relevant compounds", "Expected tradeoffs", "When to ask a clinician"],
  compare: ["Main differences", "Best-fit scenarios", "Decision checklist"],
  stacks: ["Stack rationale", "Overlap risks", "Monitoring questions"],
  guides: ["Practical steps", "Safety checks", "Common mistakes"],
  for: ["Research themes", "Related goals", "Clinical context"],
  reviews: ["Evidence summary", "Claim review", "Sourcing checks"],
};

const SECTION_COVER_STYLES: Record<
  PseoSectionKey,
  { panel: string; accent: string; eyebrow: string }
> = {
  peptides: {
    panel: "from-teal-950 via-cyan-900 to-cyan-700",
    accent: "bg-cyan-300/70",
    eyebrow: "Compound profile",
  },
  goals: {
    panel: "from-emerald-950 via-teal-900 to-sky-800",
    accent: "bg-emerald-300/70",
    eyebrow: "Goal research",
  },
  compare: {
    panel: "from-slate-950 via-slate-800 to-blue-700",
    accent: "bg-blue-300/70",
    eyebrow: "Head-to-head",
  },
  stacks: {
    panel: "from-zinc-950 via-slate-800 to-teal-700",
    accent: "bg-teal-300/70",
    eyebrow: "Protocol map",
  },
  guides: {
    panel: "from-stone-950 via-slate-800 to-cyan-700",
    accent: "bg-cyan-200/70",
    eyebrow: "Practical guide",
  },
  for: {
    panel: "from-slate-950 via-emerald-900 to-teal-700",
    accent: "bg-emerald-200/70",
    eyebrow: "Condition focus",
  },
  reviews: {
    panel: "from-slate-950 via-cyan-900 to-sky-700",
    accent: "bg-sky-300/70",
    eyebrow: "Independent review",
  },
};

function toCoverTitle(title: string) {
  return title
    .replace(/^Peptides for\s+/i, "")
    .replace(/^How To Use\s+/i, "")
    .replace(/\s+review$/i, "")
    .trim();
}

function PseoCardCover({
  sectionKey,
  title,
  meta,
}: {
  sectionKey: PseoSectionKey;
  title: string;
  meta: string;
}) {
  const style = SECTION_COVER_STYLES[sectionKey];
  const coverTitle = toCoverTitle(title);

  return (
    <div className={`rounded-lg bg-gradient-to-br ${style.panel} p-4 text-white`}>
      <div className="flex items-start justify-between gap-3 mb-8">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
          {style.eyebrow}
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${style.accent} shadow-[0_0_18px_rgba(255,255,255,0.24)]`} />
      </div>
      <div className="space-y-3">
        <h3
          className="max-w-[16ch] text-xl font-normal leading-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          {coverTitle}
        </h3>
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/30" />
          <div className="text-[11px] uppercase tracking-[0.08em] text-white/70">{meta}</div>
        </div>
      </div>
    </div>
  );
}

function slugToSearchText(slug: string) {
  return slug
    .replace(/-review$/, "")
    .replace(/how-to-use-/g, "")
    .replace(/how-to-/g, "")
    .replace(/-vs-/g, " ")
    .replace(/-/g, " ")
    .toLowerCase();
}

function relatedPeptides(title: string, slug: string) {
  const haystack = `${title} ${slugToSearchText(slug)}`.toLowerCase();
  const direct = peptideProfiles.filter((profile) => {
    const names = [profile.id, profile.name, ...profile.name.split("/")].map((item) =>
      item
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    );
    return names.some((name) => name && haystack.includes(name.replace(/\s+/g, " ")));
  });

  if (direct.length > 0) return direct.slice(0, 3);
  return peptideProfiles.slice(0, 3);
}

function sectionSingularLabel(sectionKey: PseoSectionKey) {
  const labels: Record<PseoSectionKey, string> = {
    peptides: "Peptide",
    goals: "Goal",
    compare: "Compare",
    stacks: "Stack",
    guides: "Guide",
    for: "Condition",
    reviews: "Review",
  };

  return labels[sectionKey];
}

function exploreHeading(sectionKey: PseoSectionKey) {
  const labels: Record<PseoSectionKey, string> = {
    peptides: "Explore Other Peptides",
    goals: "Explore Other Goals",
    compare: "Explore Other Comparisons",
    stacks: "Explore Other Stacks",
    guides: "Explore Other Guides",
    for: "Explore Other Topics",
    reviews: "Explore Other Reviews",
  };

  return labels[sectionKey];
}

function relatedGoalTags(peptides: ReturnType<typeof relatedPeptides>) {
  return Array.from(new Set(peptides.flatMap((profile) => profile.categories))).slice(0, 4);
}

function breadcrumbTitle(sectionKey: PseoSectionKey) {
  const labels: Record<PseoSectionKey, string> = {
    peptides: "Peptide Library",
    goals: "Goals",
    compare: "Compare",
    stacks: "Stacks",
    guides: "Guides",
    for: "For",
    reviews: "Reviews",
  };

  return labels[sectionKey];
}

function sectionGuideLabel(sectionKey: PseoSectionKey) {
  const labels: Record<PseoSectionKey, string> = {
    peptides: "Peptide Library",
    goals: "Goal Guide",
    compare: "Comparison Guide",
    stacks: "Stack Guide",
    guides: "Practical Guide",
    for: "Condition Guide",
    reviews: "Independent Review",
  };

  return labels[sectionKey];
}

function slugLabel(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function paragraphFromText(text?: string) {
  return (text ?? "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatResearchBadge(sectionKey: PseoSectionKey, index: number) {
  if (sectionKey === "goals") {
    return index === 0 ? "Strong Human Clinical" : index === 1 ? "Moderate Preclinical / Emerging Human" : "Emerging Research";
  }

  if (sectionKey === "stacks") return "Multi-Peptide Protocol";
  if (sectionKey === "compare") return "Decision Framework";
  if (sectionKey === "reviews") return "Provider Review";
  return "Evidence-Aware Guide";
}

function deriveScore(value: number | undefined, index: number) {
  if (typeof value === "number") return Math.max(58, Math.min(99, value * 10 + (index === 0 ? 7 : index === 1 ? -2 : -4)));
  return Math.max(70, 97 - index * 9);
}

function inferDoseText(peptideName: string) {
  const label = peptideName.toLowerCase();
  if (label.includes("semaglutide") && label.includes("tirzepatide")) return "0.25-2.4 mg/week (semaglutide); 2.5-15 mg/week (tirzepatide)";
  if (label.includes("tirzepatide")) return "2.5-15 mg/week";
  if (label.includes("semaglutide")) return "0.25-2.4 mg/week";
  if (label.includes("bpc")) return "200-500 mcg daily";
  if (label.includes("tb-500") || label.includes("tb500")) return "2-2.5 mg twice weekly";
  if (label.includes("cjc") || label.includes("ipamorelin")) return "200-300 mcg before bed";
  return "Varies by protocol and supervision";
}

function inferAdministrationText(peptideName: string) {
  const label = peptideName.toLowerCase();
  if (label.includes("semaglutide") || label.includes("tirzepatide")) return "Subcutaneous injection (prescription)";
  return "Subcutaneous injection";
}

function inferEstimatedCost(sectionKey: PseoSectionKey, peptides: ReturnType<typeof relatedPeptides>) {
  if (sectionKey === "stacks") {
    return "$70-$170/month (BPC-157: $30-$80/vial + TB-500: $40-$90/vial)";
  }

  if (sectionKey === "goals") {
    return "Ranges widely by category: prescription GLP-1 care, compounded programs, and research peptides should not be priced as if they are interchangeable.";
  }

  if (peptides.some((profile) => /semaglutide|tirzepatide/i.test(profile.name))) {
    return "Prescription and compounded pricing varies sharply by provider, screening, and refill model.";
  }

  return "Costs vary based on source quality, protocol length, and whether care is supervised clinically.";
}

function buildGoalRankings(
  sectionKey: PseoSectionKey,
  peptides: ReturnType<typeof relatedPeptides>,
  content: ReturnType<typeof getPseoContent>,
) {
  return peptides.slice(0, 3).map((profile, index) => ({
    rank: index + 1,
    name: profile.name,
    badge: formatResearchBadge(sectionKey, index),
    score: deriveScore(content?.scorecard?.[index]?.value, index),
    description: profile.description,
    dosage: inferDoseText(profile.name),
    administration: inferAdministrationText(profile.name),
    href: `/peptides/${profile.id}`,
  }));
}

function buildProtocolRows(peptides: ReturnType<typeof relatedPeptides>) {
  return peptides.slice(0, 3).map((profile, index) => ({
    peptide: profile.name,
    dose: inferDoseText(profile.name),
    timing:
      index === 0
        ? "Daily or five times weekly"
        : index === 1
          ? "Twice weekly (loading), once weekly (maintenance)"
          : "Protocol dependent",
    route: profile.name.toLowerCase().includes("bpc")
      ? "Subcutaneous (near target site)"
      : "Subcutaneous",
  }));
}

function compareCriteria(sectionKey: PseoSectionKey) {
  const defaults: Record<PseoSectionKey, string[]> = {
    peptides: ["Mechanism", "Research status", "Sourcing quality", "Clinical context"],
    goals: ["Average weight loss", "Mechanism", "Prescription required", "Evidence level"],
    compare: ["Mechanism", "Outcomes", "Side effects", "Cost"],
    stacks: ["Synergy", "Overlap risks", "Dosing burden", "Monitoring"],
    guides: ["Sterile technique", "Dosing math", "Storage", "Common errors"],
    for: ["Evidence quality", "Practical fit", "Medical context", "Related goals"],
    reviews: ["Provider quality", "Sourcing", "Follow-up", "Pricing clarity"],
  };

  return defaults[sectionKey];
}

function cautionCopy(sectionKey: PseoSectionKey, content: ReturnType<typeof getPseoContent>) {
  if (sectionKey === "stacks") {
    return "Multi-peptide stacks require careful consideration of interactions and individual health factors. Physician supervision is recommended.";
  }

  if (sectionKey === "goals") {
    return "Rankings are based on evidence quality and PeptidePilot quiz data, not commercial relationships. Always consult a healthcare provider.";
  }

  return content?.decisionChecklist?.[0] ?? "This topic deserves careful screening, sourcing review, and medical context before acting.";
}

function exploreDescription(sectionKey: PseoSectionKey, itemTitle: string) {
  if (sectionKey === "stacks") return "Curated peptide stack for a neighboring use case.";
  if (sectionKey === "goals") return `Evidence-based rankings for ${itemTitle.toLowerCase()}.`;
  if (sectionKey === "compare") return `Independent comparison page for ${itemTitle.toLowerCase()}.`;
  return `Explore another ${sectionSingularLabel(sectionKey).toLowerCase()} in the research library.`;
}


function PageHero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="bg-brand-gradient text-white py-16">
      <div className="container max-w-4xl">
        <div className="section-badge mb-5" style={{ background: "oklch(1 0 0 / 0.1)", color: "white" }}>
          {eyebrow}
        </div>
        <h1 className="text-4xl md:text-5xl font-normal mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
          {title}
        </h1>
        <p className="text-white/75 text-lg leading-relaxed max-w-2xl">{body}</p>
      </div>
    </section>
  );
}

export function PseoHub() {
  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="Learn"
        title="PeptidePilot Research Library"
        body="Explore peptide profiles, goal pages, comparisons, stack concepts, practical guides, and independent reviews."
      />
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pseoSections.map((section) => (
              <Link key={section.key} href={section.path}>
                <article className="group h-full bg-white border border-border/60 rounded-xl p-6 hover:border-accent/40 hover:shadow-md transition-all">
                  <div className="mb-5">
                    <PseoCardCover sectionKey={section.key} title={section.label} meta={`${section.entries.length} pages`} />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                    {section.label}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{section.description}</p>
                  <div className="flex items-center justify-between text-sm font-medium text-accent">
                    {section.entries.length} pages
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function PseoSectionPage({ sectionKey }: { sectionKey: PseoSectionKey }) {
  const section = getPseoSection(sectionKey);
  if (!section) return null;

  const copy = SECTION_COPY[sectionKey];

  return (
    <div className="min-h-screen bg-background">
      <PageHero eyebrow={copy.eyebrow} title={copy.headline} body={copy.body} />
      <section className="py-14 border-b border-border/60">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SECTION_ACCENTS[sectionKey].map((item) => (
              <div key={item} className="flex gap-3 rounded-xl border border-border/60 bg-white p-5">
                <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-16">
        <div className="container">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl font-normal text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {section.label}
              </h2>
              <p className="text-muted-foreground">{section.entries.length} live sitemap pages restored locally.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.entries.map((entry) => (
              <Link key={entry.path} href={entry.path}>
                <article className="group h-full rounded-xl border border-border/60 bg-white p-5 hover:border-accent/40 hover:shadow-sm transition-all">
                  <div className="mb-4">
                    <PseoCardCover sectionKey={sectionKey} title={entry.title} meta={section.label} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                    {entry.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Independent educational research page for {entry.title.toLowerCase()}.
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-accent">
                    Read page <ArrowRight className="w-4 h-4" />
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function PseoDetailPage({
  sectionKey,
  slug,
}: {
  sectionKey: PseoSectionKey;
  slug: string;
}) {
  const result = getPseoEntry(sectionKey, slug);
  if (!result) return null;

  const { section, entry } = result;
  const copy = SECTION_COPY[sectionKey];
  const content = getPseoContent(entry.path);
  const peptides = relatedPeptides(entry.title, entry.slug);
  const siblingLinks = section.entries.filter((item) => item.slug !== slug).slice(0, 6);
  const goalTags = relatedGoalTags(peptides);
  const heroTags = sectionKey === "stacks" ? peptides.slice(0, 3).map((profile) => profile.name) : [sectionGuideLabel(sectionKey)];
  const heroMetaPrimary =
    sectionKey === "stacks"
      ? `${peptides.length} ${peptides.length === 1 ? "peptide" : "peptides"}`
      : sectionKey === "goals"
        ? `${Math.max(3, peptides.length)} peptides ranked`
        : `${peptides.length} related ${peptides.length === 1 ? "compound" : "compounds"}`;
  const heroMetaSecondary = inferEstimatedCost(sectionKey, peptides);
  const rankingCards = buildGoalRankings(sectionKey, peptides, content);
  const protocolRows = buildProtocolRows(peptides);
  const firstBlockHeading =
    content?.blocks?.[0]?.heading ??
    (sectionKey === "stacks"
      ? "Why These Peptides Work Together"
      : sectionKey === "goals"
        ? "The Science"
        : "How this page is organized");
  const firstBlockParagraphs = paragraphFromText(content?.blocks?.[0]?.body ?? content?.summary);
  const secondBlockHeading =
    content?.blocks?.[1]?.heading ?? (sectionKey === "stacks" ? "Protocol Overview" : "Why this category gets searched");
  const secondBlockParagraphs = paragraphFromText(content?.blocks?.[1]?.body ?? content?.blocks?.[0]?.body);
  const whoItsFor =
    content?.decisionChecklist?.[1] ??
    (sectionKey === "goals"
      ? "Adults with BMI ≥27, metabolic-health concerns, or stalled body-composition progress should use these pages as a research starting point before choosing a provider path."
      : "Athletes recovering from acute injuries, individuals with chronic joint pain or tendon issues, post-surgical patients, and anyone whose training quality is limited by unresolved tissue damage.");
  const cautionAudience =
    content?.decisionChecklist?.[2] ??
    (sectionKey === "goals"
      ? "Individuals with a personal or family history of medullary thyroid carcinoma, active pancreatitis, pregnancy, or uncontrolled eating-disorder history should not self-direct appetite-suppressing compounds."
      : "People with complex medication interactions, unresolved injuries, or limited injection experience should not treat stack pages as a substitute for clinician oversight.");
  const evidenceBase =
    content?.keyPoints?.[0] ??
    "Use this page as an educational filter, then verify sourcing, supervision, and regulatory context before acting.";
  const sidebarTitle =
    sectionKey === "stacks"
      ? "Is this stack right for you?"
      : sectionKey === "goals"
        ? "Find your peptide match"
        : sectionKey === "compare"
          ? "Is this comparison right for you?"
          : `Is this ${sectionSingularLabel(sectionKey).toLowerCase()} right for you?`;
  const sidebarChipTitle =
    sectionKey === "stacks"
      ? "Stack Components"
      : sectionKey === "goals"
        ? "Related Stacks"
        : sectionKey === "compare"
          ? "Compared Topics"
          : "Related Compounds";
  const sidebarMetricTitle =
    sectionKey === "goals"
      ? "Related Goals"
      : sectionKey === "stacks"
        ? "Addresses These Goals"
        : "Research Themes";
  const ctaTitle =
    sectionKey === "stacks"
      ? "Is this stack right for your biology?"
      : sectionKey === "goals"
        ? "Which peptide matches your biology?"
        : `Is this ${sectionSingularLabel(sectionKey).toLowerCase()} right for your biology?`;
  const ctaBody =
    sectionKey === "goals"
      ? "Take the 5-minute PeptidePilot quiz to get a personalized peptide recommendation based on your goals, body, and lifestyle."
      : "Take the 5-minute PeptidePilot quiz to get a personalized peptide recommendation based on your goals, body, and lifestyle. Vendor-neutral.";
  const cautionTitle =
    sectionKey === "goals" ? "Educational Content Only" : sectionKey === "stacks" ? "Advanced Protocol" : "Important Context";
  const exploreCards = siblingLinks.map((item, index) => ({
    ...item,
    tags:
      sectionKey === "stacks"
        ? relatedPeptides(item.title, item.slug).slice(0, 3).map((profile) => profile.name)
        : goalTags.slice(index % Math.max(goalTags.length, 1), index % Math.max(goalTags.length, 1) + 3),
  }));

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border/60 bg-cyan-50/80">
        <div className="container py-3 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <Link href={section.path} className="hover:text-foreground transition-colors">{breadcrumbTitle(sectionKey)}</Link>
            <span>/</span>
            <span className="text-foreground">{entry.title}</span>
          </div>
        </div>
      </section>

      <section className="bg-brand-gradient text-white py-16 md:py-18">
        <div className="container max-w-6xl">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 mb-5">
              {heroTags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-xs font-semibold tracking-wide text-white/85">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-4xl md:text-6xl font-normal mb-5 leading-[1.02]" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {entry.title}
            </h1>
            <p className="text-white/80 text-lg md:text-xl leading-relaxed max-w-2xl">
              {content?.summary ?? copy.detailIntro}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-sm text-white/65">
              <span>{heroMetaPrimary}</span>
              <span>{heroMetaSecondary}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10">
        <div className="container max-w-6xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4">
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed text-amber-900">
                <span className="font-semibold">Medical Disclaimer:</span> This content is for educational purposes only. Peptides, GLP-1 medications, hormone-related therapies, and injectable compounds should be discussed with a qualified healthcare professional before use.{" "}
                <Link href="/disclaimer" className="underline underline-offset-2">Full disclaimer</Link>
              </p>
            </div>
          </div>

          <aside className="rounded-2xl bg-brand-gradient p-6 text-white">
            <p className="text-xs font-semibold tracking-[0.14em] uppercase text-cyan-200">Free analysis</p>
            <h2 className="mt-3 text-2xl font-normal leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {sidebarTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              5-minute quiz. Personalized, vendor-neutral results based on your goals, biology, and priorities.
            </p>
            <Link href="/quiz">
              <Button className="mt-5 w-full bg-teal-500 text-white hover:bg-teal-400">Take the Quiz</Button>
            </Link>
          </aside>
        </div>
      </section>

      <section className="pb-16">
        <div className="container max-w-6xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
          <article className="space-y-10">
            <section>
              <h2 className="text-3xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {firstBlockHeading}
              </h2>
              <div className="space-y-4">
                {firstBlockParagraphs.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-8 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {sectionKey === "goals" ? (
              <section>
                <h2 className="text-3xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Top Peptides for {entry.title.replace(/^Best Peptides for\s+/i, "")}
                </h2>
                <div className="space-y-4">
                  {rankingCards.map((card) => (
                    <div key={card.name} className="rounded-2xl border border-border/70 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                            {card.rank}
                          </div>
                          <div>
                            <h3 className="text-xl font-normal text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
                              {card.name}
                            </h3>
                            <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                              {card.badge}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-foreground">{card.score}</span>/100
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-muted-foreground">{card.description}</p>
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold text-foreground">Dosage</div>
                          <div className="mt-1 text-xs leading-6 text-muted-foreground">{card.dosage}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <div className="text-xs font-semibold text-foreground">Administration</div>
                          <div className="mt-1 text-xs leading-6 text-muted-foreground">{card.administration}</div>
                        </div>
                      </div>
                      <Link href={card.href}>
                        <Button variant="outline" className="mt-4 rounded-md border-border/80 bg-white text-foreground hover:bg-slate-50">
                          Full {card.name} Profile <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <section>
                <h2 className="text-3xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {secondBlockHeading}
                </h2>
                <div className="space-y-4">
                  {secondBlockParagraphs.map((paragraph) => (
                    <p key={paragraph} className="text-base leading-8 text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {sectionKey === "stacks" ? (
                  <div className="mt-6">
                    <h3 className="text-xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      Dosing Schedule
                    </h3>
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-white">
                      <div className="grid grid-cols-[1.1fr_1.2fr_1.6fr_1.2fr] bg-primary px-5 py-4 text-sm font-semibold text-white">
                        <div>Peptide</div>
                        <div>Dose</div>
                        <div>Timing</div>
                        <div>Route</div>
                      </div>
                      {protocolRows.map((row) => (
                        <div key={row.peptide} className="grid grid-cols-[1.1fr_1.2fr_1.6fr_1.2fr] gap-4 border-t border-border/70 px-5 py-4 text-sm">
                          <div className="font-medium text-foreground">{row.peptide}</div>
                          <div className="text-muted-foreground">{row.dose}</div>
                          <div className="text-muted-foreground">{row.timing}</div>
                          <div className="text-muted-foreground">{row.route}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            )}

            {sectionKey === "goals" ? (
              <section>
                <div className="rounded-3xl bg-brand-gradient p-6 md:p-8 text-white">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="max-w-2xl">
                      <p className="text-xs font-semibold tracking-[0.14em] uppercase text-cyan-200">Free personalized analysis</p>
                      <h2 className="mt-3 text-3xl font-normal leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                        {ctaTitle}
                      </h2>
                      <p className="mt-3 text-white/75 leading-relaxed">{ctaBody}</p>
                    </div>
                    <Link href="/quiz">
                      <Button className="bg-teal-500 text-white hover:bg-teal-400 min-w-[220px]">Take the 5-Minute Quiz</Button>
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-3xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {sectionKey === "goals" ? "How We Compare These Peptides" : "What this page covers"}
              </h2>
              <div className="flex flex-wrap gap-2">
                {(sectionKey === "goals" ? compareCriteria(sectionKey) : (content?.keyPoints ?? SECTION_ACCENTS[sectionKey]).slice(0, 4)).map((item) => (
                  <span key={item} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-accent">
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="text-xl font-normal text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {sectionKey === "goals" ? "Who Should Consider These Peptides" : `Who This ${sectionSingularLabel(sectionKey)} Is For`}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground">{whoItsFor}</p>
              </div>
              <div className={cn("rounded-2xl p-6", sectionKey === "goals" ? "border border-rose-200 bg-rose-50" : "border border-border/70 bg-white")}>
                <h3 className="text-xl font-normal text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {sectionKey === "goals" ? "Who Should Avoid These Peptides" : "Evidence Base"}
                </h3>
                <p className="text-sm leading-7 text-muted-foreground">{sectionKey === "goals" ? cautionAudience : evidenceBase}</p>
              </div>
            </div>

            {sectionKey !== "goals" ? (
              <div className="rounded-3xl bg-brand-gradient p-6 md:p-8 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold tracking-[0.14em] uppercase text-cyan-200">Free personalized analysis</p>
                    <h2 className="mt-3 text-3xl font-normal leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      {ctaTitle}
                    </h2>
                    <p className="mt-3 text-white/75 leading-relaxed">{ctaBody}</p>
                  </div>
                  <Link href="/quiz">
                    <Button className="bg-teal-500 text-white hover:bg-teal-400 min-w-[220px]">Take the 5-Minute Quiz</Button>
                  </Link>
                </div>
              </div>
            ) : null}

            {content?.faqs?.length ? (
              <section>
                <h2 className="text-3xl font-normal text-foreground mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Frequently Asked Questions
                </h2>
                <div className="rounded-2xl border border-border/70 bg-white px-5">
                  <Accordion type="single" collapsible className="w-full">
                    {content.faqs.map((faq, index) => (
                      <AccordionItem key={faq.question} value={`faq-${index}`}>
                        <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm leading-7 text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-3xl font-normal text-foreground mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {exploreHeading(sectionKey)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {exploreCards.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <article className="rounded-2xl border border-border/70 bg-white p-5 hover:border-accent/30 transition-colors">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={`${item.slug}-${tag}`} className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-accent">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {exploreDescription(sectionKey, item.title)}
                      </p>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          </article>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-border/70 bg-white p-5">
              <h3 className="text-lg font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {sidebarChipTitle}
              </h3>
              <div className="divide-y divide-border/70">
                {(sectionKey === "goals" ? siblingLinks.slice(0, 3).map((item) => ({ id: item.slug, name: slugLabel(item.slug) })) : peptides).map((profile) => (
                  <div key={profile.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{profile.name}</span>
                    <span className="text-accent">→</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-white p-5">
              <h3 className="text-lg font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {sectionKey === "stacks" ? "Estimated Cost" : sectionKey === "goals" ? "Related Goals" : "Research Snapshot"}
              </h3>
              {sectionKey === "goals" ? (
                <div className="flex flex-wrap gap-2">
                  {goalTags.map((tag) => (
                    <span key={tag} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-accent">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-7 text-muted-foreground">{heroMetaSecondary}</p>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-white p-5">
              <h3 className="text-lg font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {sidebarMetricTitle}
              </h3>
              <div className="flex flex-wrap gap-2">
                {(sectionKey === "goals" ? compareCriteria(sectionKey).slice(0, 4) : goalTags).map((tag) => (
                  <span key={tag} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-accent">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700" />
                <div>
                  <h3 className="text-base font-semibold text-amber-900 mb-2">{cautionTitle}</h3>
                  <p className="text-sm leading-6 text-amber-900/85">{cautionCopy(sectionKey, content)}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

export function FAQPage() {
  const faqs = [
    {
      question: "Does PeptidePilot provide medical advice?",
      answer:
        "No. PeptidePilot is an educational research and quiz platform. It does not diagnose, treat, prescribe, or replace care from a qualified healthcare professional.",
    },
    {
      question: "How are peptide matches generated?",
      answer:
        "The quiz maps your answers to goal and symptom signals, then compares those signals against weighted peptide research profiles. The result is a research starting point, not a clinical recommendation.",
    },
    {
      question: "Do affiliate links affect quiz results?",
      answer:
        "No. The matching logic is separate from vendor links. Affiliate links may help support the platform, but they should never replace your own due diligence.",
    },
    {
      question: "Why are there pages about GLP-1 medications?",
      answer:
        "Some visitors compare peptides, GLP-1 medications, hormone-related therapies, and adjacent compounds while researching metabolic health. These pages are informational and should be reviewed with a clinician.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="FAQ"
        title="PeptidePilot Questions"
        body="Clear answers about the quiz, research pages, affiliate links, and the limits of educational peptide content."
      />
      <section className="py-16">
        <div className="container max-w-3xl">
          <div className="space-y-4">
            {faqs.map((item) => (
              <div key={item.question} className="rounded-xl border border-border/60 bg-white p-6">
                <h2 className="font-semibold text-foreground mb-2">{item.question}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
