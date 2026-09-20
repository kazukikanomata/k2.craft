#!/usr/bin/env node
// 新規記事のひな形を src/content/blog/<slug>.md に作成する。
//
// 使い方(app/ ディレクトリで実行):
//   pnpm new:article <slug>
//
// <slug>がそのまま記事のURL(/blog/<slug>)になる。使えるのは英小文字・数字・ハイフン・アンダースコア。
// ひな形は下書き(published: false)で作られ、本番ビルドには含まれない。公開するときにtrueへ変える。

import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import { CATEGORIES } from "../src/constants/index.ts";

const CONTENT_DIR = path.resolve(import.meta.dirname, "..", "src", "content", "blog");

const slug = process.argv[2];
if (!slug || !/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
  console.error("使い方: pnpm new:article <slug>  (slugは英小文字・数字・ハイフン・アンダースコアのみ)");
  process.exit(1);
}

const file = path.join(CONTENT_DIR, `${slug}.md`);
const exists = await access(file).then(() => true, () => false);
if (exists) {
  console.error(`すでに存在します: ${path.relative(process.cwd(), file)}`);
  process.exit(1);
}

const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD(ローカル時刻)
const template = `---
title: "TODO: タイトル"
description: "TODO: 概要(120文字以内。一覧のカードとmeta descriptionに使う)"
category: [] # ${Object.keys(CATEGORIES).join(" / ")}
icon: "📝"
publishedAt: ${today}
published: false # trueにすると公開される。falseの間は本番ビルドに含まれない
---

## はじめに
`;

await writeFile(file, template);
console.log(`作成しました: ${path.relative(process.cwd(), file)}`);
