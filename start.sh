#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${WOP_SERVER_PORT:-3333}"
HEALTH="http://127.0.0.1:${PORT}/api/health"

echo "==> Building app (tsc -b && vite build)..."
bun run build

echo "==> Starting Bun server..."
NODE_ENV=production bun run server/index.ts &
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
	if [ "$i" -eq 60 ]; then
		echo "==> Server failed to start within 60s."
		exit 1
	fi
	sleep 1
done

echo "==> Launching Electron..."
ELECTRON_DEV=0 npx --yes electron .
