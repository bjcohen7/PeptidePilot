import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  FlaskConical,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { getGoalBySlug, goalPages } from "../../../../shared/pseoData";

const EVIDENCE_COLOR: Record<string, string> = {
  "Strong Human Clinical": "bg-emerald-100 text-emerald-800",
  "Strong Preclinical / Limited Human": "bg-blue-100 text-blue-800",
  "Moderate Preclinical / Emerging Human": "bg-amber-100 text-amber-800",
  "Preclinical Only": "bg-gray-100 text-gray-700",
};

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        className="w-full flex items-center justify-between py-4 text-left font-medium text-foreground hover:text-[var(--brand-teal)] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>{q}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 ml-4" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 ml-4" />
        )}
      </button>
      {open && (
        <p className="pb-4 text-muted-foreground text-sm leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function GoalPage({ params }: { params: { slug: string } }) {
  const goal = getGoalBySlug(params.slug);

  if (!goal) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Goal page not found</h1>
        <Link href="/goals">
          <Button variant="outline">← Back to Goals</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: goal.h1,
            description: goal.metaDescription,
            author: { "@type": "Organization", name: "PeptidePilot" },
            publisher: { "@type": "Organization", name: "PeptidePilot" },
            mainEntityOfPage: `https://peptidepilot.me/goals/${goal.slug}`,
          }),
        }}
      />

      {/* Breadcrumb */}
      <div className="bg-[var(--brand-teal-pale)] border-b border-border">
        <div className="container py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link href="/goals" className="hover:text-foreground">Goals</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{goal.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--brand-navy)] via-[var(--brand-navy-mid)] to-[oklch(0.32_0.10_220)] text-white py-16">
        <div className="container max-w-3xl">
          <Badge className="bg-white/10 text-white border-white/20 mb-4">
            Goal Guide
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            {goal.h1}
          </h1>
          <p className="text-lg text-white/75">{goal.subtitle}</p>
        </div>
      </section>

      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Medical disclaimer */}
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
              <p>
                <strong>Medical Disclaimer:</strong> This content is for
                educational purposes only. Peptides discussed may be research
                compounds not approved for human use. Consult a healthcare
                provider before starting any protocol.{" "}
                <Link href="/disclaimer" className="underline font-medium">
                  Full disclaimer →
                </Link>
              </p>
            </div>

            {/* Science section */}
            <section>
              <h2 className="text-2xl font-bold mb-4">The Science</h2>
              <p className="text-muted-foreground leading-relaxed">
                {goal.scienceSection}
              </p>
            </section>

            {/* Ranked Peptides */}
            <section>
              <h2 className="text-2xl font-bold mb-6">
                Top Peptides for {goal.title.replace("Best Peptides for ", "")}
              </h2>
              <div className="space-y-5">
                {goal.topPeptides.map((peptide, index) => (
                  <div
                    key={peptide.peptideSlug}
                    className="rounded-xl border border-border p-5 hover:border-[var(--brand-teal)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand-navy)] text-white text-sm font-bold shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-lg">
                            {peptide.peptideName}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              EVIDENCE_COLOR[peptide.evidenceLevel] ??
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {peptide.evidenceLevel}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-sm">
                          {peptide.matchScore}
                          <span className="text-muted-foreground font-normal">
                            /100
                          </span>
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      {peptide.rationale}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <span className="font-medium block mb-0.5">Dosage</span>
                        <span className="text-muted-foreground">
                          {peptide.dosage}
                        </span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <span className="font-medium block mb-0.5">
                          Administration
                        </span>
                        <span className="text-muted-foreground">
                          {peptide.administration}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Link href={`/peptides/${peptide.peptideSlug}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          Full {peptide.peptideName} Profile →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quiz CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy-mid)] text-white p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand-teal-light)] mb-2">
                    Free Personalized Analysis
                  </p>
                  <h3 className="text-2xl font-bold mb-2">
                    Which peptide matches your biology?
                  </h3>
                  <p className="text-white/70 max-w-md">
                    Take the 5-minute PeptidePilot quiz to get a personalized
                    recommendation based on your goals, body, and lifestyle.
                  </p>
                </div>
                <Link href="/quiz">
                  <Button
                    size="lg"
                    className="bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-light)] text-white font-semibold whitespace-nowrap shrink-0"
                  >
                    Take the 5-Minute Quiz
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Comparison dimensions */}
            <section>
              <h2 className="text-2xl font-bold mb-4">
                How We Compare These Peptides
              </h2>
              <div className="flex flex-wrap gap-2">
                {goal.comparisonDimensions.map((dim) => (
                  <Badge key={dim} variant="secondary" className="text-sm">
                    {dim}
                  </Badge>
                ))}
              </div>
            </section>

            {/* Who should / avoid */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-semibold text-emerald-900 mb-3">
                  ✓ Who Should Consider These Peptides
                </h3>
                <p className="text-emerald-800 text-sm leading-relaxed">
                  {goal.whoShouldConsider}
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-semibold text-red-900 mb-3">
                  ✗ Who Should Avoid These Peptides
                </h3>
                <p className="text-red-800 text-sm leading-relaxed">
                  {goal.whoShouldAvoid}
                </p>
              </div>
            </section>

            {/* FAQ */}
            {goal.faqItems.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-5">
                  Frequently Asked Questions
                </h2>
                <div className="rounded-xl border border-border divide-y divide-border px-4">
                  {goal.faqItems.map((item, i) => (
                    <FAQItem key={i} q={item.q} a={item.a} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Quiz CTA */}
            <div className="rounded-xl bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy-mid)] text-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-teal-light)] mb-2">
                Free Analysis
              </p>
              <h3 className="font-bold text-lg mb-2">
                Find your peptide match
              </h3>
              <p className="text-white/70 text-sm mb-4">
                5-minute quiz. Personalized, vendor-neutral results.
              </p>
              <Link href="/quiz">
                <Button className="w-full bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-light)] text-white">
                  Take the Quiz →
                </Button>
              </Link>
            </div>

            {/* Related Stacks */}
            {goal.relatedStacks.length > 0 && (
              <div className="rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-3">Related Stacks</h3>
                <div className="space-y-2">
                  {goal.relatedStacks.map((slug) => (
                    <Link
                      key={slug}
                      href={`/stacks/${slug}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <span className="capitalize">
                        {slug.replace(/-/g, " ")}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related Goals */}
            {goal.relatedGoals.length > 0 && (
              <div className="rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-3">Related Goals</h3>
                <div className="flex flex-wrap gap-2">
                  {goal.relatedGoals.map((slug) => (
                    <Link key={slug} href={`/goals/${slug}`}>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-[var(--brand-teal-pale)] capitalize"
                      >
                        {slug.replace(/-/g, " ")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">⚠️ Educational Content Only</p>
              <p>
                Rankings are based on evidence quality and PeptidePilot quiz
                data, not commercial relationships. Always consult a healthcare
                provider.
              </p>
            </div>
          </aside>
        </div>

        {/* Other Goals */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Explore Other Goals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goalPages
              .filter((g) => g.slug !== goal.slug)
              .slice(0, 6)
              .map((g) => (
                <Link key={g.slug} href={`/goals/${g.slug}`}>
                  <div className="rounded-xl border border-border p-4 hover:border-[var(--brand-teal)] hover:shadow-sm transition-all cursor-pointer h-full">
                    <h3 className="font-semibold text-sm mb-1">{g.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {g.subtitle}
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}
