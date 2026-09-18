#!/usr/bin/env bash
# Empacota o conteúdo de public_html para deploy manual ou API.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
OUT="${1:-/tmp/chevalier_${STAMP}.zip}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE"
cp -a "$ROOT/.htaccess" "$ROOT/index.html" "$ROOT/index.php" "$ROOT/home.php" "$ROOT/login.php" "$ROOT/manifest.json" "$ROOT/release.json" "$STAGE/" 2>/dev/null || true
cp -a "$ROOT/api" "$ROOT/assets" "$STAGE/"
rm -f "$STAGE/api/config.local.php"

(
  cd "$STAGE"
  zip -r "$OUT" . >/dev/null
)
echo "$OUT"
