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
    // Nothing can toggle this tab's blur off any more, so don't leave it (or the switch) behind.
    resetAll();
    pill.remove();
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

  /* --------------------------------------------------------- on-page switch */

  // A small draggable pill so the filter can be flipped without opening the popup.
  // It lives in a shadow root so the host page's CSS can't touch it (and vice versa).
  const pill = (() => {
    const MARGIN = 16;
    let host = null;
    let els = null;
    let pos = { fx: 0, fy: 1 }; // 0..1 across the free space; default bottom-left
    let posLoaded = false;

    const CSS = `
      :host { all: initial; position: fixed; left: 0; top: 0; z-index: 2147483646; }
      .pill {
        display: flex; align-items: center; gap: 9px;
        padding: 5px 12px 5px 5px;
        background: #16150f; color: #f3f0e8;
        border-radius: 999px;
        font: 500 13px/1 "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        letter-spacing: 0;
        box-shadow: 0 10px 30px -10px rgba(0,0,0,.5), 0 0 0 1px rgba(243,240,232,.1);
        cursor: grab; user-select: none; -webkit-user-select: none; touch-action: none;
        transition: opacity .2s, transform .2s;
      }
      .pill.off { opacity: .82; }
      .pill:hover { opacity: 1; }
      .pill.dragging { cursor: grabbing; transform: scale(1.04); }
      .logo { display: block; width: 26px; height: 26px; flex: none; }
      .label { white-space: nowrap; min-width: 58px; }
      .count {
        padding: 3px 7px; border-radius: 999px;
        background: rgba(243,240,232,.12); color: #c9f25d;
        font-variant-numeric: tabular-nums;
      }
      .count[hidden] { display: none; }
      button {
        all: unset; position: relative; flex: none;
        width: 34px; height: 20px; border-radius: 999px;
        background: rgba(243,240,232,.22); cursor: pointer;
        transition: background .2s;
      }
      button::after {
        content: ""; position: absolute; top: 3px; left: 3px;
        width: 14px; height: 14px; border-radius: 50%;
        background: #f3f0e8; transition: transform .25s cubic-bezier(.3,1.4,.5,1), background .2s;
      }
      button[aria-checked="true"] { background: #c9f25d; }
      button[aria-checked="true"]::after { transform: translateX(14px); background: #16150f; }
      button:focus-visible { outline: 2px solid #c9f25d; outline-offset: 2px; }
    `;

    const LOGO = `<svg class="logo" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="12" fill="#2a2920"/>
      <rect x="6" y="6.5" width="12" height="2.4" rx="1.2" fill="#c9f25d"/>
      <rect x="6" y="10.8" width="12" height="2.4" rx="1.2" fill="#f3f0e8" opacity=".3"/>
      <rect x="6" y="15.1" width="8" height="2.4" rx="1.2" fill="#c9f25d"/></svg>`;

    function build() {
      host = document.createElement("div");
      host.setAttribute("data-ygf-pill", "");
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `<style>${CSS}</style>
        <div class="pill" title="Feed Filter · drag to move">
          ${LOGO}
          <button role="switch" aria-label="Feed Filter"></button>
          <span class="label"></span>
          <span class="count" hidden></span>
        </div>`;
      els = {
        pill: root.querySelector(".pill"),
        label: root.querySelector(".label"),
        count: root.querySelector(".count"),
        button: root.querySelector("button"),
      };

      let drag = null;
      let justDragged = false;

      // Move/up are tracked on the window: the pointer leaves a 36px pill almost at once.
      const move = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 4) return;
        if (!drag.moved) {
          drag.moved = true;
          els.pill.classList.add("dragging");
        }
        e.preventDefault();
        const { w, h } = free();
        pos = {
          fx: w > 0 ? clamp01((e.clientX - drag.dx - MARGIN) / w) : 0,
          fy: h > 0 ? clamp01((e.clientY - drag.dy - MARGIN) / h) : 1,
        };
        place();
      };
      const end = (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", end, true);
        window.removeEventListener("pointercancel", end, true);
        if (drag.moved) {
          els.pill.classList.remove("dragging");
          // A drag that ends over the switch must not also flip it; the click fires right after pointerup.
          justDragged = true;
          setTimeout(() => { justDragged = false; }, 0);
          try { chrome.storage.local.set({ pillPos: pos }); } catch { if (!alive()) die(); }
        }
        drag = null;
      };
      els.pill.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        const r = host.getBoundingClientRect();
        drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
        window.addEventListener("pointermove", move, true);
        window.addEventListener("pointerup", end, true);
        window.addEventListener("pointercancel", end, true);
      });

      els.button.addEventListener("click", () => {
        if (!justDragged) setEnabled(!settings?.enabled);
      });
      window.addEventListener("resize", place);
    }

    const clamp01 = (n) => Math.min(1, Math.max(0, n));

    function free() {
      const r = host.getBoundingClientRect();
      return { w: innerWidth - r.width - 2 * MARGIN, h: innerHeight - r.height - 2 * MARGIN };
    }

    function place() {
      if (!host?.isConnected) return;
      const { w, h } = free();
      host.style.transform = `translate(${Math.round(MARGIN + pos.fx * Math.max(0, w))}px, ${Math.round(MARGIN + pos.fy * Math.max(0, h))}px)`;
    }

    function loadPos() {
      if (posLoaded) return;
      posLoaded = true;
      try {
        chrome.storage.local.get("pillPos", (r) => {
          try {
            if (chrome.runtime.lastError) return;
            if (r?.pillPos) pos = { fx: clamp01(+r.pillPos.fx || 0), fy: clamp01(+r.pillPos.fy || 0) };
            place();
          } catch { if (!alive()) die(); }
        });
      } catch { if (!alive()) die(); }
    }

    function render() {
      const want = !dead && settings && settings.showPagePill !== false && !document.fullscreenElement;
      if (!want) { host?.remove(); return; }
      if (!document.body) return;
      if (!host) build();
      if (!host.isConnected) {
        document.body.appendChild(host);
        loadPos();
        place();
      }
      const on = !!settings.enabled;
      els.pill.classList.toggle("off", !on);
      els.button.setAttribute("aria-checked", String(on));
      els.label.textContent = on ? "Filter on" : "Filter off";
      els.count.hidden = !on || !blockedCount;
      els.count.textContent = blockedCount + " blurred";
    }

    return { render, remove: () => host?.remove() };
  })();

  // Same single write the popup does: everything else reacts to storage.onChanged.
  function setEnabled(on) {
    if (dead || !alive()) { die(); return; }
    settings = { ...settings, enabled: on };
    if (!on) {
      resetAll();
      blockedCount = 0;
    }
    pill.render();
    try {
      chrome.storage.local.get("settings", (r) => {
        try {
          if (chrome.runtime.lastError) return;
          chrome.storage.local.set({ settings: { ...(r?.settings || {}), enabled: on } });
        } catch { if (!alive()) die(); }
      });
    } catch { if (!alive()) die(); }
  }

  /* ---------------------------------------------------------------- scanning */

  function scan() {
    if (dead) return;
    if (!alive()) { die(); return; }
    if (!settings || !settings.enabled) {
      blockedCount = 0;
      pill.render();
      return;
    }

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

      let verdict = verdicts.get(info.id);
      // A keyword-rule stand-in (the model was rate-limited or unreachable): ask again once it may be back.
      if (verdict?.provisional && Date.now() >= (verdict.retryAt || 0)) {
        verdicts.delete(info.id);
        verdict = null;
      }
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
    pill.render();
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
    document.addEventListener("fullscreenchange", () => pill.render());
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
