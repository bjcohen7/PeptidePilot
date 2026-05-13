import { useEffect, useState } from "react";
import type { BlogPost } from "@shared/blog";
import type { PseoContentRecord } from "@shared/pseoContent";

const blogPostCache = new Map<string, BlogPost | null>();
const pseoContentCache = new Map<string, PseoContentRecord | null>();

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export function useStaticBlogPost(slug: string) {
  const [article, setArticle] = useState<BlogPost | null>(() => blogPostCache.get(slug) ?? null);
  const [isLoading, setIsLoading] = useState(!blogPostCache.has(slug));

  useEffect(() => {
    let cancelled = false;

    if (blogPostCache.has(slug)) {
      setArticle(blogPostCache.get(slug) ?? null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    void fetchJson<BlogPost>(`/data/blog/${slug}.json`).then((result) => {
      blogPostCache.set(slug, result);
      if (!cancelled) {
        setArticle(result);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { article, isLoading };
}

export function useStaticPseoContent(pathname: string) {
  const [content, setContent] = useState<PseoContentRecord | null>(
    () => pseoContentCache.get(pathname) ?? null
  );
  const [isLoading, setIsLoading] = useState(!pseoContentCache.has(pathname));

  useEffect(() => {
    let cancelled = false;

    if (pseoContentCache.has(pathname)) {
      setContent(pseoContentCache.get(pathname) ?? null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const normalizedPath = pathname.replace(/^\//, "");
    void fetchJson<PseoContentRecord>(`/data/pseo/${normalizedPath}.json`).then((result) => {
      pseoContentCache.set(pathname, result);
      if (!cancelled) {
        setContent(result);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return { content, isLoading };
}
