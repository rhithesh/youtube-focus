// Feed Filter — service worker.
// Batches YouTube feed listings into a single TypeSafe System One (Jev) call and
// turns the typed answers into block/allow verdicts.

const ENDPOINTS = {
  openrouter: "https://openrouter.ai/api/v1/systemone",
  typesafe: "https://api.typesafe.ai/v1/systemone",
};

const DEFAULT_SETTINGS = {
  enabled: true,
  provider: "openrouter",
  apiKey: "",
  model: "jev-latest",
  goals: "",
  onboarded: false,
  surfaces: { home: true, search: true, sidebar: true, shorts: true },
  baitThreshold: 2.0,
  offGoalThreshold: 2.6,
  junkThreshold: 0.85, // clickbait reads 0.45-0.75 on this question; real scams read 0.9+
  minConfidence: 0.5,
  hideUntilChecked: false,
  fallbackHeuristics: true,
};

// Jev evaluates every question against the state in one parallel pass, so a whole
// feed page fits in one request. 20 listings = 60 questions, ~5k input tokens.
const BATCH_SIZE = 20;
const MAX_PARALLEL = 3;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 6000;

const BAIT_LEVELS = [
  "Plain and accurate. The title says what the video actually contains — no exaggeration, nothing withheld, no emotional hook.",
  "Mildly promotional. Slightly punchy or curiosity-driven phrasing, but the title still describes the real content honestly.",
  "Clear clickbait. Manufactured curiosity or outrage: withheld payoff, shock claims, ALL-CAPS or emoji spam, fake urgency, inflated stakes, misleading superlatives, '#1 thing nobody tells you'.",
  "Pure engagement bait. The title exists only to force a click and almost certainly misrepresents the video: 'you won't believe', invented drama, fabricated numbers, rage-bait, fake reveals.",
];

const GOAL_LEVELS = [
  "Directly advances the stated goals. Substantive content someone pursuing these goals would deliberately seek out.",
  "Useful and adjacent. Clearly related to the goals and plausibly worth the time, though not core to them.",
  "Tangential. Same broad subject area, but mostly commentary, news-of-the-week or entertainment rather than substance.",
  "Unrelated distraction. Nothing to do with the stated goals — pure entertainment, drama, or time-filler.",
];

const JUNK_TRUE =
  "Spam, a scam, or mass-produced filler: crypto and get-rich-quick pitches, fake giveaways, engagement farming, AI-generated slop, stolen or re-uploaded content, misleading medical or financial claims, or a channel pumping out near-identical videos.";
const JUNK_FALSE =
  "A genuine video from a real channel, whatever its quality or subject.";

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
function rubricStamp(s) {
  return hash32(
    [s.goals, s.model, s.baitThreshold, s.offGoalThreshold, s.junkThreshold, s.minConfidence].join("|")
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

function buildRequest(videos, s) {
  const state = {
    my_goals: s.goals?.trim() || "(the viewer has not stated any goals)",
    videos: {},
  };
  const questions = {};

  videos.forEach((v, i) => {
    const k = "v" + i;
    state.videos[k] = {
      title: v.title,
      channel: v.channel || "unknown",
      duration: v.duration || "unknown",
      metadata: v.meta || "",
      format: v.isShort ? "YouTube Short (vertical, under 60s)" : "regular video",
    };

    questions[k + "_bait"] = {
      type: "score",
      instructions: {
        listing: "videos." + k,
        question:
          "Rate how much the listing at `videos." + k +
          "` relies on clickbait. Judge the title and channel exactly as a viewer sees them in a feed, before clicking.",
      },
      criteria: BAIT_LEVELS,
    };

    questions[k + "_goal"] = {
      type: "score",
      instructions: {
        listing: "videos." + k,
        question:
          "The viewer's own goals are in `my_goals`. Rate how far the listing at `videos." + k +
          "` sits from those goals. Judge the subject matter, not the production quality.",
      },
      criteria: GOAL_LEVELS,
    };

    questions[k + "_junk"] = {
      type: "noul",
      instructions: {
        listing: "videos." + k,
        question: "The listing at `videos." + k + "` is spam, a scam, or mass-produced low-effort filler.",
      },
      criteria: { true: JUNK_TRUE, false: JUNK_FALSE },
    };
  });

  return { model: s.model, state, questions };
}

async function callJev(body, s, attempt = 0) {
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
  bait += Math.min(2, BAIT_PATTERNS.filter((r) => r.test(title)).length);
  if (caps > 0.6 && letters.length > 8) bait += 1;
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

  if (!s.apiKey) {
    if (!s.fallbackHeuristics) return { verdicts: cached, settings: s, error: "No API key set." };
    const out = { ...cached };
    for (const v of todo) out[v.id] = heuristicVerdict(v, s);
    return { verdicts: out, settings: s, degraded: "no-key" };
  }

  const chunks = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) chunks.push(todo.slice(i, i + BATCH_SIZE));

  const fresh = {};
  let error = null;

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
    for (const r of results) if (r.status === "rejected") error = String(r.reason?.message || r.reason);
  }

  if (Object.keys(fresh).length) await writeCache(fresh, stamp);
  if (error) await chrome.storage.local.set({ lastError: { msg: error, at: Date.now() } });
  else await chrome.storage.local.remove("lastError");

  return { verdicts: { ...cached, ...fresh }, settings: s, error };
}

/* -------------------------------------------------------------- test call */

async function handleTest(goals) {
  const s = await getSettings();
  if (goals !== undefined) s.goals = goals;
  if (!s.apiKey) return { ok: false, error: "No API key set." };

  const samples = [
    { id: "t0", title: "You WON'T BELIEVE what happened next 😱😱 (GONE WRONG)", channel: "DramaDaily", duration: "18:02", meta: "2.1M views · 3 days ago" },
    { id: "t1", title: "Rust's ownership model explained with memory diagrams", channel: "Systems Weekly", duration: "41:15", meta: "84K views · 1 month ago" },
    { id: "t2", title: "Make $5,000 a day with this FREE crypto airdrop bot", channel: "Wealth Signals", duration: "6:44", meta: "12K views · 2 days ago" },
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
