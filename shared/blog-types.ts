export type BlogSection = {
  heading: string;
  paragraphs: string[];
};

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  publishedAt: string;
  /** Per-page GLP-1 topicality override. Optional — the isGlp1Topical() classifier supplies the default when unset. */
  glp1Topical?: boolean;
};

export type LegacyBlogPost = BlogPostSummary & {
  intro: string;
  sections: BlogSection[];
};

export type GeneratedBlogPost = BlogPostSummary & {
  contentHtml: string;
};

export type BlogPost = LegacyBlogPost | GeneratedBlogPost;
