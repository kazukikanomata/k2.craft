---
name: find-dead-code
description: k2-craft(app/以下のAstro/TypeScriptコード)で、使われていないファイル・export・npm依存関係を検出するときに使う。「デッドコードを探して」「使ってないコードを消したい」「未参照のexportを検知して」「未使用の依存パッケージを整理して」といった依頼のときに使う。infra/(Terraform)の未使用リソース検出はスコープ外。
---

# 使われていないコードを検出する

`app/`以下(Astro/TypeScript)を対象に、[knip](https://knip.dev/)で未使用のファイル・export・npm依存関係を検出する。このリポジトリでは追加設定なし(zero-config)で誤検知なく動くことを確認済み(Astroのファイルベースルーティング`src/pages/**`やcontent collection`src/content/**`もknipのAstroプラグインが自動でエントリポイント扱いする)。

## 実行

`app/`をpackage.jsonのあるディレクトリとして、都度`pnpm dlx`で実行する(devDependencyへの追加は不要)。

```bash
cd app && pnpm dlx knip
```

出力は以下のカテゴリに分かれる(該当が無いカテゴリは表示されない)。

- **Unused files**: どこからもimportされていないファイル
- **Unused dependencies / Unused devDependencies**: `package.json`にあるがコードから参照されていないパッケージ
- **Unused exports**: exportされているが他ファイルから一度もimportされていない関数・変数・型
- **Duplicate exports**: 同じものが複数の名前でexportされている
- **unlisted / unresolved**: importされているが`package.json`に無い依存、または解決できないimport(依存の整理漏れの逆パターン)

## 削除前に必ず確認すること

検出結果は「候補」であり、そのまま消してよいとは限らない。特に以下は誤検知・見落としが起きやすい。

1. **エディタ/ツール専用パッケージ**: `prettier`のようにコードからimportせずエディタ設定(`.vscode/settings.json`)やコマンドラインだけで使うパッケージは「未使用」と出るが実際は使われている。`.vscode/`・README・CI(`.github/workflows/`)もgrepしてから判断する。
2. **`package.json`の`scripts`以外から直接呼ばれるスクリプト**: `.claude/skills/*/scripts/*.mjs`のように`node`コマンドで直接叩くスクリプトは、通常knipが検出できるが、念のためリポジトリ全体(`.claude/skills/`・`.github/workflows/`含む)を対象のファイル名でgrepして裏取りする。
3. **動的import・文字列経由の参照**: テンプレートリテラルで組み立てたimportパスなど、静的解析で追えない参照は見落とされる場合がある。
4. **意図的に外部公開しているexport**: ライブラリ的に「将来・他プロジェクトから使う」ために残しているexportは、未使用でも消さない方がよい場合がある。依頼者に用途を確認する。

削除候補ごとに上記を確認し、**確信が持てたものだけ**削除する。まとめて機械的に全部消さない。判断に迷うものは依頼者に一覧を提示して確認を取る。

## 削除後の検証

```bash
cd app && pnpm install && pnpm run lint && pnpm run typecheck && pnpm build
```

`pnpm install`は依存を削除した場合に`pnpm-lock.yaml`を更新するために必要。ビルドまで通ることを確認してから完了とする。

## やらないこと

- 依頼者の確認なしに検出結果を自動で削除しない
- `infra/`(Terraform)の未使用リソース検出はスコープ外(knipはJS/TS向けのツールであり、Terraformの構成ドリフトとは別種の問題)
- `node_modules`・`dist`などビルド成果物・依存物は対象外(knipが自動で除外する)
