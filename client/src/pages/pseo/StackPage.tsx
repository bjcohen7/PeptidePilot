import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  DollarSign,
  Clock,
  Syringe,
} from "lucide-react";
import { useState } from "react";
import { getStackBySlug, stackPages } from "../../../../shared/pseoData";

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

export default function StackPage({ params }: { params: { slug: string } }) {
  const stack = getStackBySlug(params.slug);

  if (!stack) {
    return (
      <div className="container py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Stack not found</h1>
        <Link href="/stacks">
          <Button variant="outline">← Back to Stacks</Button>
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
            headline: stack.h1,
            description: stack.metaDescription,
            author: { "@type": "Organization", name: "PeptidePilot" },
            publisher: { "@type": "Organization", name: "PeptidePilot" },
            mainEntityOfPage: `https://peptidepilot.me/stacks/${stack.slug}`,
          }),
        }}
      />

      {/* Breadcrumb */}
      <div className="bg-[var(--brand-teal-pale)] border-b border-border">
        <div className="container py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link href="/stacks" className="hover:text-foreground">Stacks</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{stack.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--brand-navy)] via-[var(--brand-navy-mid)] to-[oklch(0.32_0.10_220)] text-white py-16">
        <div className="container max-w-3xl">
          <div className="flex flex-wrap gap-2 mb-4">
            {stack.peptideNames.map((name) => (
              <Badge
                key={name}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                {name}
              </Badge>
            ))}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            {stack.h1}
          </h1>
          <p className="text-lg text-white/75 mb-6">{stack.tagline}</p>
          <div className="flex flex-wrap gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              {stack.peptideNames.length} peptides
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              {stack.costEstimate}
            </span>
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
                <strong>Medical Disclaimer:</strong> This content is for
                educational purposes only. Multi-peptide stacks are advanced
                protocols. Always consult a qualified healthcare provider before
                starting any peptide protocol.{" "}
                <Link href="/disclaimer" className="underline font-medium">
                  Full disclaimer →
                </Link>
              </p>
            </div>

            {/* Synergy Explanation */}
            <section>
              <h2 className="text-2xl font-bold mb-4">
                Why These Peptides Work Together
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {stack.synergyExplanation}
              </p>
            </section>

            {/* Protocol */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Protocol Overview</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {stack.protocol}
              </p>

              {/* Dosing Schedule Table */}
              <h3 className="font-semibold text-lg mb-3">Dosing Schedule</h3>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--brand-navy)] text-white">
                      <th className="px-4 py-3 text-left font-medium">Peptide</th>
                      <th className="px-4 py-3 text-left font-medium">Dose</th>
                      <th className="px-4 py-3 text-left font-medium">Timing</th>
                      <th className="px-4 py-3 text-left font-medium">Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stack.dosingSchedule.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border last:border-0 odd:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium">{row.peptide}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.dose}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.timing}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.route}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Who is it for */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-semibold text-emerald-900 mb-3">
                  ✓ Who This Stack Is For
                </h3>
                <p className="text-emerald-800 text-sm leading-relaxed">
                  {stack.whoIsItFor}
                </p>
              </div>
              <div className="rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-3">Evidence Base</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {stack.evidenceBase}
                </p>
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
                    Is this stack right for your biology?
                  </h3>
                  <p className="text-white/70 max-w-md">
                    Take the 5-minute PeptidePilot quiz to get a personalized
                    peptide recommendation based on your goals, body, and
                    lifestyle. Vendor-neutral.
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
            {stack.faqItems.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-5">
                  Frequently Asked Questions
                </h2>
                <div className="rounded-xl border border-border divide-y divide-border px-4">
                  {stack.faqItems.map((item, i) => (
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
                Is this stack right for you?
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

            {/* Stack Components */}
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold mb-3">Stack Components</h3>
              <div className="space-y-2">
                {stack.peptides.map((slug, i) => (
                  <Link
                    key={slug}
                    href={`/peptides/${slug}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                  >
                    <span className="font-medium">
                      {stack.peptideNames[i]}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Cost */}
            <div className="rounded-xl border border-border p-5">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[var(--brand-teal)]" />
                Estimated Cost
              </h3>
              <p className="text-sm text-muted-foreground">
                {stack.costEstimate}
              </p>
            </div>

            {/* Related Goals */}
            {stack.goalSlugs.length > 0 && (
              <div className="rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-3">Addresses These Goals</h3>
                <div className="flex flex-wrap gap-2">
                  {stack.goalSlugs.map((slug) => (
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
              <p className="font-semibold mb-1">⚠️ Advanced Protocol</p>
              <p>
                Multi-peptide stacks require careful consideration of
                interactions and individual health factors. Physician supervision
                is recommended.
              </p>
            </div>
          </aside>
        </div>

        {/* Other Stacks */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Explore Other Stacks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stackPages
              .filter((s) => s.slug !== stack.slug)
              .map((s) => (
                <Link key={s.slug} href={`/stacks/${s.slug}`}>
                  <div className="rounded-xl border border-border p-4 hover:border-[var(--brand-teal)] hover:shadow-sm transition-all cursor-pointer h-full">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {s.peptideNames.map((n) => (
                        <Badge
                          key={n}
                          variant="secondary"
                          className="text-xs"
                        >
                          {n}
                        </Badge>
                      ))}
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{s.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {s.tagline}
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
