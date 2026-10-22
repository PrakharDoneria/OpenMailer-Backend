#!/usr/bin/env bash
set -euo pipefail

if ! command -v catalyst >/dev/null 2>&1; then
  echo "Catalyst CLI is not installed or is not available on PATH."
  echo "Install it with: npm install --global zcatalyst-cli"
  exit 1
fi

echo "Catalyst CLI: $(catalyst --version 2>/dev/null || echo 'version unavailable')"

echo "Checking Catalyst authentication..."
if ! catalyst whoami; then
  echo "Catalyst CLI is not authenticated. Run 'catalyst login' and retry."
  exit 1
fi

npm install
npm run check

echo "Deploying AppSail service..."
deploy_output="$(mktemp)"
trap 'rm -f "$deploy_output"' EXIT

if ! catalyst deploy appsail \
  --name "openmailer-backend" \
  --build-path "." \
  --stack "node20" \
  --command "npm start" 2>&1 | tee "$deploy_output"; then
  echo "AppSail deployment failed."
  exit 1
fi

service_link="$(grep -Eo 'https?://[^[:space:]"]+' "$deploy_output" | tail -n 1 || true)"
if [ -n "$service_link" ]; then
  echo "AppSail service URL: $service_link"
else
  echo "Deployment completed, but Catalyst did not print a service URL."
  echo "Open the Catalyst console to retrieve the deployed AppSail service link."
fi