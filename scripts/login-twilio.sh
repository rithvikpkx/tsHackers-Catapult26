#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export TWILIO_CLI_HOME="$ROOT_DIR/.local/twilio"
mkdir -p "$TWILIO_CLI_HOME"

exec twilio login
