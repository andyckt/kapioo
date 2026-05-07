#!/usr/bin/env bash
# Produce public/home-kitchen/kapioo-kitchen-tour.mp4 under GitHub's 100 MB blob limit (~95 MiB target).
# Requires ffmpeg (brew install ffmpeg).
set -euo pipefail

SRC="${1:?Usage: $0 path/to/original-kapioo-kitchen-tour.mp4}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/public/home-kitchen/kapioo-kitchen-tour.mp4"
MAX_BYTES=$((95 * 1024 * 1024))

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. Install it (e.g. brew install ffmpeg) and retry." >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"

TMP="${OUT}.tmp.mp4"
trap 'rm -f "$TMP"' EXIT

for crf in 22 24 26 28 30 32 34; do
  echo "Trying CRF ${crf}..."
  ffmpeg -y -hide_banner -loglevel warning -i "$SRC" \
    -vf "scale='min(1280,iw)':-2,format=yuv420p" \
    -c:v libx264 -preset medium -crf "$crf" \
    -c:a aac -b:a 96k \
    -movflags +faststart \
    "$TMP"
  size=$(wc -c <"$TMP" | tr -d ' ')
  if (( size <= MAX_BYTES )); then
    mv "$TMP" "$OUT"
    trap - EXIT
    rm -f "$TMP"
    echo "Wrote $(du -h "$OUT" | cut -f1) -> $OUT"
    echo "Add and commit this file (git add \"$OUT\") then push."
    exit 0
  fi
  echo "  -> ${size} bytes (still over ~95MiB)"
done

echo "Could not reach target size; try shortening the clip or lowering resolution in the ffmpeg -vf chain." >&2
exit 1
