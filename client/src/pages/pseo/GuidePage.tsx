import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { guidePages } from "../../../../shared/pseoData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, Lightbulb, Clock, BarChart2, ChevronRight, BookOpen } from "lucide-react";

const DIFFICULTY_COLOR: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Intermediate: "bg-amber-100 text-amber-800 border-amber-200",
  Advanced: "bg-red-100 text-red-800 border-red-200",
};

export default function GuidePage() {
  const [, params] = useRoute("/guides/:slug");
  const slug = params?.slug ?? "";
  const guide = guidePages.find((g) => g.slug === slug);

  useEffect(() => {
    if (!guide) return;
    // HowTo schema — structurally distinct from Profile pages (which use MedicalEntity schema)
    const schema = {
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
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = JSON.stringify(schema);
    el.id = "howto-schema";
    document.head.querySelector("#howto-schema")?.remove();
    document.head.appendChild(el);
    document.title = `${guide.title} | PeptidePilot`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", guide.metaDescription);
    return () => document.head.querySelector("#howto-schema")?.remove();
  }, [guide]);

  if (!guide) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Guide Not Found</h1>
        <Link href="/guides"><Button variant="outline">Browse All Guides</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{guide.steps.length} steps</span>
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

        {/* ── What You Need ── */}
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

        {/* ── Steps ── */}
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

        {/* ── Common Mistakes ── */}
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
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Not sure which peptide is right for you?</h2>
          <p className="text-muted-foreground mb-4">Take our 5-minute quiz to get a personalized peptide recommendation based on your biology and goals.</p>
          <Link href="/quiz">
            <Button size="lg" className="font-semibold">
              Take the Free Quiz <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
