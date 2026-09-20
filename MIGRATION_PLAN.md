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
- [x] 画像の扱いを決める: サムネイルは廃止して絵文字アイコンに置き換え、本文中の画像はリポジトリ内に移行する(「画像の扱い」参照。Phase Cで対応)

## Phase A 調査結果

2026-09-20時点のmicroCMS本番データ(`blog` / `categories` エンドポイントをGETで全件取得)を集計した。

### 記事・カテゴリ

- 記事は **43件**、カテゴリは8件(生成AI / IT tech / 学び / 心理 / エンタメ / 本 / ニュース / 就活)
- 複数カテゴリを持つ記事は4件(いずれも「IT tech」+ 別カテゴリ)。現行の関連記事は`category[0]`のみ使用している
- サムネイルを設定している記事は42件、未設定が1件(`dn7_nib0c`)。サムネイルは廃止して絵文字アイコンに置き換えるため、`noimg.png`のフォールバックはPhase Dで不要になる
- 記事のidは全件 `[a-z0-9_-]` のみで、そのままファイル名・URLに使える(例: `fh8ik9_vzsx`)
- 現行URL `/blog/[id]` の `id` は**microCMSのcontent id**であり、WordPress時代のslug(`backup/import-map.json`の`slug`)ではない。したがって`slug`にはmicroCMSのidを使う
- `createdAt`は移行実施日(2026-08-03)で、元記事の投稿日は`publishedAt`(2021〜)に入っている。表示は既に`publishedAt || createdAt`なので、frontmatterの日付は`publishedAt`のみでよい
- `updatedAt`と`revisedAt`は全件同値。ただし移行・編集作業の日付で意味を持たないため、引き継がないことにした(Phase C)

### 本文HTMLの使用状況(移行スクリプトの複雑さ)

| 要素                   | 状況                                                                                         | 移行への影響                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 動画・iframe埋め込み   | **0件**                                                                                      | 対応不要                                                                                                   |
| インラインstyle・class | **0件**                                                                                      | turndownの標準ルールでほぼ変換できる                                                                       |
| 本文中の画像           | 174枚(サムネイル42枚は別)、すべて`images.microcms-assets.io`                                 | ダウンロードしてリポジトリ内に移す(下記の画像方針)                                                         |
| `<figure>`内の画像     | 174件のうち19件が`<a>`で包まれた画像リンク、`figcaption`付きは2件                            | 画像リンクは`[![](src)](href)`に変換                                                                       |
| コードブロック         | 17記事・66ブロック(47ブロックが複数行)。**`<pre><code>`のみで言語クラス・ファイル名が無い**  | シンタックスハイライトには言語が必要。ファイル名タブ用の情報は既存データに存在しない(`data-filename`は0件) |
| リンクカード           | 12記事。`<p><a>`(タイトル/抜粋/ドメイン)が同一hrefで2〜3個連続する形。最大は`dn7_nib0c`の8個 | 専用のturndownルールが必要(下記)                                                                           |
| アフィリエイトリンク   | 1記事(もしもアフィリエイト)                                                                  | 同じカード構造で混在。通常リンクとして残す                                                                 |
| テーブル               | 6個。`<th>`なし、`colspan`/`rowspan`は全て`1`                                                | GFMテーブルにはヘッダー行が必須。先頭行をヘッダー扱いにする                                                |
| `<h1>`を含む記事       | 3件(`8vpu92mzr` / `e48k7w9oskd` / `yg2-76a7dmif`)                                            | 記事タイトルが`h1`のため、`h2`へ降格する                                                                   |
| ネストしたリスト       | 28記事                                                                                       | turndownは対応。変換後に目視確認                                                                           |
| 見出しの`id`           | `hd92040d0df`のようなランダム値                                                              | `rehype-slug`で再生成されるため、既存の見出しアンカーURLは変わる(個人ブログのため許容)                     |

### 現行コードで置き換えが必要な箇所

