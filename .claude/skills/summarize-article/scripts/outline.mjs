#!/usr/bin/env node
// 記事の概要を書くための材料(見出し・冒頭・結び・現在のdescription)を表示する。
//
// 使い方(リポジトリのルートで実行):
//   node .claude/skills/summarize-article/scripts/outline.mjs <id> [<id>...]
//   node .claude/skills/summarize-article/scripts/outline.mjs --all

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const BLOG_DIR = path.resolve(import.meta.dirname, "../../../../app/src/content/blog");

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("使い方: outline.mjs <id> [<id>...] | --all");
  process.exit(1);
}

const targets = ids.includes("--all")
  ? (await readdir(BLOG_DIR)).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)).sort()
  : ids;

// リンク・画像・コード・URLを落として、本文の文章だけにする(アフィリエイトのリンク文言が邪魔になるため)
const toPlainText = (body) =>
  body
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/^#{2,6} .+$/gm, "")
    .replace(/!\[.*?\]\(.*?\)|\[\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

for (const id of targets) {
  const source = await readFile(path.join(BLOG_DIR, `${id}.md`), "utf-8");
  const [, frontmatter, body] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const title = frontmatter.match(/^title: (.*)$/m)?.[1] ?? "";
  const description = frontmatter.match(/^description: (.*)$/m)?.[1] ?? "";
  const headings = [...body.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1]);
  const text = toPlainText(body);

  console.log(`\n### ${id}`);
  console.log(`title: ${title}`);
  console.log(`description(現在): ${description}`);
  console.log(`headings: ${headings.join(" / ") || "(なし)"}`);
  console.log(`本文の長さ: ${text.length}文字`);
  console.log(`冒頭: ${text.slice(0, 500)}`);
  if (text.length > 700) console.log(`結び: ${text.slice(-250)}`);
}
