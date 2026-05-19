#!/usr/bin/env bash
# Build electron/build/icon.icns from public/wayofwork-icon.png (macOS only — uses sips + iconutil).
# After generation, restart Electron; main process prefers icon.icns over PNG for app.dock.setIcon.
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
	echo "This script must run on macOS (requires sips and iconutil)." >&2
	exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SRC="$UI_ROOT/public/wayofwork-icon.png"
if [[ ! -f "$SRC" ]]; then
	echo "error: missing $SRC" >&2
	exit 1
fi
ICONSET="$SCRIPT_DIR/WayOfPi.iconset"
rm -rf "$ICONSET"
mkdir -p "$ICONSET"
for spec in \
	"16 icon_16x16.png" \
	"32 icon_16x16@2x.png" \
	"32 icon_32x32.png" \
	"64 icon_32x32@2x.png" \
	"128 icon_128x128.png" \
	"256 icon_128x128@2x.png" \
	"256 icon_256x256.png" \
	"512 icon_256x256@2x.png" \
	"512 icon_512x512.png" \
	"1024 icon_512x512@2x.png"; do
	set -- $spec
	sips -z "$1" "$1" "$SRC" --out "$ICONSET/$2" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$SCRIPT_DIR/icon.icns"
rm -rf "$ICONSET"
echo "Wrote $SCRIPT_DIR/icon.icns"
