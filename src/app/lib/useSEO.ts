import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
}

const SITE_NAME = "더웰파트너";
const SITE_URL = "https://thewellpartner.com";
const DEFAULT_DESC = "30년 경험의 생산도급, 인력파견, 채용 전문 기업 더웰파트너입니다. 기업 맞춤형 인력 솔루션을 제공합니다.";
const DEFAULT_KEYWORDS = "생산도급, 인력파견, 채용, 인력관리, 더웰파트너, 생산인력, 도급";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function useSEO({
  title,
  description = DEFAULT_DESC,
  keywords = DEFAULT_KEYWORDS,
  ogImage,
  ogType = "website",
  canonical,
}: SEOProps) {
  useEffect(() => {
    // Title
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    // Basic meta
    setMeta("description", description);
    setMeta("keywords", keywords);
    setMeta("author", "더웰파트너");

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    if (ogImage) setMeta("og:image", ogImage, "property");
    const pageUrl = canonical || `${SITE_URL}${window.location.pathname}`;
    setMeta("og:url", pageUrl, "property");
    setLink("canonical", pageUrl);

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    if (ogImage) setMeta("twitter:image", ogImage);

    // Naver verification (placeholder)
    // setMeta("naver-site-verification", "xxx");
  }, [title, description, keywords, ogImage, ogType, canonical]);
}
