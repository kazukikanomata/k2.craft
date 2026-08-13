terraform {
  required_version = ">= 1.9"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.23"
    }
  }

  # R2をS3互換backendとして使う。account_id等の環境固有値はbackend.hclで渡す
  # (infra/bootstrap実行後に生成される backend.hcl.example を参照して作成する)。
  #   terraform init -backend-config=backend.hcl
  backend "s3" {
    key                         = "prod/terraform.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_account_api_token
}
