# Astroを使用したシンプルなブログ

![](public/img-cover.png)

Astroを使用したシンプルなブログのテンプレートです。

## 動作環境

Node.js 24 以上

## 開発の仕方

1. パッケージのインストール

```bash
pnpm install
```

2. 開発環境の起動

```bash
pnpm dev
```

3. 開発環境へのアクセス  
   [http://localhost:4321](http://localhost:4321)にアクセス

## 記事の書き方

記事は `app/src/content/blog/<slug>.md` のMarkdownファイルで管理します(ファイル名がそのまま `/blog/<slug>` のURLになります)。`pnpm new:article <slug>` でひな形(下書き)を作れます。書き方の詳細は [docs/WRITING_GUIDE.md](docs/WRITING_GUIDE.md) を参照してください。
