# k2-craft

WordPressサイト (https://www.voyage-to-the-new-world.com/) のバックアップ・静的ミラー化・Cloudflare Pagesへのデプロイを行うツール群。

## セットアップ

```bash
pnpm install
```

## 1. 記事・画像データをJSONで書き出す

WordPress REST APIから全記事・メディア情報を取得し、`wp-export/` にJSONで保存する。

```bash
pnpm export-wp
```

- 出力先: `wp-export/posts.json`, `wp-export/media.json`, `wp-export/all.json`
- サイトURL・出力先は環境変数で変更可能: `WP_SITE_URL`, `WP_OUTPUT_DIR`

## 2. サイト全体を静的ミラーとして保存

全ページをクロールし、HTML/CSS/JS/画像をリンクを相対パスに変換した状態で `site-mirror/` に保存する。

```bash
pnpm mirror-site
```

- 出力先: `site-mirror/www.voyage-to-the-new-world.com/`
- サイトURL・出力先は環境変数で変更可能: `WP_SITE_URL`, `WP_MIRROR_DIR`
- 対象ドメイン以外(広告・アナリティクス等)は自動で除外される

## 3. ミラー内のリンク切れを修正

WordPressのショートリンク形式(`?p=123`)のURLはファイル名に `?` を含むため、Cloudflare Pagesでは正しく配信されず、記事に遷移できない問題がある。このスクリプトが該当ファイルを安全な名前にリネームし、参照元のリンクをすべて書き換える。

```bash
pnpm fix-links
```

- 実行後、残っている内部リンク切れの件数がコンソールに出力される(0件になっていればOK)
- 2. でミラーを再取得するたびに再実行が必要

## 4. Cloudflare Pagesにデプロイ

ミラー化した静的サイトをCloudflare Pagesに公開する。

```bash
pnpm run pages:deploy
```

- `pnpm deploy`(runなし)はpnpmの予約コマンドと衝突するため、必ず `pnpm run pages:deploy` を使うこと
- 初回はプロジェクト作成の確認プロンプトが表示される(production branch名などを入力)
- 成功すると `https://<deployment-id>.k2-craft.pages.dev` のプレビューURLが発行される
- 本番URLは Cloudflareダッシュボード → Workers & Pages → k2-craft → Deployments から確認できる
- 再デプロイしたい場合は、2〜3を再実行してから同じコマンドを再実行すればよい
