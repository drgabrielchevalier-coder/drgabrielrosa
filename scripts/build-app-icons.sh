#!/usr/bin/env bash
# Regenera ícones do app a partir do monograma GR (mark-gr-gold.png).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/img/brand/mark-gr-gold.png"
OUT="$ROOT/assets/img/icons"
BG="#0d0e0c"

if [[ ! -f "$SRC" ]]; then
  echo "missing source: $SRC" >&2
  exit 1
fi
mkdir -p "$OUT"

gen() {
  local size="$1" out="$2" pad ratio="${3:-0.08}"
  pad="$(python3 -c "print(int($size * $ratio))")"
  local inner=$((size - 2 * pad))
  ffmpeg -y -i "$SRC" \
    -vf "scale=${inner}:${inner}:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:${BG}" \
    -frames:v 1 "$out" >/dev/null 2>&1
  echo "wrote $out"
}

gen 16  "$OUT/icon-16.png" 0.04
gen 32  "$OUT/icon-32.png" 0.04
gen 48  "$OUT/icon-48.png" 0.04
gen 96  "$OUT/icon-96.png" 0.05
gen 128 "$OUT/icon-128.png" 0.05
gen 144 "$OUT/icon-144.png" 0.05
gen 180 "$OUT/apple-touch-icon.png" 0.05
gen 192 "$OUT/icon-192.png" 0.04
gen 256 "$OUT/icon-256.png" 0.05
gen 384 "$OUT/icon-384.png" 0.05
gen 512 "$OUT/icon-512.png" 0.04
gen 512 "$OUT/icon-512-maskable.png" 0.20

ffmpeg -y -i "$OUT/icon-16.png" -i "$OUT/icon-32.png" -i "$OUT/icon-48.png" \
  -filter_complex "[0]scale=16:16[a];[1]scale=32:32[b];[2]scale=48:48[c]" \
  -map '[a]' -map '[b]' -map '[c]' "$ROOT/assets/img/favicon.ico" >/dev/null 2>&1
cp "$ROOT/assets/img/favicon.ico" "$ROOT/favicon.ico"
cp "$OUT/apple-touch-icon.png" "$ROOT/apple-touch-icon.png"
cp "$OUT/icon-192.png" "$ROOT/icon-192.png"
cp "$OUT/icon-512.png" "$ROOT/icon-512.png"
echo "favicon.ico + root icons updated"
