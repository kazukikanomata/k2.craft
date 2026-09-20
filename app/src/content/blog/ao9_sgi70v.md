---
title: "【初学者向け】オブジェクト指向をJavaで理解する vol.2"
description: "はじめに 前回に引き続き、オブジェクト指向をJavaで理解していく。 今回は、オーバロード・コンストラクタ・staticの3つを理解していく。 オーバロード クラス内に同じ名前で引数の型の数が違うメソッドを複数定義するこ"
category: ["IT tech"]
icon: "🧩"
publishedAt: "2024-11-13T23:54:17.000Z"
---

## はじめに

前回に引き続き、オブジェクト指向をJavaで理解していく。

今回は、オーバロード・コンストラクタ・staticの3つを理解していく。

## オーバロード

**クラス内**に同じ名前で引数の型の数が違うメソッドを複数定義すること

```java
class Student {
　void setData(){
  }
  
  void setData(String n, int e, int m){
  }
}
```

```java
// 呼び出し
main(){
 Student stu = new Student();
 stu.setData("菅原");
 stu.setData("菅原", 80, 50);
}
```

![](../../assets/blog/ao9_sgi70v/1.png)

同じ名前のメソッドがほしいときに、setData2()とかしなくていいのはいいですよね

呼び出す側にとっても、引数がどれにあたるかなどを判断し呼び出しやすいことがわかります。

## コンストラクタ

**オブジェクトを初期化するために使われるメソッド**のことを指します。

ルールは

-   名前がクラス名と同じこと
-   戻り値をもたないこと

呼び出し方は、`new クラス名`で呼び出すことができます。

```java
class Student {
 Student(String n){

 }
 Student(String n, int m, int n)
}
```

```java
main(){
  // これまで
  Student stu1 = new Student();
  stu1.setData("菅原");

　// コンストラクタ
  Student stu1 = new Student("菅原");
}
```

![](../../assets/blog/ao9_sgi70v/1.png)

いちいち、newしてメソッドを呼びださなくていいのは楽ですよね

## static

全インスタンス変数が使えるメンバ変数やメソッドを定義するには`static`を指定する。

`static`を付与すると、クラスをインスタンス化しなくてもアクセスできるようになります。

```java
class Hero {
  String name;
  int hp;
  static String ability;
  
  static void attack(){
    System.out.println("攻撃する")
  }
}

public static void main(String[] args){
  System.out.println(Hero.ability); // 静的フィールド
  Hero.attack(); // 静的メソッド
}
```

`static`で指定したフィールドは静的フィールドとよばれ、`static`で指定したメソッドは静的メソッドと呼ばれる。

### thisにはアクセスできない

静的メソッドでは、インスタンスはなくインスタンスを示すthisにもアクセスできません。

## おわりに

オーバーロード・コンストラクタ・staticについて学んでいきました。

次回は継承について学んでいきましょう。