- `getBlogList` / `getBlogDetail` / `getCategoryList` / `getRelatedBlogs` は`index.astro`・`p/[page].astro`・`category/**`・`blog/[id].astro`から使われている(Phase Dで置き換え)
- `getSettings`(`Layout.astro` / `index.astro` / `about.astro`)は記事ではなく設定情報のため、**移行対象外でmicroCMSに残す**。したがってmicroCMSの完全廃止はしない(スコープ外の項目と整合)
- `blog/[id].astro`の`draftKey`によるmicroCMSプレビューは、Markdown移行後は使えなくなる。代替はPhase Eの`published: false`運用

## 設計判断

### frontmatterスキーマ

`src/content.config.ts`。**以下はPhase Aでの設計時点の案で、実装は`src/content.config.ts`を正とする**(`thumbnail`→`icon`、`category`は名前のenum、`updatedAt`は削除)。

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(120), // 現行のmicroCMS側の上限と同じ
    category: z.array(z.string()).default([]),
    icon: z.emoji(),
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

### 画像の扱い: サムネイルは絵文字アイコンに、本文の画像はリポジトリ内へ

「外部サービス依存を減らしたい」という方針(検討事項へのコメント)と、「作品集は別アプリで表現する」という前提から、画像を次のように整理した。

- **サムネイル(42枚)は廃止する**: 記事ごとにfrontmatterの`icon`(絵文字1つ)を持たせ、記事上部・一覧・関連記事にアイコンとして表示する。既存43記事にはPhase Cで内容に合った絵文字を割り当てる。OGP画像は既存の`og.png`を使う
- **本文中の画像(174枚、うち19枚はリンク付き)は残す**: Phase Cの移行スクリプトでダウンロードして、Markdownの画像参照をローカルパスに書き換える。置き場所は`astro:assets`(`src/`配下)を第一候補とし、ビルド時にsharpで最適化する(`imageService: "compile"`)
- 記事画像のみでリポジトリサイズは数十MB程度の想定(ダウンロード後に実測する)
- `getSettings`は引き続きmicroCMSに残るため、microCMS自体の解約はこの計画の範囲外
- `z.emoji()`は絵文字の連続(`🚀🚀`)も通すため、1つだけという制約はスキーマでは保証しない
- 絵文字は彩度を持つ表示物になるため、Phase Dの実装時にDESIGN.mdの色の例外として追記する

### 未決定(要判断)

- ~~アラート記法~~: GitHub式(`> [!WARNING]`)に確定(Phase Bで実装済み)
- `output: "server"`維持か静的化か: 記事はビルド時に確定するため静的化を推奨。ただしCloudflare Worker + Terraform構成への影響(`bundle-worker.mjs`など)の確認が必要で、Phase Dで判断する
- カテゴリー管理: 8件のみのため、frontmatterの文字列配列で十分と考える。説明文が必要になったら別途検討する

### Phase B: 新パイプラインの実装(完了)

sapperの`markdownToHtml.ts`相当を、Astro Content Collectionsの`render()`と組み合わせて構築する。

