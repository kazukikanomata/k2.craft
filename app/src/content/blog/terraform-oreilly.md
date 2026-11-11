---
title: "詳解 Terraform 第三版を読んだ学んだことをまとめる"
description: "TODO: 概要(120文字以内。一覧のカードとmeta descriptionに使う)"
category: ["IT tech", "本"] # 生成AI / IT tech / 学び / 心理 / エンタメ / 本 / ニュース / 就活
icon: "📘"
publishedAt: 2026-09-20
published: false # trueにすると公開される。falseの間は本番ビルドに含まれない
---

## はじめに

Terraformを採用するにあたりどんな運用をする必要があるのか？どんなことを知らないといけないのかをまとめる。

## 最低限のTerraform文法

TerraformはHashiCorp社が開発した独自言語。シンプルに記術ができる。

https://developer.hashicorp.com/terraform/intro#what-is-terraform

```Terraform

# 1. プロバイダーを指定。AWSやGCP、Azureなどを指定できる

provider "aws" {
    region = "ap-northeast-1"
}

# 2. リソースを定義する

resource "aws_instance" "web" {
    ami = "ami-0123456789bakgiam"
    instance_type = "t3.micro"

    // タグとかも指定できる
    tags = {
        Name = "MyWebServer"
    }
}

# 3. 変数の定義

variable "environment" {
    type = string
    default = "dev"
}

# 4. リソース参照

resource "aws_security_group" "web_sg" {
    name = "web-sg"
}

resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

# 他のリソースの値を参照。<TYPE>.<NAME>.<ATTRIBUTE>
  vpc_security_group_ids = [aws_security_group.web_sg.id]
}

# 5. 出力定義
output "instance_id" {
  value = aws_instance.web.id
}
```

## terraformのステート管理について

`$ terraform plan`、`$ terraform apply`をするたびに、terraformが前に作成したリソースを検知しそれに応じてリソースを更新する。このステートの管理はどのようになっているのか？

terraformはステートというファイル（`.tfstate`と名がつくファイル）にどんなインフラを構築したのか？を記録する。以下のようなterraform定義を記術し、`$ terraform apply`を実行すると、json形式でステートファイルに作成される。

自分が手元で書いているコードとステートファイルに書かれたIDをもとに実際のデプロイされたインフラとの差分が、`plan`コマンドの出力となる。

```example.tf

resource "aws_instance" "example" {
    ami = "ami-01fa320ga0ga301"
    instance_type = "t2.micro"
}

```

```.json
# 生成されるもの

{
    "version": 4,
    "terraform_version": "1.2.3",
    "serial": 1,
    "Lineage": "86545604-7463-4aa5-e9e8-a2a221de98d2",
    "outputs": {},
    "resources": [
        {
            "mode": "managed",
            "type": "aws_instance",
            "name": "example"
            "provider": "provider [\"registry.terraform.io/hashicorp/aws\"1",]
            "instances": [
                {
                    "schema_version": 1,
                    "attributes": {
                        "ami": "ami-01fa320ga0ga301",
                        "availability_zone": "us-east-2b",
                        "id": "i-0bc4bbe5b84387543",
                        "instance_state": "running"
                        "instance_type": "t2.micro",
                        "(...) ": "(truncated)"
                    }
                }
            ]
        }
    ]
}
...
```

### terraform.tfstateファイルの管理について

個人で利用する場合はローカルPCに保存していて問題ないが、プロダクト開発においては問題が発生します。

> [!Note]
>
> 1. ステートファイルを共有された場所に置いておく必要がある
> 2. ステートファイルをロックの仕組みを設置する必要がある
> 3. ステートファイルの環境を分離する必要がある

この3つが必要になってくる。

### ステートファイルをリモートバックエンドで管理する

AWSのs3やGoogle Cloud Storageなどがリモートバックエンドをつかって共有する場所を管理するのがよさそうです。リモートバックエンドを設定することで、`plan`や`apply`時にステートファイルをバックエンドから自動的にロードできるようになる。また自動的にロックを取得してくれるため、同時に`terraform apply`を実行することも防ぐことができる。AWSのs3を使用するとほとんどが無料枠内でおさまるらしい。

```.tf
# サンプル
#terraformのstateファイルを管理するAWS s3定義

provider "aws" {
    region = "us-east-2"
}

resource "aws_s3_bucket" "terraform_state" {
    bucket = "terraform-up-and-running-state"

    # 誤ってs3バケットを削除するのを防ぐ
    lifecycle {
        prevent_destory = true
    }
}

```

より効果的にs3バケットを保護する定義

```.tf
# ステートファイルの履歴がみれるようにバージョニングを有効化する

resource "aws_s3_bucket_versioning" "enabled" {
    bucket = aws_s3_bucket_terraform_state.id
    version_configuration {
        status = "Enabled"
    }
}

# s3バケットの書き込みを暗号化する
resource "aws_s3_bucket_server_side_encryption_configuration" "default" {
    bucket = aws_s3_bucket_terraform_state.id
    rule {
        apply_server_side_encryption_by_default {
            sse_algorithm ="AES256"
        }
    }
}

# 機密情報がs3に含まれる場合はパブリックのアクセスを制限する
resource "aws_s3_bucket_public_access_block" "public_access" {
    bucket = aws_s3_bucket.terraform_state.id
    block_public_acls = true
    block_public_policy = true
    ignore_public_acls = true
    restrict_public_buckets = true
}

```

