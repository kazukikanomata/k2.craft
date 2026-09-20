# ブログ記事の書き方

記事は `app/src/content/blog/<slug>.md` のMarkdownファイル1本が1記事。`<slug>` がそのままURL(`/blog/<slug>`)になる。

## 手順

### 1. ひな形を作る

```bash
cd app
pnpm new:article <slug>   # 例: pnpm new:article aws-vpc-basics
```

- slugは英小文字・数字・ハイフン・アンダースコアのみ
- 下書き(`published: false`)で作られる
- Claude Codeに「記事を書きたい」と頼むと、`new-article`スキルが同じことをしてくれる

### 2. frontmatterを埋める

| 項目 | 内容 |
| --- | --- |
| `title` | タイトル |
| `description` | 概要(120文字以内)。本文を書き終えてから書く |
| `category` | `生成AI` / `IT tech` / `学び` / `心理` / `エンタメ` / `本` / `ニュース` / `就活` から選ぶ(複数可、なしも可) |
| `icon` | 絵文字1つ |
| `publishedAt` | 公開日(`2026-09-20` の形式)。一覧はこの日付の新しい順 |

`description` は、Claude Codeの `summarize-article` スキルで本文から作れる。

### 3. 本文を書く

- 見出しは `##` から始める(`#` はタイトルに使われる)
- コードブロックは言語を指定する(例: ` ```ts `)
- URLだけを1行に書くと、リンクカードになる
- 画像は `app/src/assets/blog/<slug>/` に置き、`![説明](../../assets/blog/<slug>/1.png)` で参照する

### 4. ローカルで確認する

```bash
pnpm dev   # http://localhost:4321(下書きも「Draft」バッジ付きで表示される)
```

### 5. 公開する

1. `published: false` の行を削除する(または `true` にする)
2. `pnpm lint && pnpm typecheck && pnpm build` が通ることを確認する
3. PRを作ってmainにマージする(マージするとデプロイのworkflowが動く)

## 詳しく知りたいとき

Markdown記法(アラート・コードのファイル名表示など)やカテゴリの追加方法は [app/docs/WRITING_GUIDE.md](app/docs/WRITING_GUIDE.md) を参照。
