---
title: "Laravel forge deploy × AWS  ver.1"
description: "ソース Page Not Foundforge.laravel.com Laravel forgeとは何ぞや PHPのフレームワークであるLaravelをメンテナンスしているLaravelLLCが運営するサービスが運営す"
category: ["IT tech"]
icon: "🚀"
publishedAt: "2022-10-25T07:22:26.000Z"
---

## ソース

https://forge.laravel.com/docs/1.0/introduction.html

## Laravel forgeとは何ぞや

PHPのフレームワークであるLaravelをメンテナンスしているLaravelLLCが運営するサービスが運営するサービスのことです。

## なにができるのか？

調べるといろいろな機能があると思いますが、自分が使用した機能を抜粋

-   SSHkey設定
-   GitHubとの連携をし、コードを自動でデプロイする
-   プロビジョニング（必要なものを準備してくれる）
-   データベースを追加したり・ユーザーを追加したりなど

以前にこのサービスを利用したことがあり、この機会にもう一度アウトプットしておこうと思いました。

## 料金

3パターン存在するみたいです。1ヶ月あたりの値段は

Hobby：$12（1788円）　Growth：$19（2831円）　Business： $39（5811円）

※　現在　1$ = 149円　→　円安

## 自分がつくった環境

OS：Windows11　　サーバー：AWS　EC2

Verison：Laravel9　PHP：8.1　MySQL：8.0系かな

## 作成手順　ざっくり

1.  　AWSのアカウントを作成する　(rootユーザー・ IAMユーザー　ともに作成)
2.  　IAMユーザーで　AWSにForge用のインスタンスを作成（ユーザーを追加する・アクセス権限割り当て）
3.  　AWSのアクセスIDとシークレットアクセスキーを控えておく
4.  　Forgeのアカウントを作成する
5.  　Forgeの管理画面右上　プロフィールかな？　そこでService Providerを選択
6.  　AWSを選択し、Profilenameを入れて、さっきAWSで作成したアクセスIDとシークレットアクセスキーを入力
7.  　登録後にサーバーを作成できる。　PHPのバージョンとかを指定して作成
8.  　プロビジョニング　10分くらい待ち？
9.  　完了後は、Forgeのサーバー設定からSSHログイン用の公開かぎを登録する。
10.  　Gitとのリポジトリ連携をしてSiteをつくる。
11.  　サーバーでForgeにSSHログインする
12.  　必要なものをインストールする。
13.  　.envファイルの編集
14.  　migrationやseedingをする
15.  　IPアドレスで公開URLを確認。
16.  　DNSの設定
17.  　deployして反映されるか確認
18.  　完了

大まかなステップを記述しました。けっこうボリューミーですね。

つまったところは今後記事にしていこうかな。

## 今後の記事

-   SSHログイン用の公開かぎを登録 どうやってやるのか？
-   サーバーでForgeにSSHログインする　SSHログインはどうするのか？
-   必要なものをインストールする。　なにが必要なのか？
-   DNSの設定　DNS設定とは？　レコードとは？
-   完了　ここでまたnpmエラーハンドリング