- [x] `remark-gfm`: テーブル・打ち消し線・タスクリストなどのGFM記法対応 → Astroの既定でGFMが有効なため追加パッケージは不要。表・打ち消し線・タスクリスト・URL自動リンクの出力を確認済み
- [x] `rehype-pretty-code`(shiki): シンタックスハイライト。`github-light` / `github-dark`のCSS変数によるデュアルテーマ。言語指定なしのブロックは`plaintext`として処理する
- [x] `rehype-slug` + `rehype-autolink-headings`: 見出しへのアンカーリンク自動付与。`#`はCSSの疑似要素で描画する(本文テキストにするとTOCの見出し名に混入するため)
- [x] アラート: `remark-github-blockquote-alert`を導入。DESIGN.mdの方針に合わせて無彩色で表示する
- [x] リンクカード変換: `src/libs/remarkLinkCard.ts`。単独行のURLをビルド時にOGP取得してカード化する(OGP取得とカードHTMLは既存の`linkPreview.ts`を共用。旧`linkPreviewTransformer`はPhase Dで削除する)
- [x] TOC抽出: `render()`の戻り値`headings`(`{ depth, slug, text }`)をそのまま使える。`TableOfContents`の`TocItem`(`{ id, text, level }`)への変換と`depth <= 3`の絞り込みはPhase Dで配線する
- [x] コードブロックのファイル名タブ表示: ` ```ts title="hello.ts" `の記法で表示する(rehype-pretty-codeの標準機能)

### Phase C: 移行スクリプトの作成(完了)

`app/scripts/migrate-microcms-to-markdown.mjs`(`cd app && node scripts/migrate-microcms-to-markdown.mjs`)。microCMSからGETで全件取得し、`src/content/blog/<id>.md`と`src/assets/blog/<id>/`を書き出す。何度実行しても同じ結果になる(ダウンロード済みの画像は再取得しない)。実行済みで、43記事・174個の画像参照(ダウンロードした画像ファイルは98個・8.4MB。同じ記事内で同じ画像を繰り返し使っているため)が出力されている。

- [x] microCMSから全記事を取得(ページング対応。`getBlogList()`はViteの`import.meta.env`に依存しNodeスクリプトから使えないため、fetchで直接取得)
- [x] 記事本文のHTML→Markdown変換(`turndown`)
  - [x] リンクカード: 同じhrefの段落が連続するもの(12記事・20件)を単独行のURLに変換する。表示時に`remarkLinkCard`がカード化する
  - [x] 画像リンク(`<figure><a><img>`)は`[![](画像)](リンク)`、`figcaption`は斜体の1行に変換する
  - [x] テーブル6個: `<th>`が無いため先頭行をヘッダー行にする。セル内の複数段落・リストは`<br>`でつなぐ
  - [x] コードブロック: 言語を内容から推定して付与する(sh 12 / php 10 / java 10 / jsonc 4 / sql 4 / js 3 / ruby 2 / go 1 / html 1 / xml 1 / text 18)。ChatGPTのプロンプト例・コミットメッセージなど推定できないものは`text`。**ファイル名タブ用の情報は元データに無いため付与していない**
  - [x] 本文に`<h1>`がある3記事は、見出し階層を1段下げる(h1→h2, h2→h3…)
- [x] frontmatter生成(`category`は名前の文字列配列、`icon`は記事ごとに割り当てた絵文字、`publishedAt`)。`updatedAt`は移行・編集作業の日付で記事の更新日として意味がないため引き継いでいない
- [x] 本文中の画像をダウンロードして`src/assets/blog/<id>/<n>.<ext>`に配置し、Markdownの参照を相対パスに書き換える。`astro:assets`で処理されることをビルドで確認済み。**その後、本番で`imageService: "cloudflare"`の出力(`/cdn-cgi/image/...`)が404になり画像が表示されないことが分かったため、`compile`(ビルド時に最適化して`/_astro/`から配信)に変更した**
- [x] `src/content/blog/<id>.md`への書き出し(43件)
- [x] 変換結果の確認: 43記事すべてを新パイプラインでレンダリングして確認した(HTMLの取り残しなし、画像174枚がすべてローカル、テーブル6個、コードブロック78個)。**個々の記事の見た目・文章の目視レビューは未実施**

#### 変換結果で気づいたこと

- **重複記事**: `zaft3p8g9d`と`zxk6leqo0`はタイトル・本文が同一(公開日のみ異なる)。`zaft3p8g9d`を削除した
- **リンクカードにならないURL**: OGPを取得できない3種(`kantei.go.jp`のPDF・404の`forge.laravel.com`・例示のURL`example.com`)は通常のリンクのまま表示される。もともとカードだったPDFは、タイトル・抜粋を失う
- **カード化の対象が広がった**: 旧実装は「同じリンクが2個以上連続する場合のみ」カード化していたが、新実装は「URLだけの行」を全てカード化する。元記事に単独で書かれていたURL行も、OGPが取れればカードになる
- 元データにある全角スペースのインデント(`　`)がコードブロック内にそのまま残っている

### Phase D: ルーティングの切り替え(完了)

記事・一覧・カテゴリ・関連記事のすべてをContent Collectionsに切り替えた。全ページが`prerender = true`(静的HTML)になり、実行時にmicroCMSへ問い合わせるページはなくなった。

- [x] `src/pages/blog/[id].astro`をContent Collectionsに置き換え、`getStaticPaths`で43記事すべてを静的生成する(`/blog/<id>`のURLは変わらない)
- [x] 関連記事: 最初のカテゴリが同じ記事を新着順に(`src/libs/blog.ts`の`getRelatedPosts`)
- [x] 一覧・カテゴリ・ページネーションを切り替え。カテゴリのURLは`/category/<microCMS時代のid>`のまま(`src/constants/index.ts`の`CATEGORIES`に、カテゴリ名→slugを定義)。frontmatterの`category`はこの一覧のenumで検証されるため、名前の打ち間違いはビルドで検出できる
- [x] `output: "server"`のまま、全ページを静的生成にした。`infra/prod`のTerraformはWorker + `app/dist/client`の静的アセットをデプロイする構成で、`prerender`したページはそのまま配信される(`bundle-worker.mjs`・Terraformの変更は不要)
- [x] 絵文字アイコンの表示(記事上部・一覧・関連記事)。TOCは`render()`の`headings`(`depth <= 3`)から生成し、記事ページのサイドバーにカテゴリー一覧の代わりに表示する
- [x] 不要になったコードの削除: `microcms.ts`の記事・カテゴリ取得、`microcms-rich-editor-handler`(依存ごと)、旧`linkPreviewTransformer`とWorkers用の`cf`オプション、`blogContent.ts`、`noimg.png`、旧コードブロックのCSS。`turndown`は移行スクリプトでのみ使うため`devDependencies`に移した
- 記事の「Markdownをコピー」ボタンは、HTMLから変換せずMarkdownのソースをそのまま渡す(ソースの画像は相対パスのまま)
- `draftKey`によるmicroCMSプレビューは使えなくなった。下書きの扱いはPhase E
- frontmatterの`updatedAt`は表示にも使わないためスキーマから外した

### Phase E: 新規記事作成フローの整備(完了)

- [x] 新規記事のスキャフォールディングスクリプト: `pnpm new:article <slug>`(`app/scripts/new-article.mjs`)。下書き状態のひな形を`src/content/blog/<slug>.md`に作る。使えるカテゴリの一覧は`constants`の`CATEGORIES`から生成するため、二重管理にならない。既存ファイルの上書きと不正なslugは拒否する
- [x] 執筆ガイド文書: `app/docs/WRITING_GUIDE.md`(frontmatter・対応するMarkdown記法・公開手順)。sapperの`writing-style.md`にあたる文体・トーンのルールは、書き手の方針が必要なため含めていない
- [x] 下書き運用: `published: false`の記事は本番ビルドから除外し、`pnpm dev`のときだけ一覧・記事ページに「Draft」バッジ付きで表示する

## 検討事項(実装前に決めること)

- **Astro Content Collectionsを採用するか**: 本計画は採用を前提に書いているが、既存コードとの親和性を含めて最終確認する
- **アラート記法の構文**: GitHub式(`> [!WARNING]`)にするか、独自の絵文字プレフィックス等にするか。
  - Github形式でいいかも
- **画像の置き場所**: microCMSを画像CDNとして残すか、Astroの`astro:assets`によるローカル最適化に完全移行するか(後者は移行の手間が増えるが、外部サービス依存が減る)
  - 外部サービス依存を減らしたい
- **カテゴリー管理**: frontmatterの文字列配列だけで十分か、カテゴリー一覧・説明文を別途持つ仕組み(sapperのContentfulの`Tag`相当)が必要か
- あんまり必要性がわからない
- **`output: "server"`を維持するか、静的生成に寄せるか**: Cloudflare Worker + Terraformの現行インフラ構成([README.md](README.md)参照)への影響も含めて判断する
- 現行の構成を意識したい

## 対応しないこと(今回のスコープ外)

- sapperのようなGit×Contentfulのハイブリッド運用(k2-craftの規模では過剰)
- 記事の理解度チェック(選択式クイズ)機能(別件、plan.md Phase 3で見送り済み)
- microCMSの完全廃止(設定情報`settings`の取得は残す想定)
