#!/usr/bin/env bash
set -euo pipefail
cd ~/primis.nexus || true
PROJECT="afs-rsoc-471907" REGION="us-central1"
echo "Project: $(gcloud config get-value project) | Region: $(gcloud config get-value compute/region)"
BASE=$(gcloud run services describe primis-nexus-api --region us-central1 --format='value(status.url)' 2>/dev/null || echo "")
echo "primis-nexus-api URL: $BASE"
if [ -n "$BASE" ]; then
  echo -n "Health: "; curl -s "$BASE/api/health" || true
fi
