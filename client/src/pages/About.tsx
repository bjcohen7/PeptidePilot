import { CheckCircle2, FlaskConical, ShieldCheck, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Seo, { buildBreadcrumbJsonLd } from "@/components/Seo";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="About PeptidePilot"
        description="Learn how PeptidePilot approaches independent peptide analysis, evidence-backed education, and transparent affiliate relationships."
        path="/about"
        type="website"
        jsonLd={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      {/* Hero */}
      <section className="bg-brand-gradient text-white py-20">
        <div className="container max-w-3xl text-center">
          <div className="section-badge mb-6" style={{ background: "oklch(1 0 0 / 0.1)", color: "white" }}>
            About Us
          </div>
          <h1 className="text-4xl md:text-5xl font-normal mb-5" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Built on Independence. Grounded in Science.
          </h1>
          <p className="text-white/75 text-lg leading-relaxed">
            PeptideMatch exists because the peptide space needed a platform with no agenda — one that puts your biology first, not a brand's bottom line.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-normal text-foreground mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Our Mission
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            The peptide industry is growing rapidly — and with that growth comes noise. Proprietary quiz funnels that recommend the same products regardless of your profile. Marketing dressed up as science. Affiliate-first recommendations masquerading as personalized advice.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            PeptideMatch was built as a direct response to this. We are an independent analysis platform. We don't manufacture peptides. We don't have exclusive relationships with any vendor. We don't have a proprietary product line to push. Our only objective is to match your unique biological profile to the compounds most supported by current research.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            When we recommend BPC-157 for joint recovery or Selank for anxiety, it's because the data supports it for your specific profile — not because we have inventory to move.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="py-20 bg-muted/40">
        <div className="container max-w-4xl">
          <h2 className="text-3xl font-normal text-foreground mb-10 text-center" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Our Core Principles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Radical Independence",
                body: "We have no financial relationships with any single peptide manufacturer or vendor. Our recommendations are driven by your profile, not our partnerships.",
              },
              {
                icon: FlaskConical,
                title: "Evidence First",
                body: "Every peptide in our database is supported by peer-reviewed research. We don't include compounds based on hype or anecdote alone.",
              },
              {
                icon: Users,
                title: "Your Biology, Not a Template",
                body: "Our 40-question quiz evaluates 27 distinct health aspects to build a genuinely personalized profile — not a generic archetype.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-border/60">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How We Make Money */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-normal text-foreground mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
            How We Sustain the Platform
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
            We believe in full transparency. PeptideMatch is free to use because we operate a sustainable business model built around two things:
          </p>
          <div className="space-y-4 mb-8">
            {[
              {
                title: "Affiliate Partnerships",
                body: "When you click a vendor link from your results page, we may earn a small commission. This never influences our recommendations — we list multiple vendors for every peptide so you can compare and choose.",
              },
              {
                title: "Healthcare Partner Connections",
                body: "For users who indicate interest in clinical-grade protocols or telehealth support, we may connect you with vetted healthcare providers. This connection is always opt-in and disclosed.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="flex gap-4 p-5 bg-secondary/40 rounded-xl border border-border/40">
                <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">{title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Our editorial independence is non-negotiable. No partner can influence which peptides we recommend or how we rank them. If you ever feel a recommendation doesn't fit your profile, we encourage you to retake the quiz or consult a qualified healthcare provider.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-brand-gradient text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-normal mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Ready to Find Your Match?
          </h2>
          <p className="text-white/75 mb-8">Take the free 5-minute quiz and get your personalized peptide profile.</p>
          <Link href="/quiz">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-6 h-auto rounded-xl">
              Take the Quiz
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
