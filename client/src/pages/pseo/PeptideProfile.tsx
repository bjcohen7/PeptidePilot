import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FlaskConical,
  ShieldCheck,
  Zap,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { getPeptideBySlug, peptidePages } from "../../../../shared/pseoData";

const EVIDENCE_COLOR: Record<string, string> = {
  "Strong Human Clinical": "bg-emerald-100 text-emerald-800",
  "Strong Preclinical / Limited Human": "bg-blue-100 text-blue-800",
  "Moderate Preclinical / Emerging Human": "bg-amber-100 text-amber-800",
  "Preclinical Only": "bg-gray-100 text-gray-700",
};

function QuizCTA({ peptideName }: { peptideName: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy-mid)] text-white p-8 my-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--brand-teal-light)] mb-2">
            Free Personalized Analysis
          </p>
          <h3 className="text-2xl font-bold mb-2">
            Is {peptideName} right for your biology?
          </h3>
          <p className="text-white/70 max-w-md">
            Take the 5-minute PeptidePilot quiz to get a personalized peptide
            match based on your goals, body, and lifestyle. Independent and
            vendor-neutral.
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
  );
}

function Disclaimer() {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 my-8">
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
      <p>
        <strong>Medical Disclaimer:</strong> The information on this page is for
        educational purposes only and does not constitute medical advice. Peptides
        discussed may be research compounds not approved for human use. Always
        consult a qualified healthcare provider before starting any peptide
        protocol.{" "}
        <Link href="/disclaimer" className="underline font-medium">
          Read our full disclaimer →
        </Link>
      </p>
    </div>
  );
}

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

