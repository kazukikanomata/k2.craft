variable "cloudflare_account_api_token" {
  description = "Cloudflareのスコープ限定Account APIトークン(Zone/DNS/Workers/R2権限)。terraform.tfvarsで設定する。R2 backend用のS3互換キー(access_key/secret_key)とは別物、それはbackend.hclに書く。"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "対象CloudflareアカウントのID"
  type        = string
}

variable "zone_name" {
  description = "本番ドメイン"
  type        = string
  default     = "k2-craft.com"
}

variable "worker_script_name" {
  description = "Workerスクリプト名(既存デプロイ済みのものと合わせる)"
  type        = string
  default     = "astro-simple-blog"
}

variable "worker_bundle_path" {
  description = "esbuildでバンドルした単一ファイルWorkerの出力パス"
  type        = string
  default     = "../../app/dist/worker-bundle.mjs"
}

variable "worker_assets_directory" {
  description = "Astroビルドの静的アセット出力ディレクトリ"
  type        = string
  default     = "../../app/dist/client"
}

variable "compatibility_date" {
  description = "Worker互換性日付。app/dist/server/wrangler.jsonの値と合わせる"
  type        = string
}
