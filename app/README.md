# Astroを使用したシンプルなブログ

![](public/img-cover.png)

Astroを使用したシンプルなブログのテンプレートです。

## 動作環境

Node.js 24 以上

## 環境変数の設定

ルート直下に`.env`ファイルを作成し、下記の情報を入力してください。

```
MICROCMS_API_KEY=xxxxxxxxxx
MICROCMS_SERVICE_DOMAIN=xxxxxxxxxx
```

`MICROCMS_API_KEY`  
microCMS 管理画面の「サービス設定 > API キー」から確認することができます。

`MICROCMS_SERVICE_DOMAIN`  
microCMS 管理画面の URL（https://xxxxxxxx.microcms.io）の xxxxxxxx の部分です。

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

記事は `app/src/content/blog/<id>.md` のMarkdownファイルで管理します(ファイル名がそのまま `/blog/<id>` のURLになります)。frontmatterのスキーマは `app/src/content.config.ts` を参照してください。microCMSはサイト設定(タイトル・ABOUT)の取得にのみ使います。
