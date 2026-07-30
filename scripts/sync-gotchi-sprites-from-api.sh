#!/usr/bin/env bash
# Download sprite sheets from gotchi.lol into assets/gotchis/.
# Use this when you want local files that match the remote API exactly.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/assets/gotchis"
mkdir -p "$DEST"

if [[ $# -eq 0 ]]; then
  set -- 2729 2731
fi

for id in "$@"; do
  url="https://gotchi.lol/api/gotchi-sprites/${id}"
  out="$DEST/${id}.png"
  echo "Fetching gotchi ${id} -> ${out}"
  curl -sf "$url" -o "$out"
done

echo "Done. Update js/config.js if you added new IDs."