export default function PeptideProfile({ params }: { params: { slug: string } }) {
  const peptide = getPeptideBySlug(params.slug);

  if (!peptide) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Peptide not found</h1>
        <Link href="/peptides">
          <Button variant="outline">← Back to Peptide Library</Button>
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
            headline: `${peptide.name}: Independent Guide — Mechanism, Dosage & Evidence`,
            description: peptide.metaDescription,
            author: { "@type": "Organization", name: "PeptidePilot" },
            publisher: { "@type": "Organization", name: "PeptidePilot" },
            mainEntityOfPage: `https://www.peptidepilot.me/peptides/${peptide.slug}`,
          }),
        }}
      />

      <div className="bg-[var(--brand-teal-pale)] border-b border-border">
        <div className="container py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link href="/peptides" className="hover:text-foreground">
              Peptide Library
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{peptide.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--brand-navy)] via-[var(--brand-navy-mid)] to-[oklch(0.32_0.10_220)] text-white py-16">
        <div className="container">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 mb-4">
              {peptide.categories.map((cat) => (
                <Badge
                  key={cat}
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  {cat}
                </Badge>
              ))}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight">
              {peptide.name}
            </h1>
            <p className="text-lg text-white/80 mb-2">{peptide.fullName}</p>
            <p className="text-xl text-[var(--brand-teal-light)] font-medium mb-6">
              {peptide.tagline}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs ${
                  EVIDENCE_COLOR[peptide.evidenceLevel] ??
                  "bg-gray-100 text-gray-700"
                }`}
              >
                <FlaskConical className="h-3 w-3" />
                {peptide.evidenceLevel}
              </span>
              <span className="text-white/60">{peptide.legalStatus}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-12">
            <Disclaimer />

            {/* Quick Reference */}
            <section>
              <h2 className="text-2xl font-bold mb-5">Quick Reference</h2>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ["Peptide Class", peptide.peptideClass],
                      ["Half-Life", peptide.halfLife],
                      [
                        "Administration",
                        peptide.administration.join(", "),
                      ],
                      ["Typical Dosage", peptide.typicalDosage],
                      ["Cycle Length", peptide.cycleLength],
                      ["Evidence Level", peptide.evidenceLevel],
                      ["Legal Status", peptide.legalStatus],
                      ["Approximate Cost", peptide.approximateCost],
                    ].map(([label, value]) => (
                      <tr
                        key={label}
                        className="border-b border-border last:border-0 odd:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium text-foreground w-44">
                          {label}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Mechanism */}
            <section>
              <h2 className="text-2xl font-bold mb-3">
                How {peptide.name} Works
              </h2>
              <p className="text-sm text-muted-foreground font-medium mb-3 italic">
                {peptide.mechanismSummary}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {peptide.mechanism}
              </p>
            </section>

            {/* Evidence */}
            <section>
              <h2 className="text-2xl font-bold mb-5">Evidence Base</h2>
              <div className="space-y-6">
                <div className="rounded-xl border border-border p-5">
                  <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-[var(--brand-teal)]" />
                    Preclinical Evidence
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {peptide.preclinicalEvidence}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-5">
                  <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--brand-teal)]" />
                    Human Evidence
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {peptide.humanEvidence}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-5">
                  <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[var(--brand-teal)]" />
                    Anecdotal Evidence
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {peptide.anecdotalEvidence}
                  </p>
                </div>
              </div>
              {peptide.pubmedLinks.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Key PubMed References:</p>
                  <div className="flex flex-wrap gap-2">
                    {peptide.pubmedLinks.map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[var(--brand-teal)] hover:underline"
                      >
                        <BookOpen className="h-3 w-3" />
                        PubMed [{i + 1}]
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <QuizCTA peptideName={peptide.name} />

            {/* Safety */}
            <section>
              <h2 className="text-2xl font-bold mb-5">Safety Profile</h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-border p-5">
                  <h3 className="font-semibold mb-2">Side Effects</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {peptide.sideEffects}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-semibold mb-2 text-amber-900">
                    Contraindications
                  </h3>
                  <p className="text-amber-800 text-sm leading-relaxed">
                    {peptide.contraindications}
                  </p>
                </div>
              </div>
            </section>

            {/* PeptidePilot Assessment */}
            <section className="rounded-xl border-2 border-[var(--brand-teal)] bg-[var(--brand-teal-pale)] p-6">
              <h2 className="text-xl font-bold mb-3 text-[var(--brand-navy)]">
                PeptidePilot Assessment
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {peptide.peptidePilotAssessment}
              </p>
              <p className="text-xs font-medium text-[var(--brand-teal)]">
                📊 {peptide.quizMatchRate}
              </p>
            </section>

            {/* FAQ */}
            {peptide.faqItems.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-5">
                  Frequently Asked Questions
                </h2>
                <div className="rounded-xl border border-border divide-y divide-border px-4">
                  {peptide.faqItems.map((item, i) => (
                    <FAQItem key={i} q={item.q} a={item.a} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Take the Quiz */}
            <div className="rounded-xl bg-gradient-to-br from-[var(--brand-navy)] to-[var(--brand-navy-mid)] text-white p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-teal-light)] mb-2">
                Free Analysis
              </p>
              <h3 className="font-bold text-lg mb-2">
                Is {peptide.name} right for you?
              </h3>
              <p className="text-white/70 text-sm mb-4">
                Take our 5-minute quiz for a personalized, vendor-neutral
                recommendation.
              </p>
              <Link href="/quiz">
                <Button className="w-full bg-[var(--brand-teal)] hover:bg-[var(--brand-teal-light)] text-white">
                  Take the Quiz →
                </Button>
              </Link>
            </div>

            {/* Stack Partners */}
            {peptide.stackPartners.length > 0 && (
              <div className="rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-3">Commonly Stacked With</h3>
                <div className="space-y-2">
                  {peptide.stackPartners.map((slug) => (
                    <Link
                      key={slug}
                      href={`/peptides/${slug}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <span className="font-medium capitalize">
                        {slug.replace(/-/g, " ").toUpperCase()}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Comparable Peptides */}
            {peptide.comparablePeptides.length > 0 && (
              <div className="rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-3">Compare With</h3>
                <div className="space-y-2">
                  {peptide.comparablePeptides.map((slug) => (
                    <Link
                      key={slug}
                      href={`/compare/${peptide.slug}-vs-${slug}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <span className="text-muted-foreground">
                        {peptide.name} vs{" "}
                        {slug.replace(/-/g, " ").toUpperCase()}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Primary Goals */}
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold mb-3">Best For</h3>
              <div className="flex flex-wrap gap-2">
                {peptide.primaryGoals.map((goalSlug) => (
                  <Link key={goalSlug} href={`/goals/${goalSlug}`}>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-[var(--brand-teal-pale)] capitalize"
                    >
                      {goalSlug.replace(/-/g, " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>

            {/* Disclaimer box */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <p className="font-semibold mb-1">⚠️ Research Compound Notice</p>
              <p>
                {peptide.name} is a research compound. This content is for
                educational purposes only. Consult a healthcare provider before
                use.
              </p>
            </div>
          </aside>
        </div>

        {/* Related Peptides */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Explore More Peptides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {peptidePages
              .filter((p) => p.slug !== peptide.slug)
              .slice(0, 6)
              .map((p) => (
                <Link key={p.slug} href={`/peptides/${p.slug}`}>
                  <div className="rounded-xl border border-border p-4 hover:border-[var(--brand-teal)] hover:shadow-sm transition-all cursor-pointer h-full">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-bold text-sm">{p.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          EVIDENCE_COLOR[p.evidenceLevel] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {p.evidenceLevel.split(" ")[0]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {p.tagline}
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
