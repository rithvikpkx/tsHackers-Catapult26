#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export CLOUDSDK_CONFIG="$ROOT_DIR/.local/gcloud"
mkdir -p "$CLOUDSDK_CONFIG"

exec gcloud auth login
