import { useRoute, Link } from "wouter";
import { reviewPages } from "../../../../shared/pseoData";
import Seo, { buildBreadcrumbJsonLd } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle, ChevronRight, Star } from "lucide-react";

function RatingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="text-sm font-semibold w-8 text-right">{value}/10</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${star <= Math.round(rating / 2) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`}
        />
      ))}
      <span className="ml-2 text-lg font-bold">{rating}/10</span>
    </div>
  );
}

export default function ReviewPage() {
  const [, params] = useRoute("/reviews/:slug");
  const slug = params?.slug ?? "";
  const review = reviewPages.find((r) => r.slug === slug);

  if (!review) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Review Not Found</h1>
        <Link href="/peptides"><Button variant="outline">Browse Peptides</Button></Link>
      </div>
    );
  }

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Review",
    name: review.h1,
    description: review.metaDescription,
    reviewBody: review.verdictParagraph,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.overallRating,
      bestRating: 10,
      worstRating: 1,
    },
    itemReviewed: {
      "@type": "Drug",
      name: review.peptideName,
    },
    author: {
      "@type": "Organization",
      name: "PeptidePilot",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={review.h1}
        description={review.metaDescription}
        path={`/reviews/${review.slug}`}
        type="article"
        jsonLd={[
          reviewSchema,
          buildBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Reviews", path: "/reviews" },
            { name: review.h1, path: `/reviews/${review.slug}` },
          ]),
        ]}
      />
      <script type="application/ld+json">{JSON.stringify(reviewSchema)}</script>
      {/* ── Hero — verdict-first layout ── */}
      <section className="bg-gradient-to-br from-violet-950 via-slate-900 to-slate-900 text-white py-16">
        <div className="container max-w-4xl">
          <Badge variant="outline" className="border-violet-400 text-violet-300 mb-4">{review.category}</Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{review.h1}</h1>
          <p className="text-slate-300 text-lg mb-6 max-w-2xl">{review.reviewSummary}</p>
          {/* Overall rating — visible above the fold, key differentiator */}
          <div className="inline-flex items-center gap-4 bg-white/10 rounded-xl px-6 py-4">
            <div>
              <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">Overall Rating</p>
              <StarRating rating={review.overallRating} />
            </div>
          </div>
        </div>
      </section>

      <div className="container max-w-4xl py-12">
        {/* ── Medical Disclaimer ── */}
        <Alert className="mb-8 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            This is an independent, vendor-neutral assessment for educational purposes. Peptides discussed are research compounds, not FDA-approved medications (unless noted). Consult a qualified healthcare provider before use.
          </AlertDescription>
        </Alert>

        {/* ── Rating Breakdown ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-6">Rating Breakdown</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <RatingBar label="Evidence Quality" value={review.ratingBreakdown?.evidenceQuality ?? 0} />
              <RatingBar label="Side Effect Profile" value={review.ratingBreakdown?.sideEffectProfile ?? 0} />
              <RatingBar label="Value for Money" value={review.ratingBreakdown?.valueForMoney ?? 0} />
              <RatingBar label="Ease of Use" value={review.ratingBreakdown?.easeOfUse ?? 0} />
              <RatingBar label="User Satisfaction" value={review.ratingBreakdown?.userSatisfaction ?? 0} />
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Overall</span>
                <StarRating rating={review.overallRating} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Pros & Cons — key structural differentiator ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Pros & Cons</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Pros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(review.pros ?? []).map((pro, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Cons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(review.cons ?? []).map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Who Should Consider / Avoid ── */}
        <section className="mb-10">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-800">Who Should Consider</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-emerald-700 leading-relaxed">{review.whoShouldConsider}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800">Who Should Avoid</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700 leading-relaxed">{review.whoShouldAvoid}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Verdict ── */}
        <section className="mb-10">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Our Verdict
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{review.verdictParagraph}</p>
              <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between flex-wrap gap-3">
                <StarRating rating={review.overallRating} />
                <Link href={`/peptides/${review.peptideSlug}`}>
                  <Button variant="outline" size="sm">
                    Full {review.peptideName} Profile <ChevronRight className="ml-1 w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="my-10" />

        {/* ── FAQ ── */}
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {(review.faqItems ?? []).map((faq, i) => (
              <div key={i} className="border rounded-lg p-4">
                <p className="font-semibold text-sm mb-2">{faq.q}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Alternatives ── */}
        {(review.alternativesToConsider ?? []).length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Alternatives to Consider</h2>
            <div className="flex flex-wrap gap-2">
              {(review.alternativesToConsider ?? []).map((altSlug) => (
                <Link key={altSlug} href={`/peptides/${altSlug}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors capitalize py-1 px-3">
                    {altSlug.replace(/-/g, " ")}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Quiz CTA ── */}
        <section className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Is {review.peptideName} right for your biology?</h2>
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
