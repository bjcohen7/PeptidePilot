import { Link } from "wouter";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

// Static article content — in production this would come from the database
const ARTICLES: Record<string, {
  title: string;
  category: string;
  readTime: string;
  date: string;
  content: string;
}> = {
  "what-are-peptides": {
    title: "What Are Peptides? A Beginner's Guide to Bioregulators",
    category: "Education",
    readTime: "6 min read",
    date: "March 2025",
    content: `Peptides are short chains of amino acids — the same building blocks that make up proteins. The key difference is length: proteins typically contain hundreds or thousands of amino acids, while peptides are generally defined as chains of fewer than 50. This smaller size has profound implications for how they behave in the body.

Because of their compact structure, peptides can cross biological barriers more easily than proteins, bind to specific receptors with high precision, and be synthesized in a laboratory with relative consistency. These properties have made them increasingly attractive to researchers studying everything from wound healing to cognitive enhancement.

**How Peptides Work**

Peptides function primarily as biological messengers. Many naturally occurring peptides in the human body — such as insulin, oxytocin, and growth hormone-releasing hormone — act as signals that trigger specific physiological responses. Synthetic peptides are designed to mimic or modulate these natural signaling pathways.

The specificity of peptide action is one of their most important properties. Unlike broad-spectrum supplements, a well-characterized peptide typically targets a defined receptor or pathway. BPC-157, for example, appears to act on growth hormone receptors and nitric oxide pathways to accelerate tissue repair. Selank modulates GABA-A receptors and BDNF expression to produce anxiolytic effects.

**The Research Landscape**

It's important to understand where peptide research currently stands. The majority of evidence for research peptides comes from preclinical studies — primarily animal models. Human clinical trials exist for some compounds (particularly the GLP-1 class like semaglutide, and some growth hormone secretagogues), but many widely-discussed peptides have limited human data.

This doesn't mean the preclinical evidence is irrelevant — animal models often predict human responses reasonably well for certain mechanisms. But it does mean that extrapolating from rodent studies to human protocols requires caution.

**Why the Interest is Growing**

Several factors are driving increased interest in peptides. First, the success of GLP-1 agonists for metabolic health has demonstrated that peptide-based interventions can produce clinically meaningful outcomes. Second, advances in peptide synthesis have made research-grade compounds more accessible. Third, a growing community of biohackers and longevity researchers has created a body of anecdotal evidence that, while not rigorous, has generated hypotheses worth investigating.

**The Bottom Line**

Peptides represent a genuinely interesting frontier in health optimization. The science is real, the mechanisms are plausible, and for some compounds, the evidence is compelling. But the field also attracts significant hype, and the gap between what's proven and what's claimed is often large. Our goal at PeptideMatch is to help you navigate that gap — matching you to compounds where the evidence is strongest for your specific profile.`,
  },
  "bpc157-complete-guide": {
    title: "BPC-157: The Complete Guide to Body Protection Compound",
    category: "Peptide Profiles",
    readTime: "9 min read",
    date: "February 2025",
    content: `BPC-157 (Body Protection Compound-157) is a synthetic pentadecapeptide derived from a protein found in human gastric juice. It consists of 15 amino acids and has been the subject of extensive preclinical research, primarily in rodent models, demonstrating a remarkable range of regenerative and protective effects.

**Mechanism of Action**

BPC-157 appears to work through several overlapping mechanisms. It upregulates growth hormone receptors in tendon fibroblasts, accelerating the repair of connective tissue. It modulates nitric oxide synthesis, improving blood flow to injured areas. It interacts with the dopaminergic and serotonergic systems, which may explain some of its reported effects on mood and gut motility. And it appears to activate the FAK-paxillin pathway, which plays a central role in cell migration and wound healing.

**The Evidence Base**

The preclinical literature on BPC-157 is extensive and generally consistent. Studies have demonstrated accelerated healing of tendons, ligaments, muscles, bones, and gut tissue. Anti-inflammatory effects have been observed across multiple models. Gastroprotective effects — including protection against NSAID-induced damage — have been particularly well-replicated.

What's notably absent is robust human clinical trial data. BPC-157 has not completed Phase II or Phase III trials in humans for any indication. The human evidence is largely anecdotal, drawn from the biohacking and sports medicine communities.

**Common Applications**

Based on the preclinical evidence and anecdotal reports, BPC-157 is most commonly used for: accelerating recovery from tendon and ligament injuries, addressing chronic joint pain, supporting gut healing in conditions like IBS or leaky gut, and as a general recovery accelerator for athletes.

**Administration**

BPC-157 is typically administered via subcutaneous injection near the site of injury, though some users report benefits from oral administration for gut-related applications. Injectable protocols generally range from 200–500mcg per day, often in cycles of 4–6 weeks.

**Safety Profile**

In animal studies, BPC-157 has demonstrated a remarkably clean safety profile with no observed toxicity even at high doses. No serious adverse events have been reported in the anecdotal human literature. That said, the absence of formal human safety trials means long-term effects are unknown.

**PeptideMatch Assessment**

BPC-157 is one of the most consistently recommended peptides in our algorithm for users with joint pain, injury recovery needs, or gut health concerns. The preclinical evidence is among the strongest in the research peptide space, and the anecdotal human evidence is broadly consistent with the animal data.`,
  },
};

interface BlogArticleProps {
  params: { slug: string };
}

export default function BlogArticle({ params }: BlogArticleProps) {
  const article = ARTICLES[params.slug];

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Article Not Found
          </h1>
          <p className="text-muted-foreground mb-6">This article doesn't exist or has been moved.</p>
          <Link href="/blog">
            <Button variant="outline">Back to Learn</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-brand-gradient text-white py-14">
        <div className="container max-w-3xl">
          <Link href="/blog">
            <button className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Learn
            </button>
          </Link>
          <div className="section-badge mb-4" style={{ background: "oklch(1 0 0 / 0.1)", color: "white" }}>
            {article.category}
          </div>
          <h1 className="text-3xl md:text-4xl font-normal mb-4 leading-snug" style={{ fontFamily: "'DM Serif Display', serif" }}>
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-white/60 text-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {article.readTime}
            </div>
            <span>{article.date}</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-14">
        <div className="container max-w-3xl">
          <div className="prose prose-slate max-w-none">
            {article.content.split("\n\n").map((paragraph, idx) => {
              if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                return (
                  <h2
                    key={idx}
                    className="text-xl font-semibold text-foreground mt-8 mb-3"
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    {paragraph.replace(/\*\*/g, "")}
                  </h2>
                );
              }
              // Handle inline bold
              const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
              return (
                <p key={idx} className="text-muted-foreground leading-relaxed mb-4">
                  {parts.map((part, i) =>
                    part.startsWith("**") ? (
                      <strong key={i} className="text-foreground font-semibold">
                        {part.replace(/\*\*/g, "")}
                      </strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-12 p-6 bg-secondary/50 rounded-2xl border border-border/60 text-center">
            <h3 className="text-xl font-normal text-foreground mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
              Find Your Personalized Match
            </h3>
            <p className="text-muted-foreground text-sm mb-5">
              Take the free 5-minute quiz to discover which peptides are most relevant for your specific biology and goals.
            </p>
            <Link href="/quiz">
              <Button className="bg-brand-gradient text-white hover:opacity-90 font-semibold">
                Take the Free Quiz
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
