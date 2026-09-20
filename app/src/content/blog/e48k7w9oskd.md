---
title: "Laravel forge deploy × AWS ver.3"
description: "必要なものをインストールする ssh接続後 プロジェクトに入ったあと、Laravelで必要なものをインストールしていきます。 composerをinstallする PHPのライブラリ管理ツールである。composerをイ"
category: ["IT tech"]
icon: "📦"
publishedAt: "2022-10-27T14:58:32.000Z"
---

## 必要なものをインストールする

### ssh接続後

プロジェクトに入ったあと、Laravelで必要なものをインストールしていきます。

### composerをinstallする

PHPのライブラリ管理ツールである。composerをインストールします。

```sh
$ composer install
```

**確認する**

```sh
$ composer -V
```

install完了したら以下の要素が追加されているはず。

-   venderディレクトリ
-   composer.lockファイル

### アプリケーションキーを作成する

```sh
$ php artisan key:generate
```

LaravelのプロジェクトでGitHubからクローンした後は、.envのAPP\_KEYが空白になっている状態

→　エラーがおきるのでこのコマンドで解決する

APP\_KEYに文字列が入ればオッケイ

### .envファイルの編集

データベースの名前やAPIの設定などを追加する。

### マイグレーション云々

もちろん、マイグレーションやシーディングはされていないので、ここでおこなう。

```sh
$ php artisan migrate
```

公式より：[https://readouble.com/laravel/9.x/ja/migrations.html](https://readouble.com/laravel/9.x/ja/migrations.html)

seedingも同様

```sh
$ php artisan db:seed --class=UserSeeder
```

公式より：[https://readouble.com/laravel/9.x/ja/seeding.html](https://readouble.com/laravel/9.x/ja/seeding.html)

### npm install

引数のないコマンドでは、カレントディレクトにある**package.json** に記述されている情報を元に、そこに記述されている パッケージを **node\_modules （インストール先）にインストール**します。

```sh
$ npm install
```

詳しくはこちら：[https://zenn.dev/ikuraikura/articles/71b917ab11ae690e3cd7](https://zenn.dev/ikuraikura/articles/71b917ab11ae690e3cd7)

### マージする

JSファイルやCSSファイルをマージ（合併）しているコマンドです。

1つのアプリに対しJSやCSSファイルが複数存在するが、サイトの読み込みが遅くなることに繋がる。

そのため、ビルドをおこなうとのこと。

```sh
$ npm run build
```

こんなかんじで、IPアドレス　or　URLをだして表示されるか確認する。
