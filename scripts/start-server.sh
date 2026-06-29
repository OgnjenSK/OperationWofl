#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

GAME_URL='http://127.0.0.1:8080/Operation%20Wofl.html'
ASSET_URL='http://127.0.0.1:8080/assets/backgrounds/desert/desertfar.png'

wait_for_server() {
  for _ in $(seq 1 50); do
    if curl -sf "$ASSET_URL" >/dev/null 2>&1 && curl -sf "$GAME_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.1
  done
  return 1
}

if lsof -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
  wait_for_server || { echo "Port 8080 is in use but game assets are not reachable." >&2; exit 1; }
  echo "Serving HTTP on :: ready (already running)"
  exec tail -f /dev/null
fi

python3 -m http.server 8080 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait_for_server || { echo "Failed to start local server on port 8080." >&2; exit 1; }
echo "Serving HTTP on :: ready"
wait "$SERVER_PID"
