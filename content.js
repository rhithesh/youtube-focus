// Feed Filter — content script.
// Finds video listings on YouTube, ships the text of each one to the service
// worker for a Jev verdict, and blacks out whatever comes back tagged.

(() => {
  const TILE_SELECTOR = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-playlist-video-renderer",
    "ytm-shorts-lockup-view-model",
    "ytd-reel-item-renderer",
    "yt-lockup-view-model",
  ].join(",");

  const verdicts = new Map(); // videoId -> verdict
  const inFlight = new Set(); // videoId
  const pending = new Map(); // videoId -> listing payload

  let settings = null;
  let flushTimer = null;
  let scanTimer = null;
  let blockedCount = 0;
  let dead = false; // true once the extension is reloaded/updated out from under this tab
  let observer = null;
  let intervalId = null;

  // After an extension reload, any chrome.runtime.* access here throws "Extension context invalidated".
  function alive() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  function die() {
    if (dead) return;
    dead = true;
    clearTimeout(scanTimer);
    clearTimeout(flushTimer);
    if (intervalId) clearInterval(intervalId);
    observer?.disconnect();
    // Nothing can toggle this tab's blur off any more, so don't leave it behind.
    resetAll();
  }

  function safeSend(msg, cb) {
    if (dead || !alive()) { die(); return; }
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        try {
          if (chrome.runtime.lastError || !res) { if (!alive()) die(); return; }
          cb(res);
        } catch {
          die();
        }
      });
    } catch {
      die();
    }
  }

  /* ------------------------------------------------------------ extraction */

  function parseVideoId(href) {
    if (!href) return null;
    let m = href.match(/[?&]v=([\w-]{11})/);
    if (m) return m[1];
    m = href.match(/\/shorts\/([\w-]{11})/);
    if (m) return m[1];
    return null;
  }

  function text(el) {
    if (!el) return "";
    return (el.getAttribute?.("title") || el.textContent || "").replace(/\s+/g, " ").trim();
  }

  function firstText(root, selectors) {
    for (const sel of selectors) {
      const t = text(root.querySelector(sel));
      if (t) return t;
    }
    return "";
  }

  function extract(el) {
    const link = el.querySelector(
      'a#thumbnail[href], a#video-title-link[href], a.yt-lockup-view-model__content-image[href], a[href^="/watch"], a[href^="/shorts/"]'
    );
    const href = link?.getAttribute("href");
    const id = parseVideoId(href);
    if (!id) return null;

    const title = firstText(el, [
      "#video-title",
      "a#video-title-link",
      "yt-formatted-string#video-title",
      "h3.yt-lockup-metadata-view-model__heading-reset",
      ".yt-lockup-metadata-view-model__title",
      ".shortsLockupViewModelHostMetadataTitle span",
      "h3 a span",
      "h3 span",
    ]);
    if (!title || title.length < 2) return null; // tile not hydrated yet — retry later

    const channel = firstText(el, [
      "ytd-channel-name a",
      "ytd-channel-name #text",
      "#channel-name a",
      ".yt-content-metadata-view-model__metadata-row:first-child span",
    ]);

    const duration = firstText(el, [
      "ytd-thumbnail-overlay-time-status-renderer #text",
      "ytd-thumbnail-overlay-time-status-renderer",
      ".badge-shape-wiz__text",
      "#time-status span",
    ]);

    const meta = [
      ...el.querySelectorAll(
        "#metadata-line span, .inline-metadata-item, .yt-content-metadata-view-model__metadata-text"
      ),
    ]
      .map((n) => text(n))
      .filter(Boolean)
      .slice(0, 4)
      .join(" · ");

    const isShort = /\/shorts\//.test(href || "") || /shorts|reel/i.test(el.tagName);

    return { id, title, channel, duration, meta, isShort, surface: surfaceOf(el, isShort) };
  }

  function surfaceOf(el, isShort) {
    if (isShort) return "shorts";
    if (el.closest("#related, ytd-watch-next-secondary-results-renderer, #secondary")) return "sidebar";
    const path = location.pathname;
    if (path.startsWith("/results")) return "search";
    if (path === "/" || path.startsWith("/feed")) return "home";
    if (path.startsWith("/watch")) return "sidebar";
    return "home";
  }

  function surfaceEnabled(surface) {
    return settings?.surfaces?.[surface] !== false;
  }

  /* --------------------------------------------------------------- masking */

  function clearBlock(el) {
    if (!el.classList.contains("ygf-host")) return;
    el.classList.remove("ygf-host");
    el.querySelector(":scope > .ygf-veil")?.remove();
  }

  // The options slider is a percentage; 100% is a 20px blur.
  function blurPx() {
    const pct = Number(settings?.blurStrength ?? 80);
    return Math.max(0, Math.round(pct * 0.2));
  }

  function applyBlock(el, verdict) {
    el.classList.add("ygf-host");

    let veil = el.querySelector(":scope > .ygf-veil");
    if (!veil) {
      veil = document.createElement("div");
      veil.className = "ygf-veil";
      el.appendChild(veil);
    }
    veil.style.setProperty("--ygf-blur", blurPx() + "px");
  }

  /* ---------------------------------------------------------------- scanning */

  function scan() {
    if (dead) return;
    if (!alive()) { die(); return; }
    if (!settings || !settings.enabled) return;

    let blocked = 0;
    for (const el of document.querySelectorAll(TILE_SELECTOR)) {
      // Take only the outermost tile — yt-lockup-view-model nests inside others.
      if (el.parentElement?.closest(TILE_SELECTOR)) continue;

      const info = extract(el);
      if (!info) continue;

      // YouTube recycles renderer nodes while scrolling; reset when the id changes.
      if (el.__ygfId !== info.id) {
        clearBlock(el);
        el.__ygfId = info.id;
      }

      if (!surfaceEnabled(info.surface)) {
        clearBlock(el);
        continue;
      }

      const verdict = verdicts.get(info.id);
      if (verdict) {
        if (verdict.tag) {
          applyBlock(el, verdict);
          blocked++;
        } else {
          clearBlock(el);
        }
        continue;
      }

      if (!inFlight.has(info.id) && !pending.has(info.id)) pending.set(info.id, info);
      if (settings.hideUntilChecked) applyBlock(el, { tag: null, why: "" });
    }

    blockedCount = blocked;
    if (pending.size) scheduleFlush();
  }

  function scheduleScan(delay = 250) {
    if (dead) return;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, delay);
  }

  function scheduleFlush() {
    if (dead || flushTimer) return;
    flushTimer = setTimeout(flush, 400);
  }

  function flush() {
    flushTimer = null;
    if (dead || !pending.size) return;

    const batch = [...pending.values()];
    pending.clear();
    batch.forEach((v) => inFlight.add(v.id));

    safeSend({ type: "judge", videos: batch }, (res) => {
      batch.forEach((v) => inFlight.delete(v.id));
      if (res.settings) settings = res.settings;
      for (const [id, v] of Object.entries(res.verdicts || {})) verdicts.set(id, v);
      scan();
    });
  }

  /* ----------------------------------------------------------------- boot */

  function resetAll() {
    verdicts.clear();
    pending.clear();
    inFlight.clear();
    for (const el of document.querySelectorAll(".ygf-host")) {
      clearBlock(el);
      el.__ygfId = null;
    }
  }

  function start() {
    observer = new MutationObserver(() => scheduleScan());
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Safety net for virtualised lists that mutate outside the observed subtree.
    intervalId = setInterval(scan, 1500);
    window.addEventListener("yt-navigate-finish", () => scheduleScan(120));
    document.addEventListener("scroll", () => scheduleScan(300), { passive: true });
    scan();
  }

  safeSend({ type: "settings" }, (s) => {
    settings = s || { enabled: false };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (dead || area !== "local" || !changes.settings) return;
      safeSend({ type: "settings" }, (s) => {
        settings = s;
        resetAll();
        scan();
      });
    });
  } catch {
    die();
  }

  try {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg?.type === "stats") {
        sendResponse({ blocked: blockedCount, judged: verdicts.size });
        return true;
      }
      return false;
    });
  } catch {
    die();
  }
})();
