#!/usr/bin/env bash
# Screenshots the extension's real popup and options pages (at 2x) for the store art.
# chrome.* is stubbed with sample settings, so this runs outside the extension.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/video/public/store"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"
mkdir -p "$OUT"

cat > "$TMP/stub.js" <<'JS'
{ // block scope: popup.js and options.js declare their own top-level `settings`
const GOALS = "Crack Google interviews: LeetCode, system design, programming and real tech news. No drama, reaction videos or hustle content.";
const settings = {
  enabled: true, provider: "openrouter", apiKey: "", model: "jev-latest", goals: GOALS, onboarded: true,
  surfaces: { home: true, search: true, sidebar: true, shorts: true, x: true, linkedin: true },
  baitThreshold: 2.0, offGoalThreshold: 2.6, junkThreshold: 0.85, minConfidence: 0.5,
  hideUntilChecked: false, blurStrength: 80, fallbackHeuristics: true, freeTier: true, showPagePill: true,
};
const store = { settings, freeUsage: { limit: 300, remaining: 214, at: Date.now() } };
const pick = (k) => k == null ? { ...store } : Object.fromEntries([].concat(k).map((x) => [x, store[x]]));
Object.defineProperty(window, "chrome", { configurable: true, writable: true, value: {
  storage: { local: { get: async (k) => pick(k), set: async () => {}, remove: async () => {} }, onChanged: { addListener() {} } },
  runtime: { sendMessage: async (m) => (m.type === "settings" ? settings : { ok: true }), openOptionsPage() {}, lastError: null },
  tabs: { query: async () => [{ id: 1 }], sendMessage: (_id, _m, cb) => cb({ blocked: 14, judged: 31 }) },
} });
}
JS

shot() { # page width height out
  sed -e "s#<script src=\"$1.js\"></script>#<script src=\"file://$TMP/stub.js\"></script><script src=\"file://$ROOT/$1.js\"></script>#" \
      -e "s#href=\"options.css\"#href=\"file://$ROOT/options.css\"#" "$ROOT/$1.html" > "$TMP/$1.html"
  "$CHROME" --headless --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=2 \
    --window-size="$2,$3" --virtual-time-budget=5000 --screenshot="$OUT/$4" "file://$TMP/$1.html" 2>/dev/null
  echo "$4"
}
shot popup 318 400 popup.png
shot options 900 1400 options.png
[ -n "${KEEP:-}" ] && echo "kept $TMP" || rm -rf "$TMP"
