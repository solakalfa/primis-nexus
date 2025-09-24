#!/usr/bin/env bash
set -euo pipefail
BASE_REF="${GITHUB_BASE_REF:-HEAD~1}"
git fetch origin $BASE_REF || true
changed=$(git diff --name-only $BASE_REF...HEAD || true)
needs=false; spec=false
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  [[ "$f" == services/api/routes/* || "$f" == services/api/server.* || "$f" == services/api/src/*.mjs ]] && needs=true
  [[ "$f" == *openapi.yaml ]] && spec=true
done <<< "$changed"
if $needs && ! $spec; then
  echo "OpenAPI sync failed: routes changed but openapi.yaml did not."; echo "$changed"; exit 1
fi
echo "OpenAPI sync check passed."
