#!/usr/bin/env bash
set -euo pipefail

PORT="${WOP_SERVER_PORT:-3333}"

echo "==> Stopping Way of Work on port $PORT..."

# 1. Kill anything on the server port (most effective)
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

# 3. Kill Vite (dev server)
VITE_PIDS=$(pgrep -f "vite" 2>/dev/null || true)
if [ -n "$VITE_PIDS" ]; then
	echo "==> Stopping Vite..."
	kill $VITE_PIDS 2>/dev/null || true
fi

# 4. Kill Concurrently (dev orchestrator)
CONC_PIDS=$(pgrep -f "concurrently" 2>/dev/null || true)
if [ -n "$CONC_PIDS" ]; then
	echo "==> Stopping Concurrently..."
	kill $CONC_PIDS 2>/dev/null || true
fi

# 5. Kill Electron
ELECTRON_PIDS=$(pgrep -f "electron" 2>/dev/null || true)
if [ -n "$ELECTRON_PIDS" ]; then
	echo "==> Stopping Electron..."
	kill $ELECTRON_PIDS 2>/dev/null || true
fi

# 6. Kill Ngrok (tunnels)
NGROK_PIDS=$(pgrep -f "ngrok" 2>/dev/null || true)
if [ -n "$NGROK_PIDS" ]; then
	echo "==> Stopping Ngrok..."
	kill $NGROK_PIDS 2>/dev/null || true
fi

echo "==> System stopped."
