import { generatedBlogPostContent } from "./blog-content.generated";
import { legacyBlogPosts } from "./blog-legacy";
import type { BlogPost, GeneratedBlogPost } from "./blog-types";

const generatedPostsBySlug = generatedBlogPostContent as Record<string, GeneratedBlogPost>;

export function getBlogPost(slug: string): BlogPost | undefined {
  return generatedPostsBySlug[slug] ?? legacyBlogPosts.find((post) => post.slug === slug);
}
