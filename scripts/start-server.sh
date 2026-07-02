#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

GAME_URL='http://127.0.0.1:8080/index.html'
ASSET_URL='http://127.0.0.1:8080/assets/backgrounds/desert/desertfar.png'
PID_FILE='.vscode/dev-server.pid'
LOG_FILE='.vscode/dev-server.log'

wait_for_server() {
  for _ in $(seq 1 50); do
    if curl -sf "$ASSET_URL" >/dev/null 2>&1 && curl -sf "$GAME_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.1
  done
  return 1
}

# Server already up and serving the game — done.
if wait_for_server; then
  exit 0
fi

# Something else is blocking the port.
if lsof -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 8080 is in use but game assets are not reachable." >&2
  exit 1
fi

# Start a detached server and exit so VS Code can launch immediately next time too.
mkdir -p .vscode
nohup python3 -m http.server 8080 > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

wait_for_server || {
  echo "Failed to start local server on port 8080." >&2
  exit 1
}

exit 0
