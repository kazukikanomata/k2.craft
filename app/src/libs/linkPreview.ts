// src/libs/linkPreview.ts
import type { Transformer } from "microcms-rich-editor-handler";

type OgpData = {
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
};

// Cloudflare Workers の fetch はエッジキャッシュ制御用に cf オプションを受け取れる
type CloudflareRequestInit = RequestInit & {
  cf?: { cacheTtl?: number; cacheEverything?: boolean };
};

const FETCH_TIMEOUT_MS = 5000;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 1週間

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

async function fetchOgpData(url: string): Promise<OgpData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; k2craft-linkpreview/1.0)",
      },
      cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true },
    } as CloudflareRequestInit);

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

function buildCardHtml(href: string, ogp: OgpData): string {
  const thumb = ogp.image
    ? `<span class="link-card-thumb"><img src="${escapeHtml(ogp.image)}" alt="" loading="lazy" /></span>`
    : "";
  const description = ogp.description
    ? `<span class="link-card-desc">${escapeHtml(ogp.description)}</span>`
    : "";

  return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="link-card not-prose">${thumb}<span class="link-card-body"><span class="link-card-title">${escapeHtml(ogp.title)}</span>${description}<span class="link-card-domain">${escapeHtml(ogp.domain)}</span></span></a>`;
}

/**
 * microCMSのリッチエディタでURLを貼り付けると、同じhrefを持つ
 * 「タイトル・抜粋・ドメイン」の連続した<p><a>...</a></p>（2〜3個）が生成される。
 * この連続グループを検出してOGPカードに変換する。
 */
export const linkPreviewTransformer = (): Transformer => {
  return async ($) => {
    const paragraphs = $("p").toArray();
    const groups: { href: string; els: typeof paragraphs }[] = [];

    const getSoleLinkHref = (el: (typeof paragraphs)[number]) => {
      const $el = $(el);
      const children = $el.children();
      if (children.length !== 1 || children.get(0)?.tagName !== "a") {
        return null;
      }
      if ($el.text().trim().length === 0) return null;
      return $(children.get(0)).attr("href")?.trim() ?? null;
    };

    let i = 0;
    while (i < paragraphs.length) {
      const href = getSoleLinkHref(paragraphs[i]);
      if (!href || !href.startsWith("http")) {
        i++;
        continue;
      }

      const group = [paragraphs[i]];
      let j = i + 1;
      while (j < paragraphs.length && getSoleLinkHref(paragraphs[j]) === href) {
        group.push(paragraphs[j]);
        j++;
      }

      groups.push({ href, els: group });
      i = j;
    }

    for (const { href, els } of groups) {
      // 単発のリンク段落（本文中の通常のリンク）は対象外。
      // microCMSのURL貼り付けで生成される2個以上連続した同一リンク段落のみカード化する
      if (els.length < 2) continue;

      const ogp = await fetchOgpData(href);
      if (!ogp) continue;

      $(els[0]).replaceWith(buildCardHtml(href, ogp));
      for (const el of els.slice(1)) {
        $(el).remove();
      }
    }
  };
};
