# Ops Notes — Cloud Scheduler + Flush

## Scheduler (meta-flush)
- Frequency: `* * * * *` (every minute)
- Auth: **OIDC**, service account: `<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`
- Target: `POST {BASE}/api/destinations/meta/flush`

### Create/Update
```bash
REGION=us-central1
PROJECT="$(gcloud config get-value project)"
PRJNUM="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
SA="${PRJNUM}-compute@developer.gserviceaccount.com"
BASE="$(gcloud run services describe primis-nexus-api --region=$REGION --format='value(status.url)')"

gcloud run services add-iam-policy-binding primis-nexus-api --region="$REGION" --member="serviceAccount:$SA" --role="roles/run.invoker"
gcloud iam service-accounts add-iam-policy-binding "$SA" --member="serviceAccount:service-$PRJNUM@gcp-sa-cloudscheduler.iam.gserviceaccount.com" --role="roles/iam.serviceAccountTokenCreator"

gcloud scheduler jobs create http meta-flush --location="$REGION" --schedule="* * * * *" --uri="$BASE/api/destinations/meta/flush" --http-method=POST --oidc-service-account-email="$SA" || gcloud scheduler jobs update http meta-flush --location="$REGION" --schedule="* * * * *" --uri="$BASE/api/destinations/meta/flush" --http-method=POST --oidc-service-account-email="$SA"
```

### Verify
```bash
gcloud scheduler jobs run meta-flush --location="$REGION"
gcloud logging read 'logName="projects/'"$PROJECT"'/logs/cloudscheduler.googleapis.com%2Fexecutions" AND resource.labels.job_id="meta-flush"' --freshness=10m --limit=3
gcloud logging read 'logName="projects/'"$PROJECT"'/logs/run.googleapis.com%2Frequests" AND resource.labels.service_name="primis-nexus-api" AND httpRequest.requestUrl:"/api/destinations/meta/flush"' --freshness=10m --limit=3
```

