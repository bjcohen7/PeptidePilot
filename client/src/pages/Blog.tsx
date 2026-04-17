import { Link } from "wouter";
import { ArrowRight, Clock } from "lucide-react";

const BLOG_POSTS = [
  {
    slug: "what-are-peptides",
    title: "What Are Peptides? A Beginner's Guide to Bioregulators",
    excerpt: "Peptides are short chains of amino acids that act as biological messengers in the body. Learn how they differ from proteins, why they're gaining traction in health optimization, and what the research actually says.",
    category: "Education",
    readTime: "6 min read",
    date: "March 2025",
  },
  {
    slug: "bpc157-complete-guide",
    title: "BPC-157: The Complete Guide to Body Protection Compound",
    excerpt: "BPC-157 has become one of the most widely discussed peptides in the recovery and injury-healing space. We break down the preclinical evidence, proposed mechanisms, and what users typically report.",
    category: "Peptide Profiles",
    readTime: "9 min read",
    date: "February 2025",
  },
  {
    slug: "glp1-peptides-explained",
    title: "GLP-1 Peptides Explained: Semaglutide, Tirzepatide, and the Metabolic Revolution",
    excerpt: "The GLP-1 class of peptides has transformed the conversation around metabolic health and weight management. Here's what the clinical data actually shows — and what it doesn't.",
    category: "Metabolic Health",
    readTime: "11 min read",
    date: "January 2025",
  },
  {
    slug: "peptides-for-sleep",
    title: "Peptides for Sleep: DSIP, Epithalon, and the Science of Restorative Rest",
    excerpt: "Poor sleep is one of the most common complaints we see in quiz responses. Several peptides have demonstrated meaningful effects on sleep architecture. Here's what the evidence shows.",
    category: "Sleep & Recovery",
    readTime: "7 min read",
    date: "December 2024",
  },
  {
    slug: "how-to-source-peptides-safely",
    title: "How to Source Peptides Safely: What to Look For in a Vendor",
    excerpt: "The peptide market is largely unregulated, which means quality varies enormously. This guide covers the key markers of a trustworthy vendor — from third-party testing to certificate of analysis standards.",
    category: "Sourcing Guide",
    readTime: "8 min read",
    date: "November 2024",
  },
  {
    slug: "cognitive-peptides-selank-semax",
    title: "Selank and Semax: The Nootropic Peptides Backed by Decades of Research",
    excerpt: "Developed in Russia and studied extensively for their cognitive and anxiolytic properties, Selank and Semax remain among the most evidence-backed options for mental performance and stress resilience.",
    category: "Cognition",
    readTime: "10 min read",
    date: "October 2024",
  },
];

const CATEGORIES = ["All", "Education", "Peptide Profiles", "Metabolic Health", "Sleep & Recovery", "Sourcing Guide", "Cognition"];

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="bg-brand-gradient text-white py-16">
        <div className="container max-w-3xl text-center">
          <div className="section-badge mb-4" style={{ background: "oklch(1 0 0 / 0.1)", color: "white" }}>
            Learn
          </div>
          <h1 className="text-4xl md:text-5xl font-normal mb-4" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Peptide Science, Explained
          </h1>
          <p className="text-white/75 text-lg">
            Evidence-based guides, peptide profiles, and sourcing advice — written for people who want to understand the science, not just follow the hype.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <div className="border-b border-border/60 bg-white sticky top-16 z-30">
        <div className="container">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border border-border/60 text-muted-foreground hover:border-accent/60 hover:text-accent transition-colors bg-white"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <article className="group bg-white rounded-2xl border border-border/60 overflow-hidden hover:shadow-md hover:border-accent/30 transition-all h-full flex flex-col">
                  {/* Category color bar */}
                  <div className="h-1 bg-teal-gradient" />
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="section-badge text-xs">{post.category}</span>
                    </div>
                    <h2 className="font-semibold text-foreground text-lg leading-snug mb-3 group-hover:text-accent transition-colors" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/40">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readTime}
                      </div>
                      <span>{post.date}</span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
