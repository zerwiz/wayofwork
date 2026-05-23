#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${WOP_SERVER_PORT:-3333}"
HEALTH="http://127.0.0.1:${PORT}/api/health"
LOG_FILE="${ROOT}/server.log"

# Initialize log file
echo "--- Starting Way of Work Server (Electron) at $(date) ---" > "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "==> Building app..."
bun run build

echo "==> Starting Bun server..."
bun run server/index.ts >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

cleanup() {
    echo "==> Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

echo "==> Waiting for server at $HEALTH..."
for i in $(seq 1 60); do
    if curl -sf "$HEALTH" >/dev/null 2>&1; then
        echo "==> Server ready."
        break
    fi
    sleep 1
done

echo "==> Starting Electron..."
node electron/wait-prod.mjs | tee -a "$LOG_FILE"

echo "==> Electron exited, shutting down."
