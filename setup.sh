#!/usr/bin/env bash
set -euo pipefail

if ! command -v catalyst >/dev/null 2>&1; then
  echo "Catalyst CLI is not installed or is not available on PATH."
  echo "Install it with: npm install --global zcatalyst-cli"
  exit 1
fi

if ! catalyst whoami >/dev/null 2>&1; then
  echo "Catalyst CLI is not authenticated. Run 'catalyst login' and retry."
  exit 1
fi

required_vars=(CATALYST_PROJECT_ID CATALYST_ACCESS_TOKEN)
for variable in "${required_vars[@]}"; do
  if [ -z "${!variable:-}" ]; then
    echo "$variable must be set before running setup.sh."
    exit 1
  fi
done

npm install
node scripts/setup-catalyst.js

echo "Catalyst setup completed. Configure the generated Filestore folder ID and application secrets in AppSail."
