import { Link } from "wouter";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Seo, { buildBreadcrumbJsonLd } from "@/components/Seo";
import { getBlogPost } from "../../../shared/blog";

interface BlogArticleProps {
  params: { slug: string };
}

const SITE_URL = "https://www.peptidepilot.me";

export default function BlogArticle({ params }: BlogArticleProps) {
  const article = getBlogPost(params.slug);

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
      <Seo
        title={article.title}
        description={article.excerpt}
        path={`/blog/${article.slug}`}
        type="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: article.title,
            description: article.excerpt,
            datePublished: article.publishedAt,
            author: {
              "@type": "Organization",
              name: "PeptidePilot",
            },
            publisher: {
              "@type": "Organization",
              name: "PeptidePilot",
            },
            mainEntityOfPage: `${SITE_URL}/blog/${article.slug}`,
          },
          buildBreadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Learn", path: "/blog" },
            { name: article.title, path: `/blog/${article.slug}` },
          ]),
        ]}
      />
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
            <p className="text-muted-foreground leading-relaxed mb-8 text-lg">{article.intro}</p>
            {article.sections.map((section) => (
              <div key={section.heading} className="mb-8">
                <h2
                  className="text-xl font-semibold text-foreground mt-8 mb-3"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-muted-foreground leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
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
