#!/usr/bin/env node
// WordPress REST APIから全記事と画像(メディア)情報を取得してJSONに保存する

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SITE_URL = process.env.WP_SITE_URL ?? "https://www.voyage-to-the-new-world.com";
const OUTPUT_DIR = process.env.WP_OUTPUT_DIR ?? "./backup";
const PER_PAGE = 100; // WP REST APIの最大値

/**
 * 指定エンドポイントの全ページを取得する。
 * レスポンスヘッダ X-WP-TotalPages を見てページネーションする。
 */
async function fetchAll(endpoint) {
  const results = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = new URL(`/wp-json/wp/v2/${endpoint}`, SITE_URL);
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("page", String(page));

    const res = await fetch(url);

    if (!res.ok) {
      // 最終ページを超えると400が返るAPI実装があるため、その場合はループ終了とする
      if (res.status === 400 && page > 1) break;
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    results.push(...data);

    totalPages = Number(res.headers.get("X-WP-TotalPages") ?? "1");
    console.log(`  ${endpoint}: page ${page}/${totalPages} (+${data.length}件)`);
    page += 1;
  } while (page <= totalPages);

  return results;
}

function simplifyPost(post) {
  return {
    id: post.id,
    date: post.date,
    modified: post.modified,
    slug: post.slug,
    link: post.link,
    status: post.status,
    title: post.title?.rendered ?? "",
    content: post.content?.rendered ?? "",
    excerpt: post.excerpt?.rendered ?? "",
    author: post.author,
    featured_media: post.featured_media,
    categories: post.categories,
    tags: post.tags,
  };
}

function simplifyMedia(media) {
  return {
    id: media.id,
    date: media.date,
    slug: media.slug,
    title: media.title?.rendered ?? "",
    caption: media.caption?.rendered ?? "",
    alt_text: media.alt_text ?? "",
    media_type: media.media_type,
    mime_type: media.mime_type,
    source_url: media.source_url,
    sizes: media.media_details?.sizes ?? {},
    width: media.media_details?.width,
    height: media.media_details?.height,
  };
}

async function main() {
  console.log(`Fetching from ${SITE_URL} ...`);

  console.log("Fetching posts...");
  const rawPosts = await fetchAll("posts");
  console.log(`-> ${rawPosts.length}件の記事を取得`);

  console.log("Fetching media...");
  const rawMedia = await fetchAll("media");
  console.log(`-> ${rawMedia.length}件のメディアを取得`);

  await mkdir(OUTPUT_DIR, { recursive: true });

  const posts = rawPosts.map(simplifyPost);
  const media = rawMedia.map(simplifyMedia);

  await writeFile(
    path.join(OUTPUT_DIR, "posts.json"),
    JSON.stringify(posts, null, 2),
    "utf-8",
  );
  await writeFile(
    path.join(OUTPUT_DIR, "media.json"),
    JSON.stringify(media, null, 2),
    "utf-8",
  );
  await writeFile(
    path.join(OUTPUT_DIR, "all.json"),
    JSON.stringify({ posts, media }, null, 2),
    "utf-8",
  );

  console.log(`\n保存完了: ${path.resolve(OUTPUT_DIR)}`);
  console.log(`  - posts.json (${posts.length}件)`);
  console.log(`  - media.json (${media.length}件)`);
  console.log(`  - all.json`);
}

main().catch((err) => {
  console.error("エラーが発生しました:", err);
  process.exitCode = 1;
});
