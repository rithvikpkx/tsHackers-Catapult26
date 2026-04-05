#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export XDG_CONFIG_HOME="$ROOT_DIR/.local/xdg"
mkdir -p "$XDG_CONFIG_HOME"

exec vercel login
