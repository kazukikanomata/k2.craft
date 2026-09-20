---
name: new-article
description: k2-craftのブログに新しい記事のひな形(app/src/content/blog/<slug>.md)を作るときに使う。「記事を書きたい」「新しい記事を作って」「ブログのひな形」といった依頼のときに使う。slugを決めて下書きのひな形を作り、title・category・iconを埋める。
---

# 新しい記事のひな形を作る

ひな形は`app/scripts/new-article.mjs`(`pnpm new:article <slug>`)が作る。このスキルはslugの決定とfrontmatterの記入を担当する。書き方の詳細(frontmatter・Markdown記法・公開手順)は`app/docs/WRITING_GUIDE.md`にあるので、ここでは繰り返さない。

## 手順

1. **slugを決める**: 記事の題材から、内容が分かる英語のslugを付ける(例: `aws-vpc-basics`)。使えるのは英小文字・数字・ハイフン・アンダースコアのみで、そのまま`/blog/<slug>`のURLになる。題材が不明なら依頼者に聞く。

2. **ひな形を作る**: `app/`ディレクトリで実行する。同名のファイルがあると失敗するので、その場合はslugを変える。

   ```bash
   cd app && pnpm new:article <slug>
   ```

3. **frontmatterを埋める**: 作られた`app/src/content/blog/<slug>.md`のうち、次の3つを書き換える。

   - `title`: 依頼者から聞いた題材に沿ったタイトル。決まっていなければ`TODO`のまま残して確認する
   - `category`: `app/src/constants/index.ts`の`CATEGORIES`にある名前だけを使う(それ以外はビルドエラー)。当てはまるものがなければ空配列のままにする
   - `icon`: 題材に合う絵文字を1つ

   `description`は本文が書けてから`summarize-article`スキルで作るため、`TODO`のまま残す。`published: false`(下書き)は変えない。`publishedAt`はひな形が今日の日付を入れる。

4. **本文**: 依頼者が本文の内容を渡してきた場合だけ、`## はじめに`以降に書く。見出しは`##`から始める。何も渡されていなければ、ひな形のまま渡す。

5. **伝える**: 作ったファイルのパスと、`cd app && pnpm dev`で確認できること(下書きも「Draft」バッジ付きで表示される)を伝える。

## やらないこと

- 公開(`published: false`を外す)・コミット・PR作成は依頼されたときだけ行う
- 画像は依頼されたときだけ`app/src/assets/blog/<slug>/`に置く
