# Project Constants — Primis.Nexus
> Source of truth committed to Git. AI mirrors from here.

## Repos
- Primis.Nexus repo URL: https://github.com/solakalfa/primis-nexus.git\n- Primis.Nexus Site repo URL: https://github.com/solakalfa/primis-nexus-site.git

## GCP
- Project ID: afs-rsoc-471907
- Region: us-central1
- Cloud Run services:
  - primis-nexus-api → https://primis-nexus-api-5tcyo5pziq-uc.a.run.app
  - afs-rsoc-api     → <ADD_URL_IF_NEEDED>
  - afs-rsoc-api-stg → <ADD_URL_IF_NEEDED>
- Cloud SQL instances:
  - nexus-pg (POSTGRES_16) in us-central1
  - afs-postgres (POSTGRES_14) in us-central1

## Paths
- Cloud Shell workdir: ~/primis.nexus

## Conventions
- Always `cd ~/primis.nexus` before running commands
- Every API change updates services/api/src/openapi.yaml (Redoc from it)