terraformを共同で使うとなると、ロックを管理するDynamoDBテーブルを作成する必要がある。整合性のある読み込みや書き取りをサポートしている。terraformのロックで使用する場合は、**LockID**というプライマリーキーをもったテーブルを作成する必要がある。

```.tf

resource "aws_dynamodb_table" "terraform_locks" {
    name = "terraform-up-and-running-locks"
    billing_mode = "PAY_PER_REQUEST"
    hash_key = "LockID" # 大文字・小文字は完全一致する必要がある

    attribute {
        name = "LockID"
        type = "5"
    }
}
```

状態を暗号化とロックが有効なs3バケットに保存するようにterraformの設定をする必要がある。

```.tf
terraform {
    backend "s3" {
        bucket = "terraform-up-and-running-state"
        key = "global/s3/terraform.tfstate"
        region = "us-east-2"
        dynamodb_table = "terraform-up-and-running-locks"
        encrypt = true
    }
}
```

> [!Warning]
> 手順は以下で、作成するがリソース削除の場合は、2→1の手順で削除する必要がある
>
> 1. s3バケットとDynamoDBテーブルを作成するterraformコードを記術、ローカルバックエンドを使用してコードをデプロイ
> 2. 新しく作成されたs3バケット・DynamoDBテーブルを使用するようTerraformバックエンドにbackend設定を追加、ローカルのステートファイルをs3にコピーするために`terraform init`を実行

### 各環境別ごとにバックエンドをどう分けるのか？（Partial Configurtion）

リモート管理ができるようになってきた反面、1つ問題がある。
Terraformの `backend` ブロック内では **変数（`var.xxx` や `local.xxx`）が使えない** という制約があります。

そのため、`dev` や `prod` など環境ごとにStateファイルの保存先を分ける際、コード内に値を直接書いていると環境ごとにフォルダやファイルを複製して書き換える必要が出てきてしまいます。

そこで役立つのが **Partial Configuration（部分構成）** という仕組みです。

```tf
# backend.tf
# backend定義を最小限にし、別ファイルで切り出す

terraform {
    backend "s3" {
        #バケット名やキーは記載せずに空欄
    }
}
```

環境ごとにパラメータだけを記述した`.hcl`ファイルを作成する。

```.tf
# env/dev/backend.hcl

bucket = "my-app-tfstate-dev"
key = "dev/terraform.tfstate"
region = "us-east-2"
dynamodb_table = "my-app-tfstate-locks-dev"
encrypt = "true"
```

```.tf
# env/prod/backend.hcl

bucket = "my-app-tfstate-prod"
key = "prod/terraform.tfstate"
region = "us-east-2"
dynamodb_table = "my-app-tfstate-locks-prod"
encrypt = "true"
```

### init時に`-backend-config`で読み込む

`terraform init`を実行する際に、対象環境の`.hcl`ファイルを渡すことで動的にバックエンドを切り替えることができます。

```bash
# dev環境初期化
$ terraform init -backend-config=envs/dev/backend.hcl

# 同じディレクトリでキャッシュするときは -reconfigureオプションをつかう

# prod環境初期化
$ terraform init -reconfigure -backend-config=envs/prod/backend.hcl
```

## ステートファイルを環境ごとにわける

全環境を一つのterraformせっていで書くのは、危険。それぞれの環境を別のterraform設定で定義することが大事になってくる。

> [!Note]
> ステートファイルを分離するには2つのやり方がある。
>
> 1. ワークスペースによる分離
>
> - 全てのワークスペースがのステートファイルが同じバックエンドに保存されるが、同じ認証とアクセス権限を使用する必要があるのがデメリット
>
> - インフラをわかりやすく管理することが困難になる可能性が高い。
>
> **2. 【推奨】ファイルレイアウトによる分離**
>
> - 著者は環境ごと、環境ごとのコンポーネント（VPC、サービス、DB）ごとにリソースを策することを推奨している
> - ただ、コピペが増えたり、環境感の依存関係が難しくなる

```
.
├── stage/
│   ├── vpc/
│   ├── services/       # この環境で動かす各アプリケーション
│   │   ├── frontend-app/
│   │   └── backend-app/
│   │       ├── variables.tf
│   │       ├── outputs.tf
│   │       └── main.tf
│   └── data-storage/   # データストアを管理するフォルダが存在
│       ├── mysql/
│       └── redis/
├── prod/
│   ├── vpc/
│   ├── services/
│   │   ├── frontend-app/
│   │   └── backend-app/
│   │       ├── variables.tf
│   │       ├── outputs.tf
│   │       └── main.tf
│   └── data-storage/
└── global/             # 全環境を跨いで使用するリソース（S3やIAM）
    ├── iam/
    └── s3/
```

## 参考
