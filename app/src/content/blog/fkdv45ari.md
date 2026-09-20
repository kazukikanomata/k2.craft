---
title: "【エンジニア初学者向け】SQLとORMの違いを比較してみた"
description: "SQLとORMの違いを、自由度・開発体験・複雑なクエリ・N+1問題・SQLインジェクション対策などの観点で比較した初学者向けの記事。"
category: ["IT tech"]
icon: "💾"
publishedAt: "2024-08-16T02:00:32.000Z"
---

## はじめに

研修のタスクで、クエリをかく機会があり、そのときにORMの方が便利じゃね？っとおもいつつもSQLならではの良さってなんだろうとおもいこの記事をかいてみることにしました。

## この記事の対象者

こんな方に読んでいただきたいです

-   SQLとORMの違いを理解したい
-   プロジェクトでどちらを採用するのがいいのかわからず悩んでいる
-   そもそも、それぞれのメリット・デメリットを考慮したい

## SQLとは

データベースを操作するための言語です。

```sql
SELECT * FROM employees WHERE department_id = 1;
```

データを取得・更新・追加・削除（CRUD）をかく言語になります

## ORMとは

SQLをかかずにデータベースを操作するための技術のことです。**O**beject-**R**elational-**M**appingの頭文字をとっています。

```ruby
p = Product.new
p.name = "Some Book"
puts p.name #=> "Some Book"
```

### ORMの種類

ORMはそれぞれのプログラミング言語ごとに存在しています。

-   Laravel：Eloquent ORM
-   Ruby：Active Record
-   Node.js：Sequalize ・Prisma
-   Python：SQL Alchemy
-   Go：Gen

![中の人](../../assets/blog/fkdv45ari/1.png)

中の人

データベースの情報を取得するのはバックエンド言語の役割です。それぞれの言語ごとにあっていいですね

## いろいろな観点で比較してみる

それでは、SQLとORMを比較してみましょう。

### SQLとORMどちらが自由度高いか？

これは、SQLだと思います。

-   **パフォーマンス最適化**できる
-   サブクエリが作成できる

インデックスをつくることができパフォーマンスをあげることができます

```sql
CREATE INDEX idx_employee_name ON employees(employee_name);
```

また、サブクエリを作成して別のクエリを含めることができます。

```sql
SELECT employee_name 
FROM employees 
WHERE department_id IN (
    SELECT department_id FROM departments WHERE location = 'New York'
);
```

### エンジニアの開発体験としてどうか？

ORMが優位だと思います。長いSQLを書くことなく、可読性をあげることができます。

```php
// Userテーブルの、emailカラムのexample@example.comを取得
$user = User::where('email', 'example@example.com')->first();
```

![中の人](../../assets/blog/fkdv45ari/1.png)

中の人

個人的に、SQLは別言語としての感覚なので、他の言語（PHP）の中にSQLがあると違和感でてきますね

### 他のデータベースとの関係性の定義はどうか？

リレーションの話ですが、こちらもORMが優位だと思います。どっちを書きたいですか？

```sql
SELECT * 
FROM users
LEFT JOIN profiles ON users.id = profiles.user_id
```

```php
   // Userとの1対1の関係を定義
   public function user()
   {
       return $this->belongsTo(User::class);
   }
   
   // Profileとの1対1の関係を定義
   public function profile()
   {
       return $this->hasOne(Profile::class);
   }
```

![中の人](../../assets/blog/fkdv45ari/1.png)

中の人

2つのテーブルとの関係性なので、複雑性は少ないですがORMのほうが可読性は高いかなと思います

### 複雑なクエリに関してどう？

どちらでもGoodです！

ただ、テーブル数が多くて複雑なデータベースは混乱するので、SQLのほうがいいかもです。

### N+1問題はどう？

こちらは、SQLが最適です。

N+1問題はデータベースからデータを取り出す際に、大量のSQLが実行されて動作が重くなるという問題です。

[![](../../assets/blog/fkdv45ari/2.png)](https://pikawaka.com/rails/n1)

![中の人](../../assets/blog/fkdv45ari/1.png)

中の人

一回のクエリで、複数のリレーションが絡むと実行時間がおやおやとなってきますね

取得したいデータだけに注目して、それを抽出したSQLが有効ですね。ORMでは対策が必要です。

### SQLインジェクション対策に対してはどうか？

こちらはORMですね。

SQLインジェクションとは、Webアプリケーションの脆弱性を利用して、データベースに不正なSQL文を注入し、情報を不正に取得、改ざん、削除する攻撃手法のことです。

![中の人](../../assets/blog/fkdv45ari/1.png)

中の人

SQLを直接かかないので、防げる点があげられるかなと思います

## おわりに

SQLもORMもそれぞれ強みがありますよね。どちらをかけるにこしたことはないのでは思います。

PJTに関わっているメンバーの能力値やリリースまでの期間や予算やプロダクトとの相性などなど…..そのときの状況に応じて、ユースケースを考えながら使っていきたいですね。
