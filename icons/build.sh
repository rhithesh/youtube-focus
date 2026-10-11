#!/usr/bin/env bash
# Rasterises icon.svg into the PNG sizes the manifest needs.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "Chrome not found at: $CHROME (set CHROME=...)"; exit 2; }

# "store" is the Chrome Web Store listing icon: 128px with 96px artwork and padding.
for S in 16 32 48 128 store; do
  # 16px gets a pixel-aligned variant so the three bars stay crisp at that size.
  SRC="icon.svg"; OUT="icon$S.png"
  [ "$S" = "16" ] && SRC="icon-small.svg"
  [ "$S" = "store" ] && { SRC="store-icon.svg"; OUT="store-icon128.png"; S=128; }
  cat > "/tmp/ygf-icon-$S.html" <<HTML
<!DOCTYPE html><html><head><style>
  html,body{margin:0;padding:0;background:transparent}
  img{display:block;width:${S}px;height:${S}px}
</style></head><body><img src="file://$HERE/$SRC"></body></html>
HTML
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --default-background-color=00000000 --force-device-scale-factor=1 \
    --window-size="$S,$S" --screenshot="$HERE/$OUT" \
    "file:///tmp/ygf-icon-$S.html" 2>/dev/null
  rm -f "/tmp/ygf-icon-$S.html"
  echo "$OUT  $(sips -g pixelWidth -g pixelHeight "$HERE/$OUT" 2>/dev/null | tail -2 | tr -d ' \n')"
done
