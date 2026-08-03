#!/usr/bin/env node
// backup/posts.json の記事をmicroCMSへ移行する。
//
// 使い方:
//   node scripts/import-to-microcms.mjs            # 全件インポート
//   node scripts/import-to-microcms.mjs --limit=3   # 先頭3件だけ試す(動作確認用)
//
// 前提:
//   - app/.env に MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が設定されていること
//   - そのAPIキーに GET / POST / PATCH と「メディアのアップロード」権限があること
//
// 実行するとmicroCMS上に実データが作成されます(下書きではなく公開状態)。
// 何度も試したい場合は --limit で件数を絞って確認してから全件実行してください。

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const IMPORT_MAP_PATH = path.join(ROOT_DIR, "backup", "import-map.json");

// WordPressのカテゴリID→名称。https://www.voyage-to-the-new-world.com/wp-json/wp/v2/categories から取得(id:1のディズニーは使用実績0件のため対象外)
const WP_CATEGORY_NAMES = {
  4: "就活",
  5: "ニュース",
  6: "本",
  7: "エンタメ",
  9: "心理",
  11: "学び",
  12: "IT tech",
  14: "生成AI",
};

async function loadEnv() {
  const raw = await readFile(path.join(ROOT_DIR, "app", ".env"), "utf-8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function excerptToDescription(excerptHtml) {
  const text = decodeHtmlEntities(excerptHtml.replace(/<[^>]+>/g, "").trim())
    .replace(/\s*\[…\]\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class MicroCMS {
  constructor({ serviceDomain, apiKey }) {
    this.serviceDomain = serviceDomain;
    this.apiKey = apiKey;
  }

  async request(method, url, body, retriesLeft = 5) {
    const res = await fetch(url, {
      method,
      headers: {
        "X-MICROCMS-API-KEY": this.apiKey,
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 && retriesLeft > 0) {
      const waitMs = (6 - retriesLeft) * 2000; // 2s, 4s, 6s, 8s, 10s と伸ばしながら待つ
      console.warn(`  (レート制限のため${waitMs}ms待機してリトライします)`);
      await sleep(waitMs);
      return this.request(method, url, body, retriesLeft - 1);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${method} ${url} -> ${res.status} ${res.statusText}: ${text}`);
    }
    return res.status === 204 ? null : res.json();
  }

  content(method, endpoint, { id, body, query } = {}) {
    const url = new URL(
      `/api/v1/${endpoint}${id ? `/${id}` : ""}`,
      `https://${this.serviceDomain}.microcms.io`,
    );
    if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
    return this.request(method, url, body);
  }

  async uploadMedia(buffer, filename, mimeType) {
    const url = `https://${this.serviceDomain}.microcms-management.io/api/v1/media`;
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: mimeType }), filename);
    return this.request("POST", url, form);
  }
}

async function fetchBuffer(sourceUrl) {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`画像取得失敗 ${sourceUrl}: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`画像ではないためスキップ(content-type: ${contentType || "不明"})`);
  }
  return { buffer: Buffer.from(await res.arrayBuffer()), contentType };
}

// アフィリエイトリンクのfavicon/スクリーンショットプレビューなど、記事本文の画像ではないもの
const NON_CONTENT_IMAGE_HOSTS = [
  "www.google.com/s2/favicons",
  "s.wordpress.com/mshots",
];

/** WordPressの画像URL → microCMSにアップロード済みのURL、をキャッシュしながら変換する */
function createImageMigrator(cms) {
  const cache = new Map(); // sourceUrl -> microCMS url

  return async function migrateImage(sourceUrl) {
    if (cache.has(sourceUrl)) return cache.get(sourceUrl);
    if (NON_CONTENT_IMAGE_HOSTS.some((host) => sourceUrl.includes(host))) {
      throw new Error("記事の装飾用画像(favicon/プレビュー)のため移行対象外");
    }
    const { buffer, contentType } = await fetchBuffer(sourceUrl);
    const filename = decodeURIComponent(sourceUrl.split("/").pop()?.split("?")[0] || "image");

    await sleep(400); // microCMSのメディアアップロードAPIのレート制限を避けるための間隔
    const { url } = await cms.uploadMedia(buffer, filename, contentType);
    cache.set(sourceUrl, url);
    return url;
  };
}

/** 本文HTML中の<img src="...">をすべてmicroCMSのURLに置き換える(外部URLはリッチエディタで自動削除されるため) */
async function migrateInlineImages(html, migrateImage) {
  const srcList = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  let result = html;
  for (const src of srcList) {
    try {
      const newUrl = await migrateImage(src);
      result = result.split(`"${src}"`).join(`"${newUrl}"`);
    } catch (err) {
      console.warn(`  ! 画像移行に失敗、元URLのまま残します(表示されない可能性あり): ${src}`, err.message);
    }
  }
  return result;
}

async function importCategories(cms) {
  console.log("カテゴリを作成中...");
  const map = {};
  for (const [wpId, name] of Object.entries(WP_CATEGORY_NAMES)) {
    const created = await cms.content("POST", "categories", { body: { name } });
    map[wpId] = created.id;
    console.log(`  - ${name} -> ${created.id}`);
  }
  return map;
}

async function importPost(cms, post, media, categoryMap, migrateImage) {
  const featured = media.find((m) => m.id === post.featured_media);
  let thumbnail;
  if (featured) {
    try {
      thumbnail = await migrateImage(featured.source_url);
    } catch (err) {
      console.warn(`  ! サムネイル移行に失敗、サムネイルなしで続行します: ${featured.source_url}`, err.message);
    }
  }
  const content = await migrateInlineImages(post.content, migrateImage);
  const category = (post.categories ?? [])
    .map((wpId) => categoryMap[wpId])
    .filter((id) => Boolean(id));

  const body = {
    title: decodeHtmlEntities(post.title),
    description: excerptToDescription(post.excerpt),
    content,
    ...(thumbnail ? { thumbnail } : {}),
    category,
  };

  const created = await cms.content("POST", "blog", { body });
  // POST時点ではpublishedAtは反映されないため、作成後にPATCHで元の公開日を設定する
  await cms.content("PATCH", "blog", {
    id: created.id,
    body: { publishedAt: new Date(post.date + "+09:00").toISOString() },
  });

  return created.id;
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  const env = await loadEnv();
  if (!env.MICROCMS_SERVICE_DOMAIN || !env.MICROCMS_API_KEY) {
    throw new Error(".env に MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が必要です");
  }
  const cms = new MicroCMS({
    serviceDomain: env.MICROCMS_SERVICE_DOMAIN,
    apiKey: env.MICROCMS_API_KEY,
  });
  const migrateImage = createImageMigrator(cms);

  const posts = JSON.parse(await readFile(path.join(ROOT_DIR, "backup", "posts.json"), "utf-8"));
  const media = JSON.parse(await readFile(path.join(ROOT_DIR, "backup", "media.json"), "utf-8"));

  let importMap = {};
  try {
    importMap = JSON.parse(await readFile(IMPORT_MAP_PATH, "utf-8"));
  } catch {
    // 初回はファイルがなくてもよい
  }

  const categoryMap =
    Object.keys(importMap.categories ?? {}).length > 0
      ? importMap.categories
      : await importCategories(cms);
  importMap.categories = categoryMap;
  await writeFile(IMPORT_MAP_PATH, JSON.stringify(importMap, null, 2), "utf-8");

  const targets = (limit ? posts.slice(0, limit) : posts).filter(
    (p) => !importMap[p.id], // 既にインポート済みならスキップ(再実行時の重複防止)
  );

  console.log(`\n記事をインポートします(${targets.length}/${posts.length}件)`);

  let done = 0;
  for (const post of targets) {
    try {
      const microCmsId = await importPost(cms, post, media, categoryMap, migrateImage);
      importMap[post.id] = { microCmsId, slug: post.slug, title: post.title };
      await writeFile(IMPORT_MAP_PATH, JSON.stringify(importMap, null, 2), "utf-8");
      done += 1;
      console.log(`  [${done}/${targets.length}] ${post.title} -> ${microCmsId}`);
    } catch (err) {
      console.error(`  ! 失敗: ${post.title}`, err.message);
    }
  }

  console.log(`\n完了。${IMPORT_MAP_PATH} に記録しました。`);
}

main().catch((err) => {
  console.error("エラーが発生しました:", err);
  process.exitCode = 1;
});
