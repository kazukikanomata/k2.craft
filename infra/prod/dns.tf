# Phase 2で `cf-terraforming generate --resource-type cloudflare_dns_record --zone <zone-id>` を実行し、
# 実際のレコード(A/AAAA/CNAME/MX/TXT等)をここに反映してから import すること。
# Workerのカスタムドメイン用レコードはCloudflareが自動管理するため、
# ここで重複定義しない(worker.tfのcloudflare_workers_custom_domainに任せる)。
