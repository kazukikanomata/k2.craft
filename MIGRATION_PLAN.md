# コンテンツ基盤のGitベース移行計画

## 目的

記事コンテンツの保存先を microCMS のリッチエディタ(WYSIWYG)から、[sapper-blog-app-main](https://github.com/azukiazusa1/sapper-blog-app)のような **Gitで管理するMarkdownファイル** に全面移行する。目的は次の2点:

1. sapper-blog-app-mainが持つ記事表現力(シンタックスハイライト、Warning等のコールアウトボックス、リンクカードなど)に寄せる
2. 執筆をGitのdiff・レビューの対象にする(下書きの推敲過程を残せる)

トレードオフとして、microCMSの「プレビュー付きリッチエディタでの執筆体験」は失われ、生のMarkdownをテキストエディタで書く形になる。

## 現状(k2-craft)

- 記事本文は microCMS の「リッチエディタ」フィールドにHTMLとして保存されている
- 取得したHTMLは `microcms-rich-editor-handler` の transformer 群(`responsiveImageTransformer` / `codeBlockFileNameTransformer` / 自作 `linkPreviewTransformer`)で加工して表示している
- TOC抽出は同パッケージの `tocExtractor` を使用
- シンタックスハイライト・アラート(Warning等)ボックスは未実装

## 参考実装(sapper-blog-app-main)との違い

sapper-blog-app-mainは「Gitに保存したMarkdown下書き ⇔ Contentful(本番配信用CMS)」のハイブリッド構成だが、k2-craftは個人ブログでそこまでの規模がないため、**Contentfulに相当する外部CMS層は持たず、Markdownファイルをそのままビルド時に読み込むだけのシンプルな構成**にする(sapperのcontent-managementパッケージのような同期スクリプトは不要)。

また、sapperはSvelteKitのため独自にファイル読み込み・パースを実装しているが、**k2-craftはAstroなので組み込みの[Content Collections](https://docs.astro.build/en/guides/content-collections/)機能を使うのが自然**。zodスキーマによるfrontmatter検証・型安全なクエリが標準で手に入るため、sapperの`zod`によるバリデーションと同等以上のことがフレームワーク標準機能で実現できる。

## 対応事項

### Phase A: 設計・調査(完了)

- [x] 既存記事の件数、リンクカード・動画埋め込みなど特殊な埋め込みの使用状況を調査する → 「Phase A 調査結果」参照
- [x] frontmatterスキーマを設計する(zod) → 「frontmatterスキーマ」参照。**`slug`は現行の`/blog/[id]`のURLと一致させ、既存URLを壊さない**
- [x] ディレクトリ構成を決定する: `src/content/blog/<microCMSのid>.md`(Astro Content Collectionsの規約に合わせる)
- [x] Markdown処理パイプラインの構成を決める → 「新パイプラインの構成」参照
- [x] 画像の扱いを決める: microCMSを画像CDNとして残す(理由は「Phase A 調査結果」参照)

## Phase A 調査結果

2026-09-20時点のmicroCMS本番データ(`blog` / `categories` エンドポイントをGETで全件取得)を集計した。

### 記事・カテゴリ

- 記事は **43件**、カテゴリは8件(生成AI / IT tech / 学び / 心理 / エンタメ / 本 / ニュース / 就活)
- 複数カテゴリを持つ記事は4件(いずれも「IT tech」+ 別カテゴリ)。現行の関連記事は`category[0]`のみ使用している
- サムネイル未設定の記事が1件(`dn7_nib0c`)。現行の`noimg.png`フォールバックを引き続き使う
- 記事のidは全件 `[a-z0-9_-]` のみで、そのままファイル名・URLに使える(例: `fh8ik9_vzsx`)
- 現行URL `/blog/[id]` の `id` は**microCMSのcontent id**であり、WordPress時代のslug(`backup/import-map.json`の`slug`)ではない。したがって`slug`にはmicroCMSのidを使う
- `createdAt`は移行実施日(2026-08-03)で、元記事の投稿日は`publishedAt`(2021〜)に入っている。表示は既に`publishedAt || createdAt`なので、frontmatterの日付は`publishedAt`のみでよい
- `updatedAt`と`revisedAt`は全件同値のため、`updatedAt`のみ引き継ぐ

### 本文HTMLの使用状況(移行スクリプトの複雑さ)

| 要素 | 状況 | 移行への影響 |
| --- | --- | --- |
| 動画・iframe埋め込み | **0件** | 対応不要 |
| インラインstyle・class | **0件** | turndownの標準ルールでほぼ変換できる |
| 画像 | 174枚、すべて`images.microcms-assets.io` | URLをそのまま保持できる(下記の画像方針) |
| `<figure>`内の画像 | 174件のうち19件が`<a>`で包まれた画像リンク、`figcaption`付きは2件 | 画像リンクは`[![](src)](href)`に変換 |
| コードブロック | 17記事・66ブロック(47ブロックが複数行)。**`<pre><code>`のみで言語クラス・ファイル名が無い** | シンタックスハイライトには言語が必要。ファイル名タブ用の情報は既存データに存在しない(`data-filename`は0件) |
| リンクカード | 12記事。`<p><a>`(タイトル/抜粋/ドメイン)が同一hrefで2〜3個連続する形。最大は`dn7_nib0c`の8個 | 専用のturndownルールが必要(下記) |
| アフィリエイトリンク | 1記事(もしもアフィリエイト) | 同じカード構造で混在。通常リンクとして残す |
| テーブル | 6個。`<th>`なし、`colspan`/`rowspan`は全て`1` | GFMテーブルにはヘッダー行が必須。先頭行をヘッダー扱いにする |
| `<h1>`を含む記事 | 3件(`8vpu92mzr` / `e48k7w9oskd` / `yg2-76a7dmif`) | 記事タイトルが`h1`のため、`h2`へ降格する |
| ネストしたリスト | 28記事 | turndownは対応。変換後に目視確認 |
| 見出しの`id` | `hd92040d0df`のようなランダム値 | `rehype-slug`で再生成されるため、既存の見出しアンカーURLは変わる(個人ブログのため許容) |

### 現行コードで置き換えが必要な箇所

- `getBlogList` / `getBlogDetail` / `getCategoryList` / `getRelatedBlogs` は`index.astro`・`p/[page].astro`・`category/**`・`blog/[id].astro`から使われている(Phase Dで置き換え)
- `getSettings`(`Layout.astro` / `index.astro` / `about.astro`)は記事ではなく設定情報のため、**移行対象外でmicroCMSに残す**。したがってmicroCMSの完全廃止はしない(スコープ外の項目と整合)
- `blog/[id].astro`の`draftKey`によるmicroCMSプレビューは、Markdown移行後は使えなくなる。代替はPhase Eの`published: false`運用

## 設計判断

### frontmatterスキーマ

`src/content.config.ts`(Phase Bで作成。Phase Aでは未使用コードを残さないためファイルは作らない)。

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(120), // 現行のmicroCMS側の上限と同じ
    category: z.array(z.string()).default([]),
    thumbnail: z
      .object({ url: z.string().url(), width: z.number(), height: z.number() })
      .optional(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    published: z.boolean().default(true),
  }),
});

