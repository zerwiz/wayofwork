#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${WOP_SERVER_PORT:-3333}"
HEALTH="http://127.0.0.1:${PORT}/api/health"

echo "============================================"
echo "  Way of Work Server"
echo "============================================"
echo ""
echo "  Web interface:    http://127.0.0.1:${PORT}"
echo "  API health:       ${HEALTH}"
echo "  API docs:         http://127.0.0.1:${PORT}/api/manifest"
echo ""
echo "  Set WOP_AUTH_SECRET in .env for production JWT signing."
echo ""
echo "============================================"
echo ""

echo "==> Building app (tsc -b && vite build)..."
bun run build

echo "==> Starting Bun server..."
bun run server/index.ts &
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

echo "==> Open http://127.0.0.1:${PORT} in your browser (Electron disabled)"
echo "    Press Ctrl+C to stop the server."

wait "$SERVER_PID"
