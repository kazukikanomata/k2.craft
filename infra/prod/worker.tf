# NOTE: content_file/content_sha256はesbuildバンドル後の単一ファイルを前提とする
# (app/scripts/bundle-worker.mjs、Phase 3参照)。ビルド前に terraform plan/apply すると
# filesha256() がファイル未存在エラーになるため、必ず `pnpm build` を先に実行すること。
#
# content_file + main_module + assets + bindings の組み合わせはプロバイダのドキュメント例が
# 複数パターン混在で分かりにくいため、Phase 5のカットオーバー前に必ず
# `terraform validate` と実際の `terraform plan` でエラーが出ないことを確認する。
resource "cloudflare_workers_script" "site" {
  account_id  = var.account_id
  script_name = var.worker_script_name

  content_file   = var.worker_bundle_path
  content_sha256 = filesha256(var.worker_bundle_path)
  main_module    = basename(var.worker_bundle_path)

  compatibility_date = var.compatibility_date

  assets = {
    directory = var.worker_assets_directory
    config = {
      not_found_handling = "404-page"
    }
  }

  observability = {
    enabled = true
  }
}

resource "cloudflare_workers_custom_domain" "site" {
  account_id = var.account_id
  zone_id    = cloudflare_zone.this.id
  hostname   = var.zone_name
  service    = cloudflare_workers_script.site.script_name
}
