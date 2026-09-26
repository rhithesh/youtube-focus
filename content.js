// Feed Filter — content script.
// Finds items in a YouTube, X or LinkedIn feed, ships the text of each one to the
// service worker for a Jev verdict, and blurs whatever comes back flagged.

(() => {
  /* ------------------------------------------------------------- helpers */

  function clean(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function text(el) {
    if (!el) return "";
    return clean(el.getAttribute?.("title") || el.textContent);
  }

  // Like textContent, but keeps emoji that sites render as <img alt="😂"> —
  // emoji spam is one of the stronger bait signals.
  function richText(el) {
    if (!el) return "";
    let out = "";
    const walk = (n) => {
      if (n.nodeType === Node.TEXT_NODE) out += n.nodeValue;
      else if (n.nodeName === "IMG") out += n.getAttribute("alt") || "";
      else if (n.nodeName === "BR") out += "\n";
      else for (const c of n.childNodes) walk(c);
    };
    walk(el);
    return out.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  function firstText(root, selectors, read = text) {
    for (const sel of selectors) {
      const t = read(root.querySelector(sel));
      if (t) return t;
    }
    return "";
  }

  const MAX_POST_CHARS = 700;
  const clip = (s) => (s.length > MAX_POST_CHARS ? s.slice(0, MAX_POST_CHARS) + "…" : s);

  /* ------------------------------------------------------------- sites */

  const youtube = {
    name: "youtube",
    selector: [
      "ytd-rich-item-renderer",
      "ytd-video-renderer",
      "ytd-compact-video-renderer",
      "ytd-grid-video-renderer",
      "ytd-playlist-video-renderer",
      "ytm-shorts-lockup-view-model",
      "ytd-reel-item-renderer",
      "yt-lockup-view-model",
    ].join(","),

    extract(el) {
      const link = el.querySelector(
        'a#thumbnail[href], a#video-title-link[href], a.yt-lockup-view-model__content-image[href], a[href^="/watch"], a[href^="/shorts/"]'
      );
      const href = link?.getAttribute("href") || "";
      const m = href.match(/[?&]v=([\w-]{11})/) || href.match(/\/shorts\/([\w-]{11})/);
      if (!m) return null;

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
      if (title.length < 2) return null; // not hydrated yet — retry on the next scan

      const isShort = /\/shorts\//.test(href) || /shorts|reel/i.test(el.tagName);
      return {
        id: m[1],
        platform: "youtube",
        title,
        author: firstText(el, [
          "ytd-channel-name a",
          "ytd-channel-name #text",
          "#channel-name a",
          ".yt-content-metadata-view-model__metadata-row:first-child span",
        ]),
        duration: firstText(el, [
          "ytd-thumbnail-overlay-time-status-renderer #text",
          "ytd-thumbnail-overlay-time-status-renderer",
          ".badge-shape-wiz__text",
          "#time-status span",
        ]),
        meta: [...el.querySelectorAll("#metadata-line span, .inline-metadata-item, .yt-content-metadata-view-model__metadata-text")]
          .map(text).filter(Boolean).slice(0, 4).join(" · "),
        isShort,
        surface: youtubeSurface(el, isShort),
      };
    },
  };

  function youtubeSurface(el, isShort) {
    if (isShort) return "shorts";
    if (el.closest("#related, ytd-watch-next-secondary-results-renderer, #secondary")) return "sidebar";
    const path = location.pathname;
    if (path.startsWith("/results")) return "search";
    if (path.startsWith("/watch")) return "sidebar";
    return "home";
  }

  const x = {
    name: "x",
    selector: 'article[data-testid="tweet"]',

    extract(el) {
      // The post's own permalink is the status link wrapping its timestamp.
      const stamp = [...el.querySelectorAll('a[href*="/status/"]')].find((a) => a.querySelector("time"));
      const m = stamp?.getAttribute("href")?.match(/\/status\/(\d+)/);
      if (!m) return null;

      const body = richText(el.querySelector('[data-testid="tweetText"]'));
      const card = text(el.querySelector('[data-testid="card.wrapper"]'));
      const content = body || card;
      if (!content) return null; // media-only post: nothing for a text model to judge

      const counts = el.querySelector('[role="group"][aria-label]')?.getAttribute("aria-label") || "";
      return {
        id: "x:" + m[1],
        platform: "x",
        title: clip(content),
        author: text(el.querySelector('[data-testid="User-Name"]')),
        meta: [text(el.querySelector('[data-testid="socialContext"]')), counts].filter(Boolean).join(" · "),
        surface: "x",
      };
    },
  };

  const linkedin = {
    name: "linkedin",
    selector: 'div.feed-shared-update-v2, div[data-urn^="urn:li:activity:"], div[data-id^="urn:li:activity:"]',

    extract(el) {
      const urn =
        el.getAttribute("data-urn") ||
        el.getAttribute("data-id") ||
        el.querySelector('[data-urn^="urn:li:activity:"]')?.getAttribute("data-urn");
      if (!urn) return null;

      const body = firstText(
        el,
        [".update-components-text", ".feed-shared-update-v2__description", ".feed-shared-inline-show-more-text", ".feed-shared-text"],
        richText
      ).replace(/…\s*(see )?more$/i, "");
      const article = text(el.querySelector(".update-components-article__title"));
      const content = body || article;
      if (!content) return null;

      return {
        id: "li:" + urn,
        platform: "linkedin",
        title: clip(content),
        author: firstText(el, [".update-components-actor__title", ".update-components-actor__name", ".feed-shared-actor__name"])
          .split(/ • | · /)[0],
        meta: [
          text(el.querySelector(".update-components-actor__description")),
          text(el.querySelector(".update-components-header__text-view")),
        ].filter(Boolean).join(" · "),
        surface: "linkedin",
      };
    },
  };

  function pickSite(host) {
    if (/(^|\.)youtube\.com$/.test(host)) return youtube;
    if (/(^|\.)(x|twitter)\.com$/.test(host)) return x;
    if (/(^|\.)linkedin\.com$/.test(host)) return linkedin;
    return youtube; // file:// test pages
  }

  const site = pickSite(location.hostname);

  /* --------------------------------------------------------------- state */

  const verdicts = new Map(); // item id -> verdict
  const inFlight = new Set(); // item id
  const pending = new Map(); // item id -> payload

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

  function surfaceEnabled(surface) {
    return settings?.surfaces?.[surface] !== false;
  }

  /* --------------------------------------------------------------- masking */

  function clearBlock(el) {
    if (!el.classList.contains("ygf-host")) return;
    el.classList.remove("ygf-host", "ygf-host--" + site.name);
    el.querySelector(":scope > .ygf-veil")?.remove();
  }

  // The options slider is a percentage; 100% is a 20px blur.
  function blurPx() {
    const pct = Number(settings?.blurStrength ?? 80);
    return Math.max(0, Math.round(pct * 0.2));
  }

  function applyBlock(el) {
    el.classList.add("ygf-host", "ygf-host--" + site.name);

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
    for (const el of document.querySelectorAll(site.selector)) {
      // Take only the outermost item — several of these selectors nest.
      if (el.parentElement?.closest(site.selector)) continue;

      const info = site.extract(el);
      if (!info) continue;

      // Feeds recycle nodes while scrolling; reset when the item changes.
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
          applyBlock(el);
          blocked++;
        } else {
          clearBlock(el);
        }
        continue;
      }

      if (!inFlight.has(info.id) && !pending.has(info.id)) pending.set(info.id, info);
      if (settings.hideUntilChecked) applyBlock(el);
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
