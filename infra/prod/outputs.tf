output "zone_id" {
  value = cloudflare_zone.this.id
}

output "worker_script_name" {
  value = cloudflare_workers_script.site.script_name
}
