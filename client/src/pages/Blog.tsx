import { Link } from "wouter";
import { Clock } from "lucide-react";
import Seo, { buildBreadcrumbJsonLd } from "@/components/Seo";
import { blogPosts } from "../../../shared/blog";

const CATEGORIES = ["All", ...Array.from(new Set(blogPosts.map((post) => post.category)))];
const SITE_URL = "https://www.peptidepilot.me";

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Peptide Science, Explained"
        description="Evidence-based peptide guides, profiles, sourcing advice, and metabolic-health explainers written to help people understand the science without the hype."
        path="/blog"
        type="website"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "PeptidePilot Learn",
            description:
              "Evidence-based peptide guides, profiles, and sourcing explainers from PeptidePilot.",
            url: `${SITE_URL}/blog`,
          },
          buildBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Learn", path: "/blog" },
          ]),
        ]}
      />
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
            {blogPosts.map((post) => (
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
