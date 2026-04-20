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
};

export type LegacyBlogPost = BlogPostSummary & {
  intro: string;
  sections: BlogSection[];
};

export type GeneratedBlogPost = BlogPostSummary & {
  contentHtml: string;
};

export type BlogPost = LegacyBlogPost | GeneratedBlogPost;
