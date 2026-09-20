#!/usr/bin/env node
// microCMSの記事を、Git管理のMarkdown(src/content/blog/<id>.md)へ移行する。
//
// 使い方(app/ ディレクトリで実行):
//   node scripts/migrate-microcms-to-markdown.mjs             # 全件
//   node scripts/migrate-microcms-to-markdown.mjs --limit=3   # 先頭3件だけ試す
//
// 前提: app/.env に MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が設定されていること(GETのみ使用)
//
// 出力:
//   src/content/blog/<id>.md          frontmatter + 本文
//   src/assets/blog/<id>/<n>.<ext>    本文中の画像(microCMSからダウンロード)
// 何度実行しても同じ結果になる(ダウンロード済みの画像は再取得しない)。

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import TurndownService from "turndown";

const APP_DIR = path.resolve(import.meta.dirname, "..");
const CONTENT_DIR = path.join(APP_DIR, "src", "content", "blog");
const ASSETS_DIR = path.join(APP_DIR, "src", "assets", "blog");

// サムネイルを廃止した代わりに、記事ごとに割り当てる絵文字(MIGRATION_PLAN.md「画像の扱い」参照)
const ICONS = {
  "fh8ik9_vzsx": "👑",
  "8vpu92mzr": "🐳",
  "zwie6z68f": "🌿",
  "5m-c3jg938z2": "🥊",
  "txsbb-xed84": "🤝",
  "7grrxcmqz2s": "🚀",
  "q-81v09862xy": "🔑",
  "e48k7w9oskd": "📦",
  "zxfofzxpbe3k": "🌐",
  "ehda-u0r0": "💬",
  "0itt68x6jc8": "🔌",
  "yg2-76a7dmif": "🧪",
  "orki1tutbv": "🔤",
  "0lm9hbiktkoi": "🎬",
  "mnhbgs3om_3": "📐",
  "5tuqvs55l0w": "🌱",
  "bari7qn2xbz": "🎓",
  "p3fk-ukc8tm": "🤖",
  "b8gh5uw8io": "📚",
  "09e-f9alc26": "✅",
  "ifuutemgm": "📞",
  "434h4ru62i_6": "😤",
  "hy5f1ofah": "🔒",
  "uqw2buky4kv4": "⚡",
  "9dj6me517": "📈",
  "fwnbv47cd4c": "💻",
  "1vh5k__39d": "📏",
  "xwzwyc5y_zl": "🧳",
  "fkdv45ari": "💾",
  "t47k5btq3": "📊",
  "t3u-1-w1z2": "📖",
  "aza-k5ht4t0": "🙇",
  "y_h4u6hkf": "🧑‍🏫",
  "hr9c_c1y4m": "🌙",
  "4ajpv8-rb2y": "💎",
  "dn7_nib0c": "🔁",
  "rc7xe-qbiaa": "🔐",
  "pxnmech87xh": "🧭",
  "v44g99q77": "☕",
  "ao9_sgi70v": "🧩",
  "5bu7593vm4ix": "🌍",
  "zaft3p8g9d": "🔭",
  "zxk6leqo0": "🔭",
};

async function loadEnv() {
  const raw = await readFile(path.join(APP_DIR, ".env"), "utf-8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function fetchAllPosts({ MICROCMS_SERVICE_DOMAIN, MICROCMS_API_KEY }) {
  const posts = [];
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(
      `https://${MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/blog?limit=100&offset=${offset}&orders=publishedAt`,
      { headers: { "X-MICROCMS-API-KEY": MICROCMS_API_KEY } }
    );
    if (!res.ok) throw new Error(`microCMS API error: ${res.status}`);
    const json = await res.json();
    posts.push(...json.contents);
    if (offset + 100 >= json.totalCount) return posts;
  }
}

