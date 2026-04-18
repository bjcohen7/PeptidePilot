import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { getComparisonBySlug, comparisonPages } from "../../../../shared/pseoData";

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

export default function ComparisonPage({ params }: { params: { slug: string } }) {
  const comparison = getComparisonBySlug(params.slug);

  if (!comparison) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Comparison not found</h1>
        <Link href="/compare">
          <Button variant="outline">← Back to Comparisons</Button>
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
            headline: comparison.h1,
            description: comparison.metaDescription,
            author: { "@type": "Organization", name: "PeptidePilot" },
            publisher: { "@type": "Organization", name: "PeptidePilot" },
            mainEntityOfPage: `https://peptidepilot.me/compare/${comparison.slug}`,
          }),
        }}
      />

      {/* Breadcrumb */}
      <div className="bg-[var(--brand-teal-pale)] border-b border-border">
        <div className="container py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link href="/compare" className="hover:text-foreground">Compare</Link>
            <span>/</span>
            <span className="text-foreground font-medium">
              {comparison.peptideA} vs {comparison.peptideB}
            </span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--brand-navy)] via-[var(--brand-navy-mid)] to-[oklch(0.32_0.10_220)] text-white py-16">
        <div className="container max-w-3xl">
          <Badge className="bg-white/10 text-white border-white/20 mb-4">
            {comparison.category}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            {comparison.h1}
          </h1>
          <div className="rounded-xl bg-white/10 border border-white/20 p-4 mt-6">
            <p className="text-sm font-semibold text-[var(--brand-teal-light)] uppercase tracking-wide mb-1">
              Verdict Summary
            </p>
            <p className="text-white/90 leading-relaxed">
              {comparison.verdictSummary}
            </p>
          </div>
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
                <strong>Medical Disclaimer:</strong> This comparison is for
                educational purposes only. Consult a healthcare provider before
                starting any peptide protocol.{" "}
                <Link href="/disclaimer" className="underline font-medium">
                  Full disclaimer →
                </Link>
              </p>
            </div>

            {/* At-a-Glance Table */}
            <section>
              <h2 className="text-2xl font-bold mb-5">At a Glance</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--brand-navy)] text-white">
                      <th className="px-4 py-3 text-left font-medium w-1/3">
                        Dimension
                      </th>
                      <th className="px-4 py-3 text-left font-medium w-1/3">
                        {comparison.peptideA}
                      </th>
                      <th className="px-4 py-3 text-left font-medium w-1/3">
                        {comparison.peptideB}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.atAGlance.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 odd:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {row.dimension}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.peptideA}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.peptideB}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Deep Dives */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-border p-5">
                <h3 className="font-bold text-lg mb-3 text-[var(--brand-navy)]">
                  {comparison.peptideA} Deep Dive
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {comparison.deepDiveA}
                </p>
                <div className="mt-4">
                  <Link href={`/peptides/${comparison.peptideASlug}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      Full {comparison.peptideA} Profile →
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="rounded-xl border border-border p-5">
                <h3 className="font-bold text-lg mb-3 text-[var(--brand-navy)]">
                  {comparison.peptideB} Deep Dive
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {comparison.deepDiveB}
                </p>
                <div className="mt-4">
                  <Link href={`/peptides/${comparison.peptideBSlug}`}>
                    <Button variant="outline" size="sm" className="text-xs">
                      Full {comparison.peptideB} Profile →
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            {/* Choose A / Choose B */}
            <section>
              <h2 className="text-2xl font-bold mb-5">How to Choose</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Choose {comparison.peptideA} if…
                  </h3>
                  <ul className="space-y-2">
                    {comparison.chooseAIf.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-emerald-800"
                      >
                        <span className="text-emerald-600 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    Choose {comparison.peptideB} if…
                  </h3>
                  <ul className="space-y-2">
                    {comparison.chooseBIf.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-blue-800"
                      >
                        <span className="text-blue-600 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {comparison.considerBothIf && (
                <div className="mt-4 rounded-xl border border-[var(--brand-teal)] bg-[var(--brand-teal-pale)] p-4">
                  <p className="text-sm font-medium text-[var(--brand-navy)] mb-1">
                    Consider Both If…
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {comparison.considerBothIf}
                  </p>
                </div>
              )}
            </section>

            {/* Quiz CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy-mid)] text-white p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand-teal-light)] mb-2">
                    Still Unsure?
                  </p>
                  <h3 className="text-2xl font-bold mb-2">
                    Get a personalized recommendation
                  </h3>
                  <p className="text-white/70 max-w-md">
                    Take the 5-minute PeptidePilot quiz. Our algorithm evaluates
                    your goals, body, and lifestyle to recommend the right
                    peptide for you — vendor-neutral.
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

            {/* FAQ */}
            {comparison.faqItems.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-5">
                  Frequently Asked Questions
                </h2>
                <div className="rounded-xl border border-border divide-y divide-border px-4">
                  {comparison.faqItems.map((item, i) => (
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
                Not sure which to choose?
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

            {/* Related Comparisons */}
            {comparison.relatedComparisons.length > 0 && (
              <div className="rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-3">Related Comparisons</h3>
                <div className="space-y-2">
                  {comparison.relatedComparisons.map((slug) => (
                    <Link
                      key={slug}
                      href={`/compare/${slug}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <span className="text-muted-foreground capitalize">
                        {slug.replace(/-vs-/g, " vs ").replace(/-/g, " ")}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Individual profiles */}
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold mb-3">Individual Profiles</h3>
              <div className="space-y-2">
                <Link
                  href={`/peptides/${comparison.peptideASlug}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <span className="font-medium">{comparison.peptideA}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Link>
                <Link
                  href={`/peptides/${comparison.peptideBSlug}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <span className="font-medium">{comparison.peptideB}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Link>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">⚠️ Independent Analysis</p>
              <p>
                PeptidePilot has no commercial relationships with peptide
                vendors. All comparisons are based solely on scientific evidence
                and quiz data.
              </p>
            </div>
          </aside>
        </div>

        {/* More Comparisons */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">More Comparisons</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {comparisonPages
              .filter((c) => c.slug !== comparison.slug)
              .slice(0, 6)
              .map((c) => (
                <Link key={c.slug} href={`/compare/${c.slug}`}>
                  <div className="rounded-xl border border-border p-4 hover:border-[var(--brand-teal)] hover:shadow-sm transition-all cursor-pointer h-full">
                    <Badge
                      variant="secondary"
                      className="text-xs mb-2"
                    >
                      {c.category}
                    </Badge>
                    <h3 className="font-semibold text-sm">
                      {c.peptideA} vs {c.peptideB}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {c.verdictSummary}
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
