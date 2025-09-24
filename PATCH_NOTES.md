# Primis Nexus — Observability v1 (in-app metrics)

Adds:
- `services/api/middleware/metrics.mjs` — capture per-request latency + status.
- `services/api/routes/api/metrics-report.mjs` — GET `/api/reports/summary?hours=24`.

## Wire-up (server.mjs)
```js
import metrics from './middleware/metrics.mjs';
import metricsReportRouter from './routes/api/metrics-report.mjs';
app.use(metrics.requestTimer);
app.use('/api', metricsReportRouter);
```

## Deploy
```bash
REGION=us-central1
SERVICE=primis-nexus-api
gcloud run deploy "$SERVICE" --region="$REGION" --source .
```

## Test
```bash
BASE="$(gcloud run services describe primis-nexus-api --region=us-central1 --format='value(status.url)')"
curl -s "$BASE/api/reports/summary?hours=24" | jq .
```
