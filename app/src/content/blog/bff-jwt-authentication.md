---
title: "BFF構成 JWT型認証"
description: "TODO: 概要(120文字以内。一覧のカードとmeta descriptionに使う)"
category: ["IT tech"] # 生成AI / IT tech / 学び / 心理 / エンタメ / 本 / ニュース / 就活
icon: "🔐"
publishedAt: 2026-09-20
published: false # trueにすると公開される。falseの間は本番ビルドに含まれない
---

## はじめに

1つのシステムで通常のログインと外部のフェデレーションログインを両方実装するには、認証結果を安全にBE(バックエンド)へ伝え、ユーザーを特定(同定)する堅牢な設計が求められる。

この記事では、マルチIdP構成で「誰がログインしたか」を特定するときにつまずいた点と、認証と認可を分けて実装した方法をまとめる。

## 「誰がログインしたか」を特定するのがむずかしい

外部IdP(GoogleやAuth0など)経由でログインすると、BEに送られてくるリクエストには、発行元IdP固有のフォーマットやクレーム(Claims)が含まれている。

たとえばCognitoのトークンは次のようになる。

```json title="Cognitoのトークンのクレーム"
{
  "sub": "24aa5a14-7061-70f9-8d77-123456789abc",       // [標準] ユーザー識別子
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example", // [標準] 発行元
  "exp": 1700000000,                                 // [標準] 有効期限

  // --- 以下が Cognito 固有のクレーム ---
  "cognito:username": "johndoe",
  "cognito:groups": [
    "PremiumUsers",
    "Admins"
  ],
  "token_use": "access",
  "auth_time": 1699996400
}
```

通常のログインであれば、ユーザーテーブルのメールアドレスと照合し、一致したらページを表示するのが一般的。しかしマルチIdPではこの方法に問題がある。

- IdPによってユーザー識別子が違う(`sub`や`username`などの形式が異なる)
- 情報が欠落する(セキュリティの観点から、アクセストークン自体に個人情報が含まれていない可能性が高い)

## 最初にやった実装とその落とし穴

毎回のリクエストの中で認証と認可を一緒にやろうとして詰まった。

具体的には、IdPが返す識別子を次のように加工して、メールアドレスを復元しようとした。

```text
"idp_prefix|User.Name@example.com" -> プレフィックスを削除して小文字化 -> メールアドレスとして復元
```

しかし、環境ごとに性質が異なるため、推測して判定ロジックを組むことはできなかった。IdP側が返す文字列のプレフィックスや、大文字・小文字の扱いが微妙に異なるケースが発生したためである。

> [!IMPORTANT]
> 識別子の文字列を推測して加工するやり方は、IdPや環境が増えるほど破綻する。

そこで、認証と認可を別々に実装する流れにした。

## 実装コードの事例

役割分担をNext.jsのApp Router環境に取り込んだ例を示す。

### 認証コールバック

IdPから受け取った認可コードをトークンと交換し、IDトークンで一度だけ本人確認をする。

```ts title="app/api/auth/callback/route.ts"
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: '認可コードがありません' }, { status: 400 });
  }

  try {
    // 1. 認可コードをトークン（IDトークン・アクセストークン）と交換
    const tokenResponse = await fetch('https://idp.example.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.IDP_CLIENT_ID!,
        client_secret: process.env.IDP_CLIENT_SECRET!,
        redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
      }),
    });

    const { id_token, access_token } = await tokenResponse.json();

    // 2. IDトークンの検証（ここで本人特定・署名検証を行う）
    // IDトークンはログイン時の本人確認のためだけに使い、検証後は保存せず破棄します
    const user = await verifyIdToken(id_token);

    // 3. セッションの作成とCookieへのセット（以降の認可にはアクセストークン等を使用）
    const response = NextResponse.redirect(new URL('/dashboard', request.url));

    response.cookies.set('session_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1日
    });

    return response;
  } catch (error) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}

// IDトークンの検証（概念実装）
async function verifyIdToken(idToken: string) {
  // jose等のライブラリを利用して署名や claims (sub, aud, iss) を正しくチェックする
  return { userId: 'usr_12345', email: 'user@example.com' };
}
```

ポイントは次の3つ。

1. 認可コードをIDトークン・アクセストークンと交換する
2. IDトークンの検証(署名や`sub`・`aud`・`iss`のチェック)で、ログイン時に一度だけ本人を特定する。IDトークンは検証後に保存せず破棄する
3. 以降の認可にはアクセストークンなどを使い、`httpOnly`のCookieにセットする

### ミドルウェアによるアクセス制御

Cookieにセッションがあるかどうかで、ページへのアクセスを制御する。

```ts title="middleware.ts"
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value;
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  if (isDashboard && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```
