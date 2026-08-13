variable "cloudflare_account_api_token" {
  description = "Cloudflareのスコープ限定Account APIトークン(Zone/DNS/Workers/R2権限)。terraform.tfvarsで設定する。R2 backend用のS3互換キー(access_key/secret_key)とは別物。"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "対象CloudflareアカウントのID"
  type        = string
}

variable "state_bucket_name" {
  description = "infra/prodのTerraform stateを保存するR2バケット名(既存の'blog-tfstate'をimportして使う)"
  type        = string
  default     = "blog-tfstate"
}

variable "state_bucket_location" {
  description = "R2バケットのロケーションヒント(大文字必須)"
  type        = string
  default     = "APAC"
}
