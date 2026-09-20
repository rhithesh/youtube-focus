#!/usr/bin/env bash
# Drives the real content.js against fake YouTube tiles in headless Chrome.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

[ -x "$CHROME" ] || { echo "Chrome not found at: $CHROME (set CHROME=...)"; exit 2; }

"$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=12000 \
  --dump-dom "file://$HERE/dom.html" 2>/dev/null \
| python3 -c '
import sys, re, html
m = re.search(r"<pre id=\"results\">(.*?)</pre>", sys.stdin.read(), re.S)
if not m:
    print("NO RESULTS BLOCK — the harness did not finish"); sys.exit(1)
out = html.unescape(m.group(1)).strip()
print(out)
sys.exit(1 if "FAILED" in out else 0)
'
