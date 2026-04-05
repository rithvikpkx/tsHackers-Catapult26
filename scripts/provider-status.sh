#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export XDG_CONFIG_HOME="$ROOT_DIR/.local/xdg"
export CLOUDSDK_CONFIG="$ROOT_DIR/.local/gcloud"
export TWILIO_CLI_HOME="$ROOT_DIR/.local/twilio"
mkdir -p "$XDG_CONFIG_HOME" "$CLOUDSDK_CONFIG" "$TWILIO_CLI_HOME"

echo "== CLI versions =="
echo "supabase: $(supabase --version)"
echo "vercel: $(vercel --version | head -n 1)"
echo "gcloud: $(gcloud --version | head -n 1)"
echo "twilio: $(twilio --version)"

echo
echo "== Login status =="
echo "- Supabase:"
supabase projects list >/tmp/supabase-status.out 2>&1 || true
sed -n '1,4p' /tmp/supabase-status.out

echo
echo "- Vercel:"
vercel whoami >/tmp/vercel-status.out 2>&1 || true
sed -n '1,4p' /tmp/vercel-status.out

echo
echo "- Google Cloud:"
gcloud auth list >/tmp/gcloud-status.out 2>&1 || true
sed -n '1,8p' /tmp/gcloud-status.out
