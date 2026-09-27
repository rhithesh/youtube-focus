// Feed Filter — service worker.
// Batches feed items (YouTube videos, X posts, LinkedIn posts) into a single
// TypeSafe System One (Jev) call and turns the typed answers into block/allow verdicts.

const ENDPOINTS = {
  openrouter: "https://openrouter.ai/api/v1/systemone",
  typesafe: "https://api.typesafe.ai/v1/systemone",
};

// No key? The same request goes to Feed Filter's rate-limited free tier instead,
// which forwards it to Jev with the project's own key. (Also listed in host_permissions.)
const FREE_ENDPOINT = "https://feed-filter-two.vercel.app/api/jev";

const DEFAULT_SETTINGS = {
  enabled: true,
  provider: "openrouter",
  apiKey: "",
  model: "jev-latest",
  goals: "",
  onboarded: false,
  surfaces: { home: true, search: true, sidebar: true, shorts: true, x: true, linkedin: true },
  baitThreshold: 2.0,
  offGoalThreshold: 2.6,
  junkThreshold: 0.85, // clickbait reads 0.45-0.75 on this question; real scams read 0.9+
  minConfidence: 0.5,
  hideUntilChecked: false,
  blurStrength: 80, // percent; 100% renders as a 20px blur
  fallbackHeuristics: true,
  freeTier: true, // use the free tier when no key is set
  showPagePill: true, // the on/off switch floating on YouTube, X and LinkedIn
};

// Jev evaluates every question against the state in one parallel pass, so a whole
// feed page fits in one request. 20 items = 60 questions, ~5k input tokens.
const BATCH_SIZE = 20;
const MAX_PARALLEL = 3;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 6000;

const BAIT_LEVELS = [
  "Plain and accurate. It says what it actually contains — no exaggeration, nothing withheld, no emotional hook.",
  "Mildly promotional. Slightly punchy or curiosity-driven phrasing, but it still describes the real content honestly.",
  "Clear bait. Manufactured curiosity or outrage: withheld payoff, shock claims, ALL-CAPS or emoji spam, fake urgency, inflated stakes, misleading superlatives, '#1 thing nobody tells you', one-line-per-sentence 'broetry' built to force a 'see more' click, or a closing 'Agree?' / 'Thoughts?' that exists to farm comments.",
  "Pure engagement bait. It exists only to force a click or reaction and almost certainly misrepresents itself: 'you won't believe', invented drama, fabricated stories or numbers, rage-bait, fake reveals, 'comment YES and I'll DM you', 'repost if you agree'.",
];

const GOAL_LEVELS = [
  "Directly advances the stated goals. Substantive content someone pursuing these goals would deliberately seek out.",
  "Useful and adjacent. Clearly related to the goals and plausibly worth the time, though not core to them.",
  "Tangential. Same broad subject area, but mostly commentary, news-of-the-week or entertainment rather than substance.",
  "Unrelated distraction. Nothing to do with the stated goals — pure entertainment, drama, or time-filler.",
];

const JUNK_TRUE =
  "Spam, a scam, or mass-produced filler: crypto and get-rich-quick pitches, fake giveaways, engagement farming, generic AI-written filler, stolen or re-uploaded content, misleading medical or financial claims, or an account pumping out near-identical posts or videos.";
const JUNK_FALSE =
  "A genuine post or video from a real person or channel, whatever its quality or subject.";

const PLATFORM = { youtube: "YouTube", x: "X (Twitter)", linkedin: "LinkedIn" };

/* ---------------------------------------------------------------- settings */

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  s.surfaces = { ...DEFAULT_SETTINGS.surfaces, ...(settings?.surfaces || {}) };
  return s;
}

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// Every cached verdict is stamped with the goals + thresholds it was judged under,
// so editing either one invalidates the cache instead of serving stale blocks.
// Bump when the question wording changes so verdicts from the old wording are re-judged.
const RUBRIC_VERSION = 2;

