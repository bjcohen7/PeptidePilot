import { useEffect } from "react";

type JsonLd = Record<string, unknown>;

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  noindex?: boolean;
  image?: string;
  jsonLd?: JsonLd | JsonLd[];
}

function getSiteOrigin() {
  if (typeof window !== "undefined" && window.location.origin) return window.location.origin;
  return ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SITE_URL ||
    (typeof process !== "undefined" ? process.env.VITE_SITE_URL : undefined) ||
    "https://www.peptidepilot.me");
}

function normalizePath(path: string) {
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

function absoluteUrl(path?: string) {
  const origin = getSiteOrigin().replace(/\/$/, "");
  if (!path) return origin;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = normalizePath(path.startsWith("/") ? path : `/${path}`);
  return `${origin}${normalized}`;
}

function upsertMeta(attribute: "name" | "property", value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${value}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export default function Seo({
  title,
  description,
  path,
  type = "website",
  noindex = false,
  image,
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    const canonicalPath = normalizePath(path || (typeof window !== "undefined" ? window.location.pathname : "/"));
    const canonical = absoluteUrl(canonicalPath);
    const normalizedTitle = title.includes("PeptidePilot") ? title : `${title} | PeptidePilot`;
    const normalizedImage = absoluteUrl(image || "/apple-touch-icon.png");
    const normalizedJsonLd = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

    document.title = normalizedTitle;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    upsertMeta("property", "og:title", normalizedTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:site_name", "PeptidePilot");
    upsertMeta("name", "twitter:card", "summary");
    upsertMeta("name", "twitter:title", normalizedTitle);
    upsertMeta("name", "twitter:description", description);

    if (normalizedImage) {
      upsertMeta("property", "og:image", normalizedImage);
      upsertMeta("name", "twitter:image", normalizedImage);
    }

    upsertLink("canonical", canonical);

    document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((node) => node.remove());
    normalizedJsonLd.forEach((entry) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seoJsonld = "true";
      script.textContent = JSON.stringify(entry);
      document.head.appendChild(script);
    });
  }, [description, image, jsonLd, noindex, path, title, type]);

  return null;
}
