import { generatedBlogPostIndex } from "./blog-index.generated";
import { legacyBlogPosts } from "./blog-legacy";
import type { BlogPostSummary } from "./blog-types";

export type {
  BlogPost,
  BlogPostSummary,
  BlogSection,
  GeneratedBlogPost,
  LegacyBlogPost,
} from "./blog-types";

export const blogPosts: readonly BlogPostSummary[] = [
  ...generatedBlogPostIndex,
  ...legacyBlogPosts.map(({ slug, title, excerpt, category, readTime, date, publishedAt }) => ({
    slug,
    title,
    excerpt,
    category,
    readTime,
    date,
    publishedAt,
  })),
];

export function getBlogPostSummary(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