function rubricStamp(s) {
  return hash32(
    [RUBRIC_VERSION, s.goals, s.model, s.baitThreshold, s.offGoalThreshold, s.junkThreshold, s.minConfidence].join("|")
  );
}

/* ------------------------------------------------------------------- cache */

async function readCache(ids, stamp) {
  const keys = ids.map((id) => "v:" + id);
  const got = await chrome.storage.local.get(keys);
  const hits = {};
  const now = Date.now();
  for (const id of ids) {
    const e = got["v:" + id];
    if (e && e.s === stamp && now - e.t < CACHE_TTL_MS) hits[id] = e.d;
  }
  return hits;
}

async function writeCache(verdicts, stamp) {
  const patch = {};
  const t = Date.now();
  for (const [id, d] of Object.entries(verdicts)) patch["v:" + id] = { d, s: stamp, t };
  await chrome.storage.local.set(patch);
  maybePrune();
}

let pruning = false;
async function maybePrune() {
  if (pruning) return;
  pruning = true;
  try {
    const all = await chrome.storage.local.get(null);
    const entries = Object.entries(all).filter(([k]) => k.startsWith("v:"));
    if (entries.length <= CACHE_LIMIT) return;
    entries.sort((a, b) => (a[1]?.t || 0) - (b[1]?.t || 0));
    const drop = entries.slice(0, entries.length - Math.floor(CACHE_LIMIT * 0.8)).map(([k]) => k);
    await chrome.storage.local.remove(drop);
  } catch {
    /* pruning is best-effort */
  } finally {
    pruning = false;
  }
}

/* ------------------------------------------------------------ jev requests */

function describe(v) {
  if (v.platform === "x" || v.platform === "linkedin") {
    return {
      platform: PLATFORM[v.platform],
      format: "feed post",
      text: v.title,
      author: v.author || "unknown",
      metadata: v.meta || "",
    };
  }
  return {
    platform: PLATFORM.youtube,
    format: v.isShort ? "YouTube Short (vertical, under 60s)" : "regular video",
    title: v.title,
    channel: v.author || v.channel || "unknown",
    duration: v.duration || "unknown",
    metadata: v.meta || "",
  };
}

function buildRequest(videos, s) {
  const state = {
    my_goals: s.goals?.trim() || "(the viewer has not stated any goals)",
    items: {},
  };
  const questions = {};

  videos.forEach((v, i) => {
    const k = "v" + i;
    state.items[k] = describe(v);

    questions[k + "_bait"] = {
      type: "score",
      instructions: {
        item: "items." + k,
        question:
          "Rate how much the feed item at `items." + k +
          "` relies on clickbait or engagement bait. Judge it exactly as someone scrolling past sees it, before they click or expand it.",
      },
      criteria: BAIT_LEVELS,
    };

    questions[k + "_goal"] = {
      type: "score",
      instructions: {
        item: "items." + k,
        question:
          "The viewer's own goals are in `my_goals`. Rate how far the feed item at `items." + k +
          "` sits from those goals. Judge the subject matter, not the production quality.",
      },
      criteria: GOAL_LEVELS,
    };

    questions[k + "_junk"] = {
      type: "noul",
      instructions: {
        item: "items." + k,
        question: "The feed item at `items." + k + "` is spam, a scam, or mass-produced low-effort filler.",
      },
      criteria: { true: JUNK_TRUE, false: JUNK_FALSE },
    };
  });

  return { model: s.model, state, questions };
}

class FreeTierError extends Error {
  constructor(message, retryAfterSec) {
    super(message);
    this.retryAfterSec = retryAfterSec;
  }
}

async function installId() {
  const { installId } = await chrome.storage.local.get("installId");
  if (installId) return installId;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ installId: id });
  return id;
}

