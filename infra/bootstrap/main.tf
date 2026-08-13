resource "cloudflare_r2_bucket" "tfstate" {
  account_id = var.account_id
  name       = var.state_bucket_name
  location   = var.state_bucket_location
}
