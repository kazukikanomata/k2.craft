## 概要

`/blog/[id]`(記事詳細ページ)がブラウザから「Not Found」または「Error 1101(Worker threw exception)」になり、記事が読めなくなっていた。

## 発生日

2026-08-13

## 症状

- `https://k2-craft.com/blog/<id>` にブラウザでアクセスすると、サイト自身の404ページが表示される
- `curl`だけでは再現せず、`Accept: text/html`ヘッダーを付けたリクエストでのみ再現した
- 修正の途中で、今度はCSSが読み込まれずレイアウトが崩れる問題やトップページ自体が真っ白になる問題が新たに発生した

## 原因

2段階の問題が重なっていた。

### 原因1: 動的ルートがWorkerに届く前に404で止められていた

`infra/prod/worker.tf`の`assets.config`に`run_worker_first`を設定していなかった(デフォルト`false`)。この場合Cloudflareは「リクエストされたパスが静的ファイルに一致しなければ、Workerを呼ばずに`not_found_handling = "404-page"`の404ページを直接返す」という挙動になる。

`/blog/[id].astro`は`prerender = false`で、ビルド時に静的HTMLを生成せずリクエストごとにmicroCMSから記事を取得してSSRするため、静的ファイルとして一致するものが存在しない。結果、ブラウザ(`Accept: text/html`を送る)からのアクセスは毎回Workerに到達する前に404インターセプトされていた。

`curl`単体では`Accept: text/html`を送らないため、たまたまこの404インターセプトを回避してWorkerまで到達し、正常に見えていた(調査を混乱させた原因)。

### 原因2: ASSETS bindingが元々欠けていた

原因1を直すために`run_worker_first = true`に変更したところ、今度はCSS・画像・トップページなど**あらゆる静的アセット配信もWorkerを経由する**ようになり、以下の例外が発生した。

```
TypeError: Cannot read properties of undefined (reading 'fetch')
    at matchStaticAsset (worker-bundle.mjs:...)
```

原因は、`worker.tf`の`bindings`に`SESSION`(未使用と判断し削除済み)しか書かれておらず、静的アセット配信に必要な`ASSETS` bindingが最初から明示的に宣言されていなかったこと。`run_worker_first = false`だった間は静的リクエストがWorkerを経由しないため表面化しなかったが、`true`に変えたことで一気に顕在化した。

## 対応

`infra/prod/worker.tf`の`cloudflare_workers_script.site`に以下を追加。

```hcl
assets = {
  directory = var.worker_assets_directory
  config = {
    not_found_handling = "404-page"
    run_worker_first    = true # 動的ルートを必ずWorkerに届かせる
  }
}

bindings = [
  {
    name = "ASSETS"
    type = "assets"
  }
]
```

`terraform apply`後、Cloudflareのキャッシュに残っていた古い404レスポンスを`purge_cache`(`purge_everything`)でパージし、`wrangler tail`でリアルタイムログを見ながら解消を確認した。

## 教訓

- Cloudflare Workers + Static Assets構成では、`run_worker_first`を明示しないと動的SSRルートが静的アセット扱いの404にインターセプトされる
- `assets`設定を使う場合、`ASSETS` bindingは自動生成されないため`bindings`に明示的な宣言が必要
- `curl`での動作確認だけでは不十分だった(`Accept`ヘッダーの違いで挙動が変わるため)。ブラウザ相当のヘッダーを付けた`curl`や`wrangler tail`でのログ確認が有効だった