// The free tier's own limits are final: no retrying a 429 from it, just back off until it resets.
async function callFree(body) {
  let res;
  try {
    res = await fetch(FREE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Feed-Filter-Install": await installId() },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new FreeTierError("Free tier unreachable: " + (e.message || e), 60);
  }

  const retryAfter = Number(res.headers.get("retry-after")) || 60;
  if (res.status === 429) {
    const info = await res.json().catch(() => ({}));
    const msg = info.scope === "burst"
      ? "Free tier: too many requests, slowing down for a minute."
      : "Free tier: today's limit is used up. Keyword rules until it resets; add your own key for unlimited.";
    throw new FreeTierError(msg, retryAfter);
  }
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    const msg = info.error === "free-tier-off" ? "The free tier is switched off right now. Add your own key to keep using Jev." : "Free tier error " + res.status + ".";
    throw new FreeTierError(msg, res.status === 503 ? retryAfter : 60);
  }

  const limit = Number(res.headers.get("x-ratelimit-limit"));
  const remaining = Number(res.headers.get("x-ratelimit-remaining"));
  if (Number.isFinite(limit) && Number.isFinite(remaining)) {
    await chrome.storage.local.set({ freeUsage: { limit, remaining, at: Date.now() } });
  }
  return res.json();
}

async function callJev(body, s, attempt = 0) {
  if (!s.apiKey) return callFree(body);
  const url = ENDPOINTS[s.provider] || ENDPOINTS.openrouter;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + s.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("Network error reaching " + url + ": " + (e.message || e));
  }

  // 429 / 529 are the documented backoff cases.
  if ((res.status === 429 || res.status === 529) && attempt < 2) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, waitMs));
    return callJev(body, s, attempt + 1);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("401 — API key rejected. Check the key and provider in options.");
    if (res.status === 422) throw new Error("422 — request rejected: " + text.slice(0, 300));
    throw new Error(res.status + " — " + (text.slice(0, 300) || res.statusText));
  }

  return res.json();
}

function verdictFrom(answers, k, s, source) {
  const bait = answers[k + "_bait"] || {};
  const goal = answers[k + "_goal"] || {};
  const junk = answers[k + "_junk"] || {};

  const b = Number(bait.score ?? 0);
  const bc = Number(bait.confidence ?? 0);
  const g = Number(goal.score ?? 0);
  const gc = Number(goal.confidence ?? 0);
  const j = Number(junk.noul ?? 0);

  // conf is the confidence of whichever signal decides, not a blend of both —
  // otherwise a tile can show a number below the gate it actually passed.
  // Nouls carry no confidence field, so a SPAM verdict reports null.
  const scores = {
    bait: round2(b), goal: round2(g), junk: round2(j),
    baitConf: round2(bc), goalConf: round2(gc), conf: round2(Math.min(bc, gc)),
  };

  // Confidence-gated: a high score the model isn't sure about does not block.
  if (j >= s.junkThreshold)
    return { tag: "SPAM", why: "spam " + pct(j), scores: { ...scores, conf: null }, source };
  if (b >= s.baitThreshold && bc >= s.minConfidence)
    return { tag: "CLICK-BAIT", why: "bait " + scores.bait + "/3 · " + pct(bc) + " conf", scores: { ...scores, conf: round2(bc) }, source };
  if (s.goals?.trim() && g >= s.offGoalThreshold && gc >= s.minConfidence)
    return { tag: "OFF-GOAL", why: "off-goal " + scores.goal + "/3 · " + pct(gc) + " conf", scores: { ...scores, conf: round2(gc) }, source };

  return { tag: null, why: "", scores, source };
}

const round2 = (n) => Math.round(n * 100) / 100;
const pct = (n) => Math.round(n * 100) + "%";

/* ------------------------------------------------------- heuristic fallback */

