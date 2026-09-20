---
title: "CI/CDパイプライン"
description: "これって何？ CIとは CIとは「Continuous Integration」の略で、「継続的インテグレーション」と訳されています。「インテグレーション」には「統合」の意味があります。ソフトウェア開発の場合、「統合」の"
category: ["IT tech"]
icon: "🔁"
publishedAt: "2022-10-23T11:35:21.000Z"
---

## これって何？

### CIとは

CIとは「Continuous Integration」の略で、「継続的インテグレーション」と訳されています。「インテグレーション」には「統合」の意味があります。ソフトウェア開発の場合、「統合」の対象は一連の作業（各種作業やテストなど）です。これでソフトウェアの動作を「継続的」に確認でき、より正確により迅速に開発を進めることが可能になります。

### CDとは

CD とは「Continuous Delivery」の略で、「継続的デリバリー」と訳されています。一般的に「デリバリー」とは何かを届けることですが、この場合は「配信」や「公開」の意味で使われています。「配信」するものは、開発テスト中のソフトウェア自体です。

ツールによって、ビルドやテスト、デプロイといったプロセスの連携や管理が可能になるものである。

## なぜ便利か？

個人的には、デプロイ環境を自動で整備できるのが大きいと思っています。

いちいちサーバーのセッテイングとかを行わなくてもすむし、一度つくってしまえば、ちょっと修正した後の状態を保ちつつ、サービスが提供されるのが非常に大きいと感じています。

## どういったツールがあるか？

###  Jenkins

2007年ローンチの老舗サービス

知識は必要だが、サービス数が多いところが魅力的？

### Circle CI

Jenkinsに次いで一般的なCIツール

テストやデプロイも自動化できる高機能なツールとして人気があるよう。

### Heroku CI

あのHerokuが提供しているサービス

Heroku上で簡単に操作できるので、もともとHerokuを利用していた方におすすめ

### 他色々

https://goworkship.com/magazine/ci-tool-comparison/

## きっかけ

Laravel forgeを使っていた関係で、少し調べてみようと思った。

学びがいがありそう。

本も結構出版されている。

https://af.moshimo.com/af/c/click?a_id=1841358&p_id=170&pc_id=185&pl_id=27060&url=https%3A%2F%2Fwww.amazon.co.jp%2Fdp%2FB08H51JHS1

https://af.moshimo.com/af/c/click?a_id=1841358&p_id=170&pc_id=185&pl_id=27060&url=https%3A%2F%2Fwww.amazon.co.jp%2Fdp%2FB09J7X39ZT

https://af.moshimo.com/af/c/click?a_id=1841358&p_id=170&pc_id=185&pl_id=27060&url=https%3A%2F%2Fwww.amazon.co.jp%2Fdp%2FB074BQQ96X
