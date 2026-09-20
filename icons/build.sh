#!/usr/bin/env bash
# Rasterises icon.svg into the PNG sizes the manifest needs.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "Chrome not found at: $CHROME (set CHROME=...)"; exit 2; }

for S in 16 32 48 128; do
  # 16px gets a chunkier variant: a 1px curved stroke antialiases to pale blue
  # and the ring all but disappears at that size.
  SRC="icon.svg"; [ "$S" = "16" ] && SRC="icon-small.svg"
  cat > "/tmp/ygf-icon-$S.html" <<HTML
<!DOCTYPE html><html><head><style>
  html,body{margin:0;padding:0;background:transparent}
  img{display:block;width:${S}px;height:${S}px}
</style></head><body><img src="file://$HERE/$SRC"></body></html>
HTML
  "$CHROME" --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --default-background-color=00000000 --force-device-scale-factor=1 \
    --window-size="$S,$S" --screenshot="$HERE/icon$S.png" \
    "file:///tmp/ygf-icon-$S.html" 2>/dev/null
  rm -f "/tmp/ygf-icon-$S.html"
  echo "icon$S.png  $(sips -g pixelWidth -g pixelHeight "$HERE/icon$S.png" 2>/dev/null | tail -2 | tr -d ' \n')"
done
