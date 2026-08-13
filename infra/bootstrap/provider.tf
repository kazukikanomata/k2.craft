terraform {
  required_version = ">= 1.9"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.23"
    }
  }

  # このディレクトリはinfra/prod用のstateバケットを作るための一度きりのbootstrap。
  # 卵が先か鶏が先か問題を避けるため、ここだけローカルstateのまま運用する。
}

provider "cloudflare" {
  api_token = var.cloudflare_account_api_token
}
