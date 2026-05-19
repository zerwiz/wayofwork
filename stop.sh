#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "==> Stopping Way of Work..."

# Kill Bun server process
BUN_PID=$(pgrep -f "bun run server/index.ts" 2>/dev/null || true)
if [ -n "$BUN_PID" ]; then
	echo "==> Stopping Bun server (PID $BUN_PID)..."
	kill "$BUN_PID" 2>/dev/null || true
fi

# Kill Electron processes for this app
ELECTRON_PIDS=$(pgrep -f "electron ." 2>/dev/null || true)
if [ -n "$ELECTRON_PIDS" ]; then
	echo "==> Stopping Electron..."
	kill $ELECTRON_PIDS 2>/dev/null || true
fi

echo "==> Done."
