# 概要

WordPressサイト (https://www.voyage-to-the-new-world.com/) を、microCMS + Astro + Cloudflare Workers構成にモダン化するプロジェクト。

技術選定の背景は [ADR/0001-tech-stack.md](./ADR/0001-tech-stack.md) を参照。

本番URL: https://k2-craft.com

## 構成

- **記事の管理・編集**: [microCMS](https://microcms.io/)（管理画面はmicroCMS側のものをそのまま使用）
- **サイト本体**: `app/` — Astro製。microCMSから記事を取得してビルド・配信する
- **移行ツール**: `scripts/` — WordPressの記事をmicroCMSへ一度だけ移すためのスクリプト群

## セットアップ

```bash
cd app && pnpm install
```

`scripts/`配下の移行ツールはNode.js標準機能のみで動くため、インストール不要。

Node.js 24以上が必要（`.nvmrc`参照）。package.jsonは`app/`のみに存在する。

`app/.env` に microCMS の接続情報を設定する。

```
MICROCMS_API_KEY=xxxxxxxxxx
MICROCMS_SERVICE_DOMAIN=xxxxxxxxxx
```

## サイトを動かす(app/)

```bash
cd app
pnpm dev          # ローカル確認 (http://localhost:4321)
pnpm build        # ビルド
pnpm run deploy   # ビルドしてCloudflare Workersへ公開 (pnpm deployは予約コマンドと衝突するため不可)
```