export const collections = { blog };
```

- `slug`はfrontmatterに持たせず、**ファイル名(=Content Collectionsの`id`)をそのままURLにする**。二重管理を避けられ、frontmatterと食い違う事故も起きない
- 計画当初の`about` / `createdAt`は不要と判断して外した(`about`は設定情報側の項目で記事には無い。`createdAt`は移行日で意味を持たない)
- `category`は名前の文字列配列。カテゴリのURL(`/category/[id]`)は現行がmicroCMSのcategory idなので、Phase Dで名前ベースのslugに置き換える際に旧URLからのリダイレクトが必要かを判断する

### ディレクトリ構成

```
app/src/content/blog/<microCMSのid>.md   # 43ファイル
app/src/content.config.ts
```

### 新パイプラインの構成

```
Markdown → remark-gfm → (リンクカード/アラートのremarkプラグイン) → remark-rehype
        → rehype-slug → rehype-autolink-headings → rehype-pretty-code(shiki) → HTML
```

- `astro.config.mjs`の`markdown`設定に登録する(Content Collectionsの`render()`が使う)
- TOCは`render()`の戻り値`headings`から取得する。`tocExtractor`相当の自作は不要で、現行の`ignoreLevels: [4, 5]`は`headings.filter(h => h.depth <= 3)`で置き換える
- 既に`package.json`にある`shiki@^1`は`rehype-pretty-code`の依存として使うため、バージョンを揃えて確認する
- リンクカード: 移行スクリプトが、連続する同一href段落を「単独行のURL」に変換する。表示時はremarkプラグインがOGPを取得する。`prerender`にする場合はビルド時取得になるため、現行の`linkPreview.ts`にある`cf`キャッシュオプションは不要になる
- コードブロックの言語: 既存の66ブロックには言語情報が無いため、Phase Cで内容から推定した言語を付与する(または`text`のままにする)。推定結果はレビュー対象にする

### 画像の扱い: microCMSを画像CDNとして残す

- 174枚すべてが`images.microcms-assets.io`にあり、frontmatterの`thumbnail`と本文の画像URLをそのまま保持すれば移行の手間がゼロ
- `public/`や`astro:assets`への移行は174枚のダウンロード・リネーム・リンク書き換えが必要で、得られるのは外部依存の削減のみ
- 現行のimageService(`cloudflare`)は、Cloudflare Imagesの最適化を引き続き使える
- 将来microCMSを解約する場合は、その時点で別途移行する

### 未決定(要判断)

- アラート記法: GitHub式(`> [!WARNING]`)を推奨。理由はエディタ・GitHubのプレビューでも読めるため。Phase Bの着手時に確定する
- `output: "server"`維持か静的化か: 記事はビルド時に確定するため静的化を推奨。ただしCloudflare Worker + Terraform構成への影響(`bundle-worker.mjs`など)の確認が必要で、Phase Dで判断する
- カテゴリー管理: 8件のみのため、frontmatterの文字列配列で十分と考える。説明文が必要になったら別途検討する

### Phase B: 新パイプラインの実装(未着手)

sapperの`markdownToHtml.ts`相当を、Astro Content Collectionsの`render()`と組み合わせて構築する。

- [ ] `remark-gfm`: テーブル・打ち消し線・タスクリストなどのGFM記法対応
- [ ] `rehype-pretty-code`(shiki): シンタックスハイライト。ダーク/ライト両対応のテーマを選定する
- [ ] `rehype-slug` + `rehype-autolink-headings`: 見出しへのアンカーリンク自動付与
- [ ] 独自のアラート(Warning/Note等)remark/rehypeプラグイン、またはgithub-style admonitionに対応した既存パッケージの導入
- [ ] リンクカード変換: 既存の`linkPreviewTransformer`をremarkプラグインとして書き直す
- [ ] TOC抽出: 既存の`tocExtractor`相当をremark/rehypeベースで再実装(見出しリストを`render()`の戻り値から取得する形にする)
- [ ] コードブロックのファイル名タブ表示(既存の`codeBlockFileNameTransformer`相当)

### Phase C: 移行スクリプトの作成(未着手)

- [ ] microCMSから全記事を取得するスクリプト(既存の`getBlogList()`を利用、ページング対応)
- [ ] 記事本文のHTML→Markdown変換(`turndown`。Phase 3で導入済み)
  - [ ] リンクカード・ファイル名付きコードブロックなど、microCMS特有のHTML構造に対するカスタムturndownルールを用意する
- [ ] frontmatter生成(`category`は参照型からシンプルな文字列配列に変換、`thumbnail`はmicroCMSの画像URLをそのまま保持)
- [ ] `src/content/blog/<slug>.md`への書き出し
- [ ] 変換結果のレビュー(全件 or サンプル)。特にリンクカード・コードブロック・表の崩れを確認する

### Phase D: ルーティングの切り替え(未着手)

- [ ] `src/pages/blog/[id].astro`を、microCMS APIではなくContent Collectionsのクエリに置き換える
- [ ] `getRelatedBlogs`(Phase 2で実装)をContent Collectionsのタグ/カテゴリで再実装する
- [ ] 一覧ページ・カテゴリページ・ページネーションも同様に切り替える
- [ ] `output: "server"`のままにするか、記事ページを`prerender = true`の静的生成に変えるか判断する(Markdownファイルはビルド時に確定するため、静的化するとより高速・低コストになる)

### Phase E: 新規記事作成フローの整備(未着手)

- [ ] 新規記事のスキャフォールディングスクリプト(sapperの`new:article`相当。frontmatterだけ埋まった空ファイルを生成)
- [ ] 執筆ガイド文書(sapperの`BLOG_WRITING_GUIDE.md`/`writing-style.md`相当)を作成する
- [ ] 下書き運用: `published: false`をfrontmatterに持たせ、一覧から除外しつつローカルでは確認できるようにする

## 検討事項(実装前に決めること)

- **Astro Content Collectionsを採用するか**: 本計画は採用を前提に書いているが、既存コードとの親和性を含めて最終確認する
- **アラート記法の構文**: GitHub式(`> [!WARNING]`)にするか、独自の絵文字プレフィックス等にするか
- **画像の置き場所**: microCMSを画像CDNとして残すか、Astroの`astro:assets`によるローカル最適化に完全移行するか(後者は移行の手間が増えるが、外部サービス依存が減る)
- **カテゴリー管理**: frontmatterの文字列配列だけで十分か、カテゴリー一覧・説明文を別途持つ仕組み(sapperのContentfulの`Tag`相当)が必要か
- **`output: "server"`を維持するか、静的生成に寄せるか**: Cloudflare Worker + Terraformの現行インフラ構成([README.md](README.md)参照)への影響も含めて判断する

## 対応しないこと(今回のスコープ外)

- sapperのようなGit×Contentfulのハイブリッド運用(k2-craftの規模では過剰)
- 記事の理解度チェック(選択式クイズ)機能(別件、plan.md Phase 3で見送り済み)
- microCMSの完全廃止(画像CDNとしての利用は残す想定)
