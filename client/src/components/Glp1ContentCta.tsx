import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUIZ_MINUTES } from "@shared/quizConfig";
import { PROVIDER_FLOOR_PRICE } from "@shared/providerData";

/**
 * Fields a content page can expose to the GLP-1 topicality classifier.
 * All optional — each page maps whatever real fields it has. The explicit
 * `glp1Topical` boolean is a per-page override: when set, it wins outright and
 * the heuristic (categories / goal slugs / peptide slugs) is skipped. This lets
 * editors force a page on/off without setting the flag on the hundreds of
 * existing data entries — the classifier supplies the sensible default.
 */
export interface Glp1TopicalInput {
  glp1Topical?: boolean;
  categories?: string[];
  goalSlugs?: string[];
  primaryGoals?: string[];
  peptideSlugs?: string[];
  /** Free text (slug + title) — matched against the GLP-1 drug-name terms so
   *  pages about mounjaro/zepbound/victoza/etc. qualify without per-page flags. */
  text?: string;
}

// Brand/generic GLP-1 (and near-neighbour) terms. A page whose slug or title
// mentions any of these is GLP-1-topical.
const GLP1_TERMS = [
  "ozempic", "wegovy", "semaglutide", "tirzepatide", "mounjaro", "zepbound",
  "victoza", "saxenda", "rybelsus", "liraglutide", "retatrutide", "trulicity", "glp",
];

const METABOLIC_CATEGORIES = [
  "fat loss",
  "metabolic health",
  "appetite control",
  "blood sugar",
  "weight loss",
];

const METABOLIC_GOAL_SLUGS = [
  "fat-loss",
  "metabolic-health",
  "body-recomposition",
  "weight-loss",
];

const GLP1_PEPTIDE_SLUGS = ["semaglutide", "tirzepatide"];

/**
 * Deterministic classifier: is a content page metabolic / GLP-1 relevant?
 * Per-page `glp1Topical` override wins if explicitly set; otherwise a page is
 * topical when any category, goal slug, or peptide slug matches the metabolic
 * / GLP-1 sets (all comparisons case-insensitive).
 */
export function isGlp1Topical(input: Glp1TopicalInput): boolean {
  if (typeof input.glp1Topical === "boolean") {
    return input.glp1Topical;
  }

  const categories = (input.categories ?? []).map((c) => c.toLowerCase());
  if (categories.some((c) => METABOLIC_CATEGORIES.includes(c))) {
    return true;
  }

  const goalSlugs = [...(input.goalSlugs ?? []), ...(input.primaryGoals ?? [])].map(
    (g) => g.toLowerCase(),
  );
  if (goalSlugs.some((g) => METABOLIC_GOAL_SLUGS.includes(g))) {
    return true;
  }

  const peptideSlugs = (input.peptideSlugs ?? []).map((p) => p.toLowerCase());
  if (peptideSlugs.some((p) => GLP1_PEPTIDE_SLUGS.includes(p))) {
    return true;
  }

  const text = (input.text ?? "").toLowerCase();
  if (text && GLP1_TERMS.some((t) => text.includes(t))) {
    return true;
  }

  return false;
}

export type Glp1ContentCtaPlacement = "inline" | "end" | "footer";

interface Glp1ContentCtaProps {
  topical: boolean;
  placement: Glp1ContentCtaPlacement;
  /** Page slug — becomes utm_content so we can attribute quiz starts by page. */
  utmContent?: string;
}

function quizHref(utmContent?: string) {
  const base = "/quiz?utm_source=seo";
  return utmContent ? `${base}&utm_content=${encodeURIComponent(utmContent)}` : base;
}

/**
 * Contextual quiz CTA for library/content pages.
 * - `topical` true  → a PROMINENT navy-gradient card steering toward the
 *   GLP-1 provider-match quiz (used for `inline` and `end` placements).
 * - `topical` false → a QUIET single-line muted footer CTA.
 */
export function Glp1ContentCta({ topical, placement, utmContent }: Glp1ContentCtaProps) {
  const href = quizHref(utmContent);
  if (!topical) {
    return (
      <p className="text-sm text-muted-foreground my-8">
        Exploring GLP-1 options for weight or metabolic health?{" "}
        <Link
          href={href}
          className="underline font-medium text-foreground hover:text-[var(--brand-teal)]"
        >
          take the free GLP-1 quiz
        </Link>
        .
      </p>
    );
  }

  const spacing = placement === "inline" ? "my-10" : "mt-12";

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy-mid)] text-white p-8 ${spacing}`}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand-teal-light)] mb-2">
            Free GLP-1 Provider Match
          </p>
          <h3 className="text-2xl font-bold mb-2">
            Find the right GLP-1 provider for your budget
          </h3>
          <p className="text-white/70 max-w-md">
            Licensed US providers, plans from ${PROVIDER_FLOOR_PRICE}/mo — matched
            to your budget and state, with no paid placements.
          </p>
        </div>
        <Link href={href}>
          <Button
            size="lg"
            className="bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-light)] text-white font-semibold whitespace-nowrap shrink-0"
          >
            See if you match — free {QUIZ_MINUTES}-minute quiz
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default Glp1ContentCta;
