# T‑CAPI Worker v1 (Meta) — LIVE

This PR documents and locks in the work that is already live in production.

## What’s live
- Join `click → conversion` with **idempotency** (`idempotency_key`).
- **Meta CAPI Worker v1** via outbox + **/api/destinations/meta/flush**.
- **Cloud Scheduler** job `meta-flush` (every minute) with **OIDC** to call `/api/destinations/meta/flush`.
- **Removed** `META_TEST_EVENT_CODE` from production service env.
- Basic **Smoke (prod)** workflow on GitHub Actions:
  - `GET /api/health`
  - `POST /api/destinations/meta/flush`

## How to verify quickly
```bash
REGION=us-central1
BASE="$(gcloud run services describe primis-nexus-api --region=$REGION --format='value(status.url)')"

# Health
curl -s "$BASE/api/health"

# Manual flush
curl -s -X POST "$BASE/api/destinations/meta/flush"
```

Check logs:
```bash
gcloud logging read 'logName="projects/'"$(gcloud config get-value project)"'/logs/cloudscheduler.googleapis.com%2Fexecutions"  AND resource.labels.job_id="meta-flush"' --freshness=10m --limit=3

gcloud logging read 'logName="projects/'"$(gcloud config get-value project)"'/logs/run.googleapis.com%2Frequests"  AND resource.labels.service_name="primis-nexus-api" AND httpRequest.requestUrl:"/api/destinations/meta/flush"'  --freshness=10m --limit=3
```

## Pixel Dedup (browser ↔ server)
In your site:
```html
<script>
  fbq('track','Purchase',{value:10,currency:'USD'},{eventID:'<idem-key-here>'});
</script>
```
On server: create the conversion with the **same** `idempotency_key`. Meta will deduplicate Pixel vs. Server events by `event_id`.

## Notes
- Scheduler is configured with OIDC; no public keys are stored in code.
- Test events are disabled in production; if you need instant UI feedback you can set `META_TEST_EVENT_CODE` temporarily and remove it after testing.
