#!/usr/bin/env bash
set -euo pipefail

PORT="${WOP_SERVER_PORT:-3333}"

echo "==> Stopping Way of Work (Electron Mode)..."

# 1. Kill anything on the server port
if command -v fuser >/dev/null 2>&1; then
	fuser -k "$PORT/tcp" 2>/dev/null || true
fi

# 2. Kill Bun server processes
BUN_PIDS=$(pgrep -f "server/index.ts" 2>/dev/null || true)
if [ -n "$BUN_PIDS" ]; then
	echo "==> Stopping Bun server processes..."
	kill $BUN_PIDS 2>/dev/null || true
	sleep 0.5
	kill -9 $BUN_PIDS 2>/dev/null || true
fi

# 3. Kill Electron
ELECTRON_PIDS=$(pgrep -f "electron" 2>/dev/null || true)
if [ -n "$ELECTRON_PIDS" ]; then
	echo "==> Stopping Electron..."
	kill $ELECTRON_PIDS 2>/dev/null || true
fi

echo "==> System stopped."
