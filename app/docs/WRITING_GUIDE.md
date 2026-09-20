# 記事の書き方

記事は `app/src/content/blog/<slug>.md` のMarkdownファイルで管理する。`<slug>`がそのまま記事のURL(`/blog/<slug>`)になる。

## 新しい記事を作る

```bash
cd app
pnpm new:article <slug>   # 例: pnpm new:article aws-vpc-basics
```

`src/content/blog/<slug>.md` にひな形が作られる。slugに使えるのは英小文字・数字・ハイフン・アンダースコアのみ。ひな形は**下書き**(`published: false`)で作られる。

```bash
pnpm dev   # http://localhost:4321 で確認する。下書きも表示される(「Draft」バッジ付き)
```

## frontmatter

| 項目 | 必須 | 内容 |
| --- | --- | --- |
| `title` | ○ | 記事タイトル |
| `description` | ○ | 概要。120文字以内。一覧のカードと`<meta description>`に使う |
| `category` | | カテゴリ名の配列。下記の一覧にある名前のみ使える(それ以外はビルドエラー) |
| `icon` | ○ | 絵文字。一覧のカードと記事の最上部に表示する |
| `publishedAt` | ○ | 公開日(`2026-09-20`のように書く)。一覧はこの日付の新しい順に並ぶ |
| `published` | | `false`の間は本番ビルドに含まれない(省略時は`true`) |

使えるカテゴリ: 生成AI / IT tech / 学び / 心理 / エンタメ / 本 / ニュース / 就活

カテゴリを増やすときは、`app/src/constants/index.ts`の`CATEGORIES`に「カテゴリ名: URLのslug」を追加する。

## 本文のMarkdown

- 見出しは`##`(h2)から始める。h1は記事タイトルに使われる。目次には`##`と`###`が載る
- 表・打ち消し線(`~~text~~`)・タスクリスト(`- [ ]`)などのGFM記法が使える
- コードブロックは言語を指定する。ファイル名を出したいときは`title`を付ける

  ````markdown
  ```ts title="hello.ts"
  const greet = (name: string) => `Hello, ${name}`;
  ```
  ````

- 注意書き(アラート)はGitHub式で書く: `> [!NOTE]` / `> [!TIP]` / `> [!IMPORTANT]` / `> [!WARNING]` / `> [!CAUTION]`

  ```markdown
  > [!WARNING]
  > 警告のアラートです。
  ```

- **リンクカード**: URLだけを1行に書くと、ビルド時にOGPを取得してカードになる。`[文字](URL)`の形は通常のリンクのまま。OGPを取得できないURLは通常のリンクとして表示される
- **画像**: `app/src/assets/blog/<slug>/`に置き、Markdownからの相対パスで参照する

  ```markdown
  ![代替テキスト](../../assets/blog/<slug>/1.png)
  ```

## 公開する

1. `published: false`を削除する(または`true`にする)。`publishedAt`を公開日に合わせる
2. `pnpm lint && pnpm typecheck && pnpm build`が通ることを確認する
3. PRを作ってmainにマージし、[README.md](../../README.md)の手順でデプロイする
