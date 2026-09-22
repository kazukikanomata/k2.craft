---
title: "Gitの掟"
description: "Gitのコミットメッセージを「1行目に要約、2行目は空行、3行目以降に理由」と書くルールと、その書き方の例を紹介する。"
category: ["IT tech"]
icon: "🌿"
publishedAt: "2022-10-18T07:55:45.000Z"
---

## Gitとは

バージョン管理ツールのことです。バージョンごとに管理することができるので、バグが発生した際にも戻ることができるのはよいですね。

## なぜこれをテーマに？

インターン先で、Gitの小さなルールが暗黙的に浸透していたので、おさらいしておくのがよいと思いました。

### 3行で記述する

1行目：　*変更内容の要約（****タイトル****、概要）*

2行目：　空白

3行目：　*変更した理由（内容、詳細）*

↑　このルールが圧倒的に浸透しているようです。

---

**改行なしコミット**

```text
Derezz the master control program MCP turned out to be evil and had become intent on world domination. This commit throws Tron's disc into MCP (causing its deresolution) and turns it back into a chess game.
```

**改行コミット**

```text
Derezz the master control program

MCP turned out to be evil and had become intent on world domination.
This commit throws Tron's disc into MCP (causing its deresolution)
and turns it b
```

　より