// ---- コードブロックの言語推定 --------------------------------------------
// microCMSのリッチエディタは言語を保持していないため、内容から推定する。
// 推定できないもの(プロンプト例・コミットメッセージなど)は`text`にする。
function detectLanguage(code) {
  const lines = code.split("\n").filter((line) => line.trim() !== "");
  if (lines.length > 0 && lines.every((line) => line.startsWith("$ "))) return "sh";
  const head = code.trimStart();
  if (head.startsWith("<?xml")) return "xml";
  if (/^<[a-z]/i.test(head)) return "html";
  if (/^[{[]/.test(head)) return "jsonc"; // AWSのポリシー等。コメント入りのため`json`ではなく`jsonc`
  if (/\b(SELECT|CREATE INDEX)\b/.test(code)) return "sql";
  if (/^func \(/m.test(code)) return "go";
  if (/\$\w+/.test(code) && /(->|\bfunction\b|\bnamespace\b|::)/.test(code)) return "php";
  if (/^namespace \w+\\/m.test(code) || /\bpublic function\b/.test(code)) return "php";
  if (
    /\bpublic (static )?(class|int|void)\b|^\s*void \w+\(|^\s*[A-Z]\w* \w+ = new |\b(String|int)\s+\w+\s*[,;=()]|System\.out/m.test(
      code
    )
  ) {
    return "java";
  }
  if (/^require '|\bputs\b|\.new$/m.test(code)) return "ruby";
  if (/\b(function \w+\(|const |let )|=>/.test(code)) return "js";
  return "text";
}

// ---- turndown ------------------------------------------------------------
const stats = { linkCards: 0, images: 0, tables: 0, codeBlocks: {} };

function createTurndown() {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    hr: "---",
  });

  // 同じhrefの段落が連続するもの(microCMSにURLを貼ると生成される「タイトル/抜粋/ドメイン」)は、
  // 前処理で<link-card>に置き換えてあり、単独行のURLにする(表示時にremarkLinkCardがカード化する)。
  // 中身が空だとturndownがblank扱いにしてルールが呼ばれないため、前処理で仮のテキストを入れている
  td.addRule("linkCard", {
    filter: (node) => node.nodeName === "LINK-CARD",
    replacement: (_content, node) => {
      stats.linkCards++;
      return `\n\n${node.getAttribute("data-href")}\n\n`;
    },
  });

  td.addRule("figure", {
    filter: "figure",
    replacement: (content, node) => {
      const img = node.querySelector("img");
      if (!img) return content;
      stats.images++;
      let markdown = `![${img.getAttribute("alt") ?? ""}](${img.getAttribute("src")})`;
      const href = node.querySelector("a")?.getAttribute("href");
      if (href) markdown = `[${markdown}](${href})`;
      const caption = node.querySelector("figcaption")?.textContent.trim();
      return `\n\n${markdown}\n\n${caption ? `*${caption}*\n\n` : ""}`;
    },
  });

  td.addRule("fencedCodeBlock", {
    filter: (node) => node.nodeName === "PRE" && node.firstChild?.nodeName === "CODE",
    replacement: (_content, node) => {
      const code = node.firstChild.textContent.replace(/\n$/, "");
      const lang = detectLanguage(code);
      stats.codeBlocks[lang] = (stats.codeBlocks[lang] ?? 0) + 1;
      const fence = "`".repeat(Math.max(3, ...[...code.matchAll(/`+/g)].map((m) => m[0].length + 1)));
      return `\n\n${fence}${lang}\n${code}\n${fence}\n\n`;
    },
  });

  // microCMSのテーブルには<th>が無い。GFMにはヘッダー行が必須なので、先頭行をヘッダーにする
  td.addRule("table", {
    filter: "table",
    replacement: (_content, node) => {
      stats.tables++;
      const rows = Array.from(node.querySelectorAll("tr")).map((tr) =>
        Array.from(tr.children).map((cell) =>
          td.turndown(cell.innerHTML).replace(/\|/g, "\\|").trim().replace(/\n+/g, "<br>")
        )
      );
      const columns = Math.max(...rows.map((row) => row.length));
      const format = (row) =>
        `| ${Array.from({ length: columns }, (_, i) => row[i] ?? "").join(" | ")} |`;
      const [header, ...body] = rows;
      const separator = `| ${Array(columns).fill("---").join(" | ")} |`;
      return `\n\n${[format(header), separator, ...body.map(format)].join("\n")}\n\n`;
    },
  });

  return td;
}

// ---- 前処理(HTML文字列) ---------------------------------------------------
const CARD_PATTERN =
  /<p><a href="([^"]+)"[^>]*>[^<]*<\/a><\/p>(?:<p><a href="\1"[^>]*>[^<]*<\/a><\/p>)+/g;

function preprocess(html) {
  let result = html.replace(CARD_PATTERN, (_, href) => `<link-card data-href="${href}">card</link-card>`);

  // 記事タイトルがh1なので、本文にh1がある記事は見出し階層を1段下げる(h1→h2, h2→h3, ...)
  if (/<h1[ >]/.test(result)) {
    result = result.replace(/<(\/?)h([1-5])([ >])/g, (_, slash, level, tail) => `<${slash}h${Number(level) + 1}${tail}`);
  }
  return result;
}

// ---- 画像 ------------------------------------------------------------------
async function exists(file) {
  return stat(file).then(() => true, () => false);
}

const EXT_BY_CONTENT_TYPE = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

async function downloadImage(url, basePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image download failed: ${res.status} ${url}`);
  const ext =
    path.extname(new URL(url).pathname).toLowerCase() ||
    EXT_BY_CONTENT_TYPE[res.headers.get("content-type")?.split(";")[0] ?? ""] ||
    "";
  const file = `${basePath}${ext}`;
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

// 本文中の<img src>をダウンロードし、Markdownファイルからの相対パスに書き換える
async function localizeImages(id, html) {
  const urls = [...new Set([...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
  if (urls.length === 0) return html;

  const dir = path.join(ASSETS_DIR, id);
  await mkdir(dir, { recursive: true });

  let result = html;
  for (const [index, url] of urls.entries()) {
    const basePath = path.join(dir, String(index + 1));
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    const file = ext && (await exists(`${basePath}${ext}`)) ? `${basePath}${ext}` : await downloadImage(url, basePath);
    const relative = path.relative(CONTENT_DIR, file).split(path.sep).join("/");
    result = result.replaceAll(`src="${url}"`, `src="${relative}"`);
  }
  return result;
}

// ---- 出力 ------------------------------------------------------------------
function buildFrontmatter(post) {
  const icon = ICONS[post.id];
  if (!icon) throw new Error(`ICONSに絵文字が未定義です: ${post.id} (${post.title})`);

  // JSON文字列はYAMLのダブルクォート文字列としてそのまま有効。
  // updatedAtは移行・編集作業の日付で記事の更新日として意味を持たないため引き継がない
  const lines = [
    `title: ${JSON.stringify(post.title)}`,
    `description: ${JSON.stringify(post.description)}`,
    `category: ${JSON.stringify(post.category.map((c) => c.name))}`,
    `icon: ${JSON.stringify(icon)}`,
    `publishedAt: ${JSON.stringify(post.publishedAt)}`,
  ];
  return `---\n${lines.join("\n")}\n---\n`;
}

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

  const posts = (await fetchAllPosts(await loadEnv())).slice(0, limit);
  const td = createTurndown();
  await mkdir(CONTENT_DIR, { recursive: true });

  for (const post of posts) {
    const html = await localizeImages(post.id, preprocess(post.content ?? ""));
    const body = td.turndown(html).trim();
    await writeFile(path.join(CONTENT_DIR, `${post.id}.md`), `${buildFrontmatter(post)}\n${body}\n`);
    console.log(`✓ ${post.id}  ${post.title}`);
  }

  console.log(`\n${posts.length}件を書き出しました`);
  console.log(`リンクカード: ${stats.linkCards} / 画像: ${stats.images} / テーブル: ${stats.tables}`);
  console.log("コードブロック(推定した言語):", stats.codeBlocks);
}

await main();
