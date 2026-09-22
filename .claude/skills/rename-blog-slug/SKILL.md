---
name: rename-blog-slug
description: k2-craftのブログ記事(app/src/content/blog/<slug>.md)のファイル名(=URLスラッグ)が、WordPress由来のランダムな文字列(例: 0itt68x6jc8)になっているものを、内容が分かるSEOフレンドリーな英語スラッグに直すときに使う。「スラッグを直して」「URLをSEO向けにして」「ハッシュ化されたファイル名を修正して」といった依頼のときに使う。
---

# ブログ記事のスラッグ(URL)をSEOフレンドリーに直す

記事のファイル名がそのままURL(`/blog/<slug>`)になる(`app/docs/WRITING_GUIDE.md`参照)。WordPressからそのまま持ってきた記事は、ファイル名が内容と無関係なランダム文字列になっていることが多く、これをSEO上意味のある英語スラッグに直す。

## 対象の見つけ方

`app/src/content/blog/`配下で、意味の読み取れないファイル名(英数字の羅列。例: `0itt68x6jc8`, `fkdv45ari`)が対象。`title`から内容を判断してスラッグを決める。

```bash
cd app/src/content/blog && for f in *.md; do echo "${f%.md} | $(grep -m1 '^title:' "$f")"; done
```

## 手順(1記事あたり)

1. **新しいスラッグを決める**: `title`(と必要なら本文)から、内容が分かる英語のスラッグを付ける。使えるのは英小文字・数字・ハイフンのみ(アンダースコアより読みやすいのでハイフンを使う)。書籍レビューは`-book-review`、映画感想は`-movie-review`、シリーズものは`-part1`/`-vol1`のように末尾に番号を付けて前後の回と区別する。

2. **ファイルと画像フォルダをリネームする**(履歴を残すため`git mv`を使う。画像フォルダが無い記事は2番目のコマンドを省略):

   ```bash
   git mv app/src/content/blog/<old>.md app/src/content/blog/<new>.md
   git mv app/src/assets/blog/<old> app/src/assets/blog/<new>
   ```

3. **本文中の画像参照パスを直す**: `<new>.md`内の`../../assets/blog/<old>/`を`../../assets/blog/<new>/`に置換する(記事は自分のフォルダしか参照しないので、その記事のファイル内だけを対象にすれば安全)。

   ```bash
   sed -i '' "s#assets/blog/<old>/#assets/blog/<new>/#g" app/src/content/blog/<new>.md
   ```

4. **旧URLのリダイレクトを追加する**: このプロジェクトにはサイトマップ・RSSは無いが、リダイレクトの仕組みも無いため`app/public/_redirects`(Cloudflare Pages形式)に1行足す。既存の被リンクや検索インデックスを引き継ぐため。ファイルが無ければ新規作成する。

   ```
   /blog/<old> /blog/<new> 301
   ```

## 全部まとめて片付けるとき

複数記事をまとめて直す場合は、(old, new)の対応表をシェルの連想配列などで作り、上記4ステップをループで回す。最後に必ずビルドで確認する。

```bash
cd app && pnpm build
```

ビルドが通れば、新スラッグでページが生成され`_redirects`も出力に含まれることを確認できる(`dist/client/blog/<new>/index.html`と`dist/client/_redirects`)。

## やらないこと

- `title`・`description`など他のfrontmatterは変えない(このスキルはスラッグとそれに伴う画像パス・リダイレクトだけを扱う)
- 他の記事からこの記事へのリンクは`post.id`から動的に生成されているため(`BlogList.astro`等)、手動で直す必要はない
- サイトマップ・RSSの更新は不要(このプロジェクトには存在しない)
