import { useRoute, Link } from "wouter";
import { forConditionPages } from "../../../../shared/pseoData";
import Seo, { buildBreadcrumbJsonLd } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ChevronRight, Activity, Pill, FlaskConical, Star } from "lucide-react";

const EVIDENCE_COLOR: Record<string, string> = {
  "Strong human (FDA approved)": "bg-emerald-100 text-emerald-800",
  "Strong preclinical / limited human": "bg-blue-100 text-blue-800",
  "Moderate human (Russian clinical trials)": "bg-blue-100 text-blue-800",
  "Moderate preclinical": "bg-amber-100 text-amber-800",
  "Preclinical": "bg-orange-100 text-orange-800",
  "Preclinical / limited human": "bg-orange-100 text-orange-800",
  "Moderate preclinical / anecdotal human": "bg-amber-100 text-amber-800",
  "Moderate preclinical / limited human": "bg-amber-100 text-amber-800",
};

export default function ForConditionPage() {
  const [, params] = useRoute("/for/:slug");
  const slug = params?.slug ?? "";
  const page = forConditionPages.find((p) => p.slug === slug);

  if (!page) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
        <Link href="/peptides"><Button variant="outline">Browse Peptides</Button></Link>
      </div>
    );
  }

  const conditionSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name: page.condition,
    description: page.conditionOverview,
    signOrSymptom: page.symptoms.map((s) => ({ "@type": "MedicalSymptom", name: s })),
    possibleTreatment: page.topPeptides.map((p) => ({
      "@type": "MedicalTherapy",
      name: p.peptideName,
      description: p.mechanism,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={page.h1}
        description={page.metaDescription}
        path={`/for/${page.slug}`}
        type="article"
        jsonLd={[
          conditionSchema,
          buildBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "For", path: "/for" },
            { name: page.condition, path: `/for/${page.slug}` },
          ]),
        ]}
      />
      <script type="application/ld+json">{JSON.stringify(conditionSchema)}</script>
      {/* ── Hero — symptom-first layout ── */}
      <section className="bg-gradient-to-br from-rose-950 via-slate-900 to-slate-900 text-white py-16">
        <div className="container max-w-4xl">
          <Badge variant="outline" className="border-rose-400 text-rose-300 mb-4">{page.category}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{page.h1}</h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">{page.metaDescription}</p>
          {page.prevalence && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2 text-sm text-slate-200">
              <Activity className="w-4 h-4 text-rose-400" />
              {page.prevalence}
            </div>
          )}
        </div>
      </section>

      <div className="container max-w-4xl py-12">
        {/* ── Medical Disclaimer ── */}
        <Alert className="mb-8 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            This page is for educational purposes only and does not constitute medical advice. Peptides discussed are research compounds. Always consult a qualified healthcare provider for diagnosis and treatment.
          </AlertDescription>
        </Alert>

        {/* ── Condition Overview ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3">Understanding {page.condition}</h2>
          <p className="text-muted-foreground leading-relaxed">{page.conditionOverview}</p>
        </section>

        {/* ── Symptoms — symptom-first, key differentiator from Profile pages ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" />
            Common Symptoms
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {page.symptoms.map((symptom, i) => (
              <div key={i} className="flex items-center gap-2 p-3 border rounded-lg bg-rose-50/50 border-rose-100">
                <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                <span className="text-sm">{symptom}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Conventional Treatments ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Pill className="w-5 h-5 text-slate-500" />
            Conventional Treatments
          </h2>
          <div className="flex flex-wrap gap-2">
            {page.conventionalTreatments.map((t, i) => (
              <Badge key={i} variant="secondary" className="text-sm py-1 px-3">{t}</Badge>
            ))}
          </div>
        </section>

        <Separator className="my-8" />

        {/* ── How Peptides Help ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            How Peptides May Help
          </h2>
          <p className="text-muted-foreground leading-relaxed">{page.howPeptidesHelp}</p>
        </section>

        {/* ── Top Peptides — ranked list ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-6">Top Peptides for {page.condition}</h2>
          <div className="space-y-4">
            {page.topPeptides.map((peptide) => (
              <Card key={peptide.peptideSlug} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {peptide.rank}
                      </span>
                      <Link href={`/peptides/${peptide.peptideSlug}`} className="hover:text-primary transition-colors">
                        {peptide.peptideName}
                      </Link>
                    </CardTitle>
                    <Badge className={`text-xs ${EVIDENCE_COLOR[peptide.evidenceLevel] ?? "bg-slate-100 text-slate-700"}`}>
                      {peptide.evidenceLevel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-2"><strong>Mechanism:</strong> {peptide.mechanism}</p>
                  <p className="text-sm text-muted-foreground"><strong>Typical dose:</strong> {peptide.typicalDose}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Protocol Suggestion ── */}
        <section className="mb-10">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Suggested Starting Protocol</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{page.protocolSuggestion}</p>
            </CardContent>
          </Card>
        </section>

        {/* ── Important Caveats ── */}
        <section className="mb-10">
          <Alert className="border-slate-200 bg-slate-50">
            <AlertTriangle className="h-4 w-4 text-slate-600" />
            <AlertDescription className="text-slate-700 text-sm leading-relaxed">
              <strong>Important:</strong> {page.importantCaveats}
            </AlertDescription>
          </Alert>
        </section>

        <Separator className="my-10" />

        {/* ── FAQ ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {page.faqItems.map((faq, i) => (
              <div key={i} className="border rounded-lg p-4">
                <p className="font-semibold text-sm mb-2">{faq.q}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related Conditions ── */}
        {page.relatedConditions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Related Conditions</h2>
            <div className="flex flex-wrap gap-2">
              {page.relatedConditions.map((condSlug) => {
                const rel = forConditionPages.find((p) => p.slug === condSlug);
                return (
                  <Link key={condSlug} href={`/for/${condSlug}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors capitalize py-1 px-3">
                      {rel ? rel.condition : condSlug.replace(/-/g, " ")}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Quiz CTA ── */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <Star className="w-8 h-8 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Find the right peptide for your biology</h2>
          <p className="text-muted-foreground mb-4">Take our 5-minute quiz to get a personalized peptide recommendation based on your specific goals and health profile.</p>
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