const BAIT_PATTERNS = [
  /you won'?t believe/i, /gone (wrong|sexual)/i, /\bshocking\b/i, /\bexposed\b/i,
  /this changes everything/i, /\bis (officially )?(dead|over|finished)\b/i,
  /nobody (is )?talk(ing|s) about/i, /they don'?t want you to/i, /\bthe truth about\b/i,
  /\bsecret[s]?\b/i, /\binsane\b/i, /\bcrazy\b/i, /\b(i|we) tried\b.*\bfor \d+ days\b/i,
  /\$\d+[km]?\b.{0,24}\bin \d+ (day|hour|minute|week)/i, /!{2,}/, /\?{2,}/,
  /\b(must|need to) (watch|see)\b/i, /\bdon'?t (do|buy|watch|make) (this|these)\b/i,
];
// Post-style bait on X and LinkedIn.
const POST_BAIT_PATTERNS = [
  /\b(agree|thoughts)\?\s*$/i, /\bcomment ["'“]?\w+["'”]? (below|and i[’']?ll)/i, /\brepost if\b/i,
  /\bfollow (me )?for more\b/i, /\bhere[’']?s what happened( next)?\b/i, /\b(99|90)% of (people|developers|founders)\b/i,
  /\bwill blow your mind\b/i, /\bdestroy(ed|s)\b/i,
];
const JUNK_PATTERNS = [
  /\bfree (robux|v-?bucks|giveaway|crypto|bitcoin)\b/i, /\bairdrop\b/i,
  /\bmake \$?\d+ *(a|per) (day|week|month)\b/i, /\bpassive income\b/i,
  /\b(elon|musk)\b.*\b(giveaway|bitcoin|btc)\b/i, /\bcure[sd]? (cancer|diabetes)\b/i,
];

function heuristicVerdict(v, s) {
  const title = v.title || "";
  const letters = title.replace(/[^A-Za-z]/g, "");
  const caps = letters ? (title.match(/[A-Z]/g) || []).length / letters.length : 0;
  const emoji = Array.from(title).filter((c) => c.codePointAt(0) > 0x2100).length;

  let bait = 0;
  bait += Math.min(2, [...BAIT_PATTERNS, ...POST_BAIT_PATTERNS].filter((r) => r.test(title)).length);
  if (caps > 0.6 && letters.length > 8 && letters.length < 200) bait += 1;
  if (emoji >= 2) bait += 1;
  bait = Math.min(3, bait);

  const junk = JUNK_PATTERNS.some((r) => r.test(title)) ? 0.9 : 0.05;
  const scores = { bait: round2(bait), goal: 0, junk, baitConf: null, goalConf: null, conf: null };

  if (junk >= s.junkThreshold) return { tag: "SPAM", why: "keyword match", scores, source: "heuristic" };
  if (bait >= s.baitThreshold) return { tag: "CLICK-BAIT", why: "keyword match", scores, source: "heuristic" };
  return { tag: null, why: "", scores, source: "heuristic" };
}

/* ----------------------------------------------------------------- judging */

async function handleJudge(videos) {
  const s = await getSettings();
  if (!s.enabled) return { verdicts: {}, settings: s };

  const stamp = rubricStamp(s);
  const ids = videos.map((v) => v.id);
  const cached = await readCache(ids, stamp);
  const todo = videos.filter((v) => !(v.id in cached));

  if (!todo.length) return { verdicts: cached, settings: s };

  // Keyword rules stand in whenever the model can't be used. Those verdicts aren't cached
  // and, when a model is available at all, carry a retryAt so the tab asks again later.
  const modelAvailable = !!s.apiKey || s.freeTier;
  const heuristicsFor = (items, extra = {}, retryAt = Date.now() + 60_000) => {
    const out = { ...cached, ...extra };
    if (!s.fallbackHeuristics) return out;
    for (const v of items) {
      if (v.id in out) continue;
      out[v.id] = modelAvailable ? { ...heuristicVerdict(v, s), provisional: true, retryAt } : heuristicVerdict(v, s);
    }
    return out;
  };

  if (!s.apiKey) {
    if (!s.freeTier) return { verdicts: heuristicsFor(todo), settings: s, degraded: "no-key" };
    const { freePausedUntil } = await chrome.storage.local.get("freePausedUntil");
    if (freePausedUntil && Date.now() < freePausedUntil)
      return { verdicts: heuristicsFor(todo, {}, freePausedUntil), settings: s, degraded: "free-paused" };
  }

  const chunks = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) chunks.push(todo.slice(i, i + BATCH_SIZE));

  const fresh = {};
  let error = null;
  let retryAt = Date.now() + 60_000;

  for (let i = 0; i < chunks.length; i += MAX_PARALLEL) {
    const slice = chunks.slice(i, i + MAX_PARALLEL);
    const results = await Promise.allSettled(
      slice.map(async (chunk) => {
        const data = await callJev(buildRequest(chunk, s), s);
        const answers = data.answers || {};
        chunk.forEach((v, idx) => {
          fresh[v.id] = verdictFrom(answers, "v" + idx, s, data.model || s.model);
        });
      })
    );
    for (const r of results) {
      if (r.status !== "rejected") continue;
      error = String(r.reason?.message || r.reason);
      if (r.reason instanceof FreeTierError) {
        retryAt = Date.now() + r.reason.retryAfterSec * 1000;
        await chrome.storage.local.set({ freePausedUntil: retryAt });
      }
    }
  }

  if (Object.keys(fresh).length) await writeCache(fresh, stamp);
  if (error) await chrome.storage.local.set({ lastError: { msg: error, at: Date.now() } });
  else await chrome.storage.local.remove("lastError");

  return { verdicts: heuristicsFor(todo, fresh, retryAt), settings: s, error };
}

