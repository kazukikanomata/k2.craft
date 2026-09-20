// src/libs/linkPreview.ts
type OgpData = {
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
};

const FETCH_TIMEOUT_MS = 5000;

// meta content属性の値はHTMLエンティティでエスケープされているため、
// 抽出時にデコードしておく（出力時にescapeHtmlで再エスケープするため二重エスケープを防ぐ）
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function extractMetaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtmlEntities(match[1]);
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

export async function fetchOgpData(url: string): Promise<OgpData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; k2craft-linkpreview/1.0)",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const domain = new URL(url).hostname;

    const title =
      extractMetaContent(html, "og:title") || extractTitle(html) || domain;
    const description =
      extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "description");
    const image = extractMetaContent(html, "og:image");

    return {
      title,
      description,
      image: image ? new URL(image, url).toString() : null,
      domain,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildCardHtml(href: string, ogp: OgpData): string {
  const thumb = ogp.image
    ? `<span class="link-card-thumb"><img src="${escapeHtml(ogp.image)}" alt="" loading="lazy" /></span>`
    : "";
  const description = ogp.description
    ? `<span class="link-card-desc">${escapeHtml(ogp.description)}</span>`
    : "";

  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="link-card not-prose">${thumb}<span class="link-card-body"><span class="link-card-title">${escapeHtml(ogp.title)}</span>${description}<span class="link-card-domain">${escapeHtml(ogp.domain)}</span></span></a>`;
}
