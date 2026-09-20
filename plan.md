# 記事詳細ページ UI 改善計画

## 目的

記事詳細ページ(`app/src/pages/blog/[id].astro` + `app/src/components/BlogPost.astro`)を、参考にしたい実装([azukiazusa.dev の記事詳細ページ](https://azukiazusa.dev/blog/what-is-tanstack-redact/)、ソースは [sapper-blog-app-main](https://github.com/azukiazusa1/sapper-blog-app))に近づけ、読みやすく・書きやすいUIにする。

## 現状(k2-craft)

- `BlogPost.astro` がサムネイル・タイトル・日付・カテゴリタグ・TOC・本文をまとめて描画
- TOC は `microcms-rich-editor-handler` の `tocExtractor` で抽出済みだが、静的な箱表示のみ(開閉・スクロール追従・現在位置ハイライトなし)
- コードブロックはファイル名ラベルまでは対応済み(`codeBlockFileNameTransformer`)だが、コピー機能なし
- 画像クリックでの拡大表示、Markdownコピー、SNSシェア、GitHub編集リンク、関連記事、理解度チェック(クイズ)は未実装

## 参考実装(sapper-blog-app-main)の要素

`app/src/components/Card/Card.svelte` と `TableOfContents/TableOfContents.svelte` を中心に確認。主な要素:

1. ヒーロー: サムネイル画像 → タイトル → 日付・タグ → Markdownコピー・要約(about)
2. TOC
   - デスクトップ: 本文の右側にスティッキーサイドバーとして表示、開閉トグル(状態はlocalStorageに保存)
   - モバイル: 見出し直下にボックス表示
   - IntersectionObserverで現在読んでいる見出しをハイライト
3. 本文
   - コードブロックに右上コピー ボタン(コピー後チェックアイコン+「コピーしました」ポップアップ)
   - 本文中の画像をクリックすると拡大表示するモーダル(リンク内画像は対象外)
4. フッター的な要素
   - Contributors(GitHubの共同編集者アバター)
   - GitHubで修正を提案するリンク
   - SNSシェアボタン(X / はてな、Web Share API対応ブラウザはネイティブシェア)
   - Markdownバージョンへのリンク
   - 記事の理解度チェック(4択クイズ、`selfAssessment.quizzes`)
   - 関連記事一覧

## 対応事項

### Phase 0: 設計基盤の整備(完了)

sapper-blog-app-mainから「盗みたい」と判断した3つの技術を、実装より先に土台として整えた。

- [x] **DESIGN.mdに原則を明文化**: 「設計原則」節(4原則)、「カラーパレットの制約」節、「日本語組版の細部」節、「制約の実施方針」節を追加
- [x] **制約をツールで強制する**:
  - `app/src/styles/global.css`の`@theme`で未使用パレット(slate/zinc/neutral/stone及び彩度パレット全般)を`initial`に設定。`gray`のみ許容(既存コードで唯一使用されていたため)
  - k2-craftに新規ESLint(flat config, `eslint-plugin-astro` + `typescript-eslint`)を導入し、`no-restricted-syntax`で無効化パレットのクラス名(動的生成分含む)を検出するルールを追加(`app/eslint.config.js`)。`pnpm run lint`スクリプトを追加
  - 検証: 一時的に`text-blue-500`を仕込みlintが検知することを確認済み。既存コードは違反なし(副次的に見つかった未使用変数・`any`型のlintエラー2件も修正済み)
- [x] **日本語組版の細部をglobal.cssに追加**: `text-autospace`, `text-spacing-trim`, 見出しのみ`font-feature-settings: "palt"` / `word-break: auto-phrase` / `text-wrap: balance`, `overflow-wrap: anywhere`, `line-break: strict`。devサーバーで実ページの算出スタイルを確認し、見出しにのみ適用され本文には適用されないことを確認済み

### Phase 1: 見やすさに直結する部分(完了)

- [x] TOCをスティッキー化し、デスクトップ(lg以上)では本文横に固定表示する
  - 実装: [TableOfContents.astro](app/src/components/TableOfContents.astro)を新規作成。同じpropsでmobile/desktopの2箇所に描画し、CSS(`global.css`の`.toc-mobile`/`.toc-desktop`)でブレークポイントごとに表示を切り替え
  - [BlogPost.astro](app/src/components/BlogPost.astro)の本文を`lg:grid lg:grid-cols-[minmax(0,1fr)_220px]`に変更し、既存のグローバル2カラム(記事+カテゴリ一覧)とは独立した入れ子グリッドでTOCを本文横に配置
- [x] TOCの開閉トグルを実装し、状態をlocalStorageに保存する(`toc-state`キー。mobile/desktop両インスタンスが連動することをブラウザで確認済み)
- [x] IntersectionObserverで現在の見出しをTOC上でハイライトする(desktop版のみ、`data-toc-highlight`で判定)
- [x] コードブロックにコピー ボタンを追加する(コピー完了のフィードバック含む)
  - 実装中に発見した不具合: ボタンを`pre.insertAdjacentElement("afterend", ...)`で兄弟要素として挿入すると、`pre`自身の`position: relative`が効かずページ右上(テーマ切り替えボタンの上)に張り付く不具合があったため、`pre.appendChild(...)`で子要素として追加するよう修正済み
- [x] 本文中の画像をクリックしたときに拡大表示するモーダルを実装する(リンク内画像は除外、Escapeキーでも閉じられることを確認済み)

### Phase 2: 記事の見つけやすさ・書きやすさ(完了)

- [x] 関連記事セクションを追加する: **同一カテゴリから新着順**で取得(自身を除外、上限4件)
  - 実装: [microcms.ts](app/src/libs/microcms.ts)に`getRelatedBlogs(categoryId, excludeId)`を追加(`category[contains]...[and]id[not_equals]...`、`orders: "-publishedAt"`)。[RelatedArticles.astro](app/src/components/RelatedArticles.astro)を新規作成し既存の`BlogList`を再利用、`[id].astro`から呼び出し
- [x] 記事下部にSNSシェアボタン(X、可能ならWeb Share API)を追加する
  - 実装: [ShareButton.astro](app/src/components/ShareButton.astro)。Xの共有リンクは常時表示、Web Share API対応環境(`"share" in navigator`)でのみネイティブ共有ボタンを表示。devサーバーで両方の生成URL・表示切り替えを確認済み
- ~~GitHubで修正を提案するボタン~~: **見送り**。k2-craftはmicroCMS管理で記事ソースがGitHubに無く、sapper版と前提が異なるため対象外とする

### Phase 3: 発展的な機能(任意)

- [ ] Markdownコピー ボタン(記事本文を丸ごとMarkdownとしてコピー)
- [ ] 記事の理解度チェック(選択式クイズ)は、記事データにクイズ項目を持たせる仕組みが必要なため、必要性を再検討してから着手する

## ダークモード対応(サイト全体・記事詳細ページのスコープ外だが対応済み)

記事詳細ページに限らずサイト全体に関わるため、独立した節として記録する。詳細仕様は[DESIGN.md](DESIGN.md)の「ダークモード」節を参照。

- [x] `global.css`にダークモード用トークン(`bg`/`ink`/`muted`/`line`/`line-strong`)を追加し、`@variant dark`でclass戦略に切り替え
- [x] ヘッダー・ヒーローに切り替えボタン(`ThemeToggle.astro`)を設置(ライト/ダークの2状態切り替え、初回はOS設定に従う)
- [x] `<head>`に同期スクリプトを追加しFOUCを防止、OS設定変更のリアルタイム反映にも対応
- [x] `.entry-content`や`prose`など、トークン化していない`gray-*`直書き箇所に`dark:`バリアントを追加
- [x] 実機確認: devサーバーでライト⇔ダーク切り替え、記事詳細ページの背景色・見出し色・アクセント色・`dark:prose-invert`の反映をブラウザの算出スタイルで確認済み
  - 副次的な発見: `BlogPost.astro`は現時点で`syntaxHighlightingByShikiTransformer`を使っておらず、コードブロックはシンタックスハイライトされていない(無色のグレー背景のみ)。そのためshikiのトークン単位インライン色とダークモードの衝突は今回は発生しない。将来的にシンタックスハイライトを追加する際は、ダーク/ライト両対応のshikiテーマ選定が別途必要になる

## 対応しないこと(今回のスコープ外)

- Contributors(共同編集者表示): k2-craftは個人ブログでGitHubでの複数人編集フローも無いため対象外

- フレームワーク自体の変更(Astro→SvelteKit等)
- モノレポ化
- 記事管理フロー自体の変更(microCMSの運用方法)