/* -------------------------------------------------------------- test call */

async function handleTest(goals) {
  const s = await getSettings();
  if (goals !== undefined) s.goals = goals;
  if (!s.apiKey && !s.freeTier) return { ok: false, error: "No API key set, and the free tier is switched off." };

  const samples = [
    { id: "t0", platform: "youtube", title: "You WON'T BELIEVE what happened next 😱😱 (GONE WRONG)", author: "DramaDaily", duration: "18:02", meta: "2.1M views · 3 days ago" },
    { id: "t1", platform: "youtube", title: "Rust's ownership model explained with memory diagrams", author: "Systems Weekly", duration: "41:15", meta: "84K views · 1 month ago" },
    { id: "t2", platform: "youtube", title: "Make $5,000 a day with this FREE crypto airdrop bot", author: "Wealth Signals", duration: "6:44", meta: "12K views · 2 days ago" },
    { id: "t3", platform: "x", title: "99% of developers don't know these 7 VS Code tricks.\n\nThe 4th one will blow your mind 🤯🧵", author: "Dev Tips Daily @devtipsdaily · 3h", meta: "" },
    { id: "t4", platform: "linkedin", title: "I fired my best employee.\n\nHe was talented.\n\nBut he taught me something.\n\nHere's what happened next 👇\n\nAgree?", author: "Growth Coach", meta: "Helping founders 10x their mindset" },
  ];

  const t0 = Date.now();
  try {
    const data = await callJev(buildRequest(samples, s), s);
    const answers = data.answers || {};
    return {
      ok: true,
      ms: Date.now() - t0,
      model: data.model,
      usage: data.usage,
      rows: samples.map((v, i) => ({ title: v.title, ...verdictFrom(answers, "v" + i, s, data.model) })),
    };
  } catch (e) {
    return { ok: false, error: String(e.message || e), ms: Date.now() - t0 };
  }
}

/* ---------------------------------------------------------------- plumbing */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "judge") {
    handleJudge(msg.videos || [])
      .then(sendResponse)
      .catch((e) => sendResponse({ verdicts: {}, error: String(e.message || e) }));
    return true;
  }
  if (msg?.type === "settings") {
    getSettings().then(sendResponse);
    return true;
  }
  if (msg?.type === "test") {
    handleTest(msg.goals).then(sendResponse);
    return true;
  }
  if (msg?.type === "clearCache") {
    chrome.storage.local
      .get(null)
      .then((all) => chrome.storage.local.remove(Object.keys(all).filter((k) => k.startsWith("v:"))))
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install") return;
  await chrome.storage.local.set({ settings: { ...DEFAULT_SETTINGS } });
  chrome.runtime.openOptionsPage();
});

// Exported for the offline shape test in test/validate.mjs. Unused at runtime.
export { buildRequest, verdictFrom, heuristicVerdict, DEFAULT_SETTINGS };
