# 既存Zoneをterraform importで取り込む前提のスケルトン。
# Phase 2の棚卸し(cf-terraforming generate --resource-type cloudflare_zone)で
# 実際のplan/paused状態等を確認し、値をここに反映してからimportすること。
resource "cloudflare_zone" "this" {
  account = { id = var.account_id }
  name    = var.zone_name
  type    = "full"
}

resource "cloudflare_zone_setting" "ssl" {
  zone_id    = cloudflare_zone.this.id
  setting_id = "ssl"
  value      = "strict"
}

resource "cloudflare_zone_setting" "always_use_https" {
  zone_id    = cloudflare_zone.this.id
  setting_id = "always_use_https"
  value      = "on"
}

resource "cloudflare_zone_setting" "min_tls_version" {
  zone_id    = cloudflare_zone.this.id
  setting_id = "min_tls_version"
  value      = "1.2"
}
