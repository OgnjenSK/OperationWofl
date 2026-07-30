#!/usr/bin/env bash
# Generate Aavegotchi sprite sheets locally (requires Node 18+).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TOOL="$ROOT/tools/aavegotchi-game-sprites"
export PATH="/opt/homebrew/bin:${PATH:-}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found. Install Node.js first: brew install node" >&2
  exit 1
fi

cd "$TOOL"
if [[ ! -d node_modules ]]; then
  npm install
fi

# Usage: ./scripts/generate-gotchi-sprites.sh --ids 2729,2731
npm run generate -- "processedAavegotchis.json" "$@"

OUT="$TOOL/website/spritesheets"
DEST="$ROOT/assets/gotchis"
mkdir -p "$DEST"
for png in "$OUT"/*.png; do
  [[ -f "$png" ]] || continue
  cp "$png" "$DEST/"
done

echo "Copied sprites to $DEST"
