import { useRoute, Link } from "wouter";
import { guidePages } from "../../../../shared/pseoData";
import Seo, { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Lightbulb, Clock, BarChart2, ChevronRight, BookOpen } from "lucide-react";
import { Glp1ContentCta, isGlp1Topical } from "@/components/Glp1ContentCta";
import { isNoindexed } from "@shared/seoPruneList";
import { QUIZ_MINUTES } from "@shared/quizConfig";

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Intermediate: "bg-amber-100 text-amber-800 border-amber-200",
  Advanced: "bg-red-100 text-red-800 border-red-200",
};

export default function GuidePage() {
  const [, params] = useRoute("/guides/:slug");
  const slug = params?.slug ?? "";
  const guide = guidePages.find((g) => g.slug === slug);

  if (!guide) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Guide Not Found</h1>
        <Link href="/guides"><Button variant="outline">Browse All Guides</Button></Link>
      </div>
    );
  }

  const topical = isGlp1Topical({
    glp1Topical: guide.glp1Topical,
    categories: [guide.category],
    peptideSlugs: guide.targetPeptides,
    text: `${guide.slug} ${guide.h1}`,
  });

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: guide.h1,
    description: guide.metaDescription,
    totalTime: guide.timeRequired,
    tool: guide.whatYouNeed.map((t) => ({ "@type": "HowToTool", name: t })),
    step: guide.steps.map((s) => ({
      "@type": "HowToStep",
      position: s.stepNumber,
      name: s.title,
      text: s.description,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={guide.h1}
        description={guide.metaDescription}
        path={`/guides/${guide.slug}`}
        noindex={isNoindexed(`/guides/${guide.slug}`)}
        type="article"
        jsonLd={[
          // HowTo and FAQPage are emitted as inline <script> below so they land
          // in the prerendered HTML (Seo injects jsonLd client-side only). A
          // step-less guide (e.g. an unapproved injectable) emits neither HowTo
          // rich result nor steps — only prose + risks + FAQPage.
          buildBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: guide.title, path: `/guides/${guide.slug}` },
          ]),
        ]}
      />
      {guide.steps.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      )}
      {guide.faqItems.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildFaqPageJsonLd(guide.faqItems.map((f) => ({ question: f.q, answer: f.a }))),
            ),
          }}
        />
      )}
      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16">
        <div className="container max-w-4xl">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="border-slate-500 text-slate-300">{guide.category}</Badge>
            <Badge className={`border ${DIFFICULTY_COLOR[guide.difficulty]}`}>{guide.difficulty}</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{guide.h1}</h1>
          <p className="text-slate-300 text-lg mb-6 max-w-2xl">{guide.metaDescription}</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{guide.timeRequired}</span>
            <span className="flex items-center gap-1.5"><BarChart2 className="w-4 h-4" />{guide.difficulty}</span>
            {guide.steps.length > 0 && (
              <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{guide.steps.length} steps</span>
            )}
          </div>
        </div>
      </section>

      <div className="container max-w-4xl py-12">
        {/* ── Medical Disclaimer ── */}
        <Alert className="mb-8 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            This guide is for educational and research purposes only. Peptides discussed are research compounds, not FDA-approved medications. Consult a qualified healthcare provider before use.
          </AlertDescription>
        </Alert>

        {/* ── Overview ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">Overview</h2>
          <p className="text-muted-foreground leading-relaxed">{guide.overview}</p>
        </section>

        {/* ── Risks (safety-explainer guides) ── */}
        {guide.risks && guide.risks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">The risks</h2>
            <div className="space-y-3">
              {guide.risks.map((risk, i) => (
                <div key={i} className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {topical && <Glp1ContentCta topical placement="inline" utmContent={guide.slug} />}

        {/* ── What You Need ── */}
        {guide.whatYouNeed.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">What You Need</h2>
          <Card>
            <CardContent className="pt-5">
              <ul className="space-y-2">
                {guide.whatYouNeed.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
        )}

        {/* ── Steps ── */}
        {guide.steps.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-6">Step-by-Step Instructions</h2>
          <div className="space-y-6">
            {guide.steps.map((step) => (
              <div key={step.stepNumber} className="flex gap-4">
                {/* Step number */}
                <div className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {step.stepNumber}
                </div>
                <div className="flex-1 pb-6 border-b border-border last:border-0">
                  <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-3">{step.description}</p>
                  {step.tip && (
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                      <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
                      <span><strong>Tip:</strong> {step.tip}</span>
                    </div>
                  )}
                  {step.warning && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800 mt-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                      <span><strong>Warning:</strong> {step.warning}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* ── Common Mistakes ── */}
        {guide.commonMistakes.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Common Mistakes to Avoid</h2>
          <div className="space-y-3">
            {guide.commonMistakes.map((item, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-sm text-red-700 mb-1">{item.mistake}</p>
                      <p className="text-sm text-muted-foreground"><span className="font-medium text-emerald-700">Fix:</span> {item.fix}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        )}

        <Separator className="my-10" />

        {/* ── FAQ ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {guide.faqItems.map((faq, i) => (
              <div key={i} className="border rounded-lg p-4">
                <p className="font-semibold text-sm mb-2">{faq.q}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related Peptides ── */}
        {guide.relatedPeptides.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Peptides Covered in This Guide</h2>
            <div className="flex flex-wrap gap-2">
              {guide.relatedPeptides.map((slug) => (
                <Link key={slug} href={`/peptides/${slug}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors capitalize">
                    {slug.replace(/-/g, " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Related Guides ── */}
        {guide.relatedGuides.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Related Guides</h2>
            <div className="grid gap-2">
              {guide.relatedGuides.map((relSlug) => {
                const rel = guidePages.find((g) => g.slug === relSlug);
                if (!rel) return null;
                return (
                  <Link key={relSlug} href={`/guides/${relSlug}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <span className="text-sm font-medium">{rel.title}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Quiz CTA ── */}
        {topical ? (
          <Glp1ContentCta topical placement="end" utmContent={guide.slug} />
        ) : (
          <Glp1ContentCta topical={false} placement="footer" />
        )}
      </div>
    </div>
  );
}
