import { Link } from "wouter";
import { ArrowRight, CheckCircle2, FlaskConical, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="min-h-screen bg-background">
      <PageHero eyebrow={section.label} title={entry.title} body={copy.detailIntro} />
      <section className="py-16">
        <div className="container grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
          <article className="space-y-10">
            <div className="rounded-xl border border-border/60 bg-white p-6 md:p-8">
              <h2 className="text-2xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                What this page covers
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-5">
                {content?.summary ??
                  "PeptidePilot is rebuilding this live PSEO page from the sitemap inventory. The page now resolves locally, carries the correct URL structure, and provides an evidence-aware framework for expanding the content."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(content?.keyPoints ?? SECTION_ACCENTS[sectionKey]).map((item) => (
                  <div key={item} className="rounded-lg bg-secondary/60 p-4 text-sm font-medium text-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {content?.blocks.map((block) => (
              <div key={block.heading} className="rounded-xl border border-border/60 bg-white p-6 md:p-8">
                <h2 className="text-2xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {block.heading}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{block.body}</p>
              </div>
            ))}

            {content?.decisionChecklist?.length ? (
              <div className="rounded-xl border border-border/60 bg-white p-6 md:p-8">
                <h2 className="text-2xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Decision checklist
                </h2>
                <div className="space-y-3">
                  {content.decisionChecklist.map((item) => (
                    <div key={item} className="flex gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <p className="text-muted-foreground leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-border/60 bg-white p-6 md:p-8">
              <h2 className="text-2xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Related peptide research
              </h2>
              <div className="space-y-4">
                {peptides.map((profile) => (
                  <div key={profile.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                    <h3 className="font-semibold text-foreground mb-1">{profile.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{profile.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {content?.faqs?.length ? (
              <div className="rounded-xl border border-border/60 bg-white p-6 md:p-8">
                <h2 className="text-2xl font-normal text-foreground mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Common questions
                </h2>
                <div className="space-y-5">
                  {content.faqs.map((faq) => (
                    <div key={faq.question}>
                      <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="font-semibold text-amber-950 mb-2">Medical disclaimer</h2>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    This page is educational only and is not medical advice. Peptides, GLP-1 medications, hormone-related
                    therapies, and injectable compounds should be discussed with a qualified healthcare professional.
                  </p>
                </div>
              </div>
            </div>
          </article>

          <aside className="space-y-5">
            <div className="rounded-xl border border-border/60 bg-white p-5">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-4">
                <FlaskConical className="w-5 h-5 text-accent" />
              </div>
              <h2 className="font-semibold text-foreground mb-2">Personalize this research</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Answer the quiz to compare this topic against your goals, age range, recovery needs, and budget.
              </p>
              <Link href="/quiz">
                <Button className="w-full bg-brand-gradient text-white hover:opacity-90">Take the Quiz</Button>
              </Link>
            </div>

            <div className="rounded-xl border border-border/60 bg-white p-5">
              <h2 className="font-semibold text-foreground mb-4">More in {section.label}</h2>
              <div className="space-y-3">
                {siblingLinks.map((item) => (
                  <Link key={item.path} href={item.path} className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                    {item.title}
                  </Link>
                ))}
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
