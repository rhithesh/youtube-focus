// Offline checks: request body matches the documented System One schema and
// verdict thresholds behave. No network, no API key.
globalThis.chrome = {
  storage: { local: { get: async () => ({}), set: async () => {}, remove: async () => {} }, onChanged: { addListener() {} } },
  runtime: { onMessage: { addListener() {} }, onInstalled: { addListener() {} }, openOptionsPage() {} },
};

const { buildRequest, verdictFrom, heuristicVerdict, DEFAULT_SETTINGS } = await import("../background.js");

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  PASS  " : "  FAIL  ") + msg); if (!cond) fails++; };

const s = { ...DEFAULT_SETTINGS, goals: "Systems programming and AI research. No drama, no reactions." };
const videos = [
  { id: "aaaaaaaaaaa", title: "You WON'T BELIEVE this 😱😱", channel: "Drama", duration: "18:02", meta: "2.1M views", isShort: false },
  { id: "bbbbbbbbbbb", title: "Rust ownership, explained", channel: "Systems Weekly", duration: "41:15", meta: "84K views", isShort: false },
];
const body = buildRequest(videos, s);

console.log("\n-- request shape --");
ok(typeof body.model === "string", "model is a string");
ok(body.state && typeof body.state === "object", "state is an object");
ok(Object.keys(body.state.videos).join() === "v0,v1", "state.videos keyed v0..vN");
ok(Object.keys(body.questions).length === videos.length * 3, "3 questions per video (" + Object.keys(body.questions).length + ")");

for (const [key, q] of Object.entries(body.questions)) {
  const t = q.type;
  ok(["noul", "choice", "score"].includes(t), key + ": type is a documented primitive (" + t + ")");
  ok(q.instructions !== undefined, key + ": has instructions");
  if (t === "score") ok(Array.isArray(q.criteria) && q.criteria.length >= 2 && q.criteria.length <= 10, key + ": score criteria is an ordered array of 2-10 levels");
  if (t === "noul") ok(q.criteria && "true" in q.criteria && "false" in q.criteria, key + ": noul criteria has true/false");
  const ref = q.instructions.question.match(/`(videos\.v\d+)`/);
  ok(!!ref && body.state[ref[1].split(".")[0]][ref[1].split(".")[1]], key + ": backtick ref resolves into state");
}

const tokens = Math.round(JSON.stringify(body).length / 4);
console.log("\n  ~" + tokens + " est. input tokens for " + videos.length + " listings" +
  " (~" + Math.round((tokens / videos.length) * 20) + " for a 20-listing batch, $" +
  ((tokens / videos.length) * 20 * 0.042 / 1e6).toFixed(6) + ")");

console.log("\n-- verdicts --");
const answers = {
  v0_bait: { type: "score", score: 2.8, confidence: 0.94 },
  v0_goal: { type: "score", score: 3.0, confidence: 0.9 },
  v0_junk: { type: "noul", noul: 0.2 },
  v1_bait: { type: "score", score: 0.2, confidence: 0.97 },
  v1_goal: { type: "score", score: 0.1, confidence: 0.95 },
  v1_junk: { type: "noul", noul: 0.01 },
};
ok(verdictFrom(answers, "v0", s, "m").tag === "CLICK-BAIT", "high bait + high confidence -> CLICK-BAIT");
ok(verdictFrom(answers, "v1", s, "m").tag === null, "clean listing -> allowed");

const lowConf = { ...answers, v0_bait: { score: 2.8, confidence: 0.2 }, v0_goal: { score: 3.0, confidence: 0.2 } };
ok(verdictFrom(lowConf, "v0", s, "m").tag === null, "high score + low confidence -> fails open");

const spam = { v0_bait: { score: 1, confidence: 0.9 }, v0_goal: { score: 1, confidence: 0.9 }, v0_junk: { noul: 0.93 } };
ok(verdictFrom(spam, "v0", s, "m").tag === "SPAM", "high spam probability -> SPAM (outranks bait)");

const noGoals = { ...s, goals: "" };
const offGoalOnly = { v0_bait: { score: 0.1, confidence: 0.9 }, v0_goal: { score: 3.0, confidence: 0.9 }, v0_junk: { noul: 0 } };
ok(verdictFrom(offGoalOnly, "v0", noGoals, "m").tag === null, "no goals written -> off-goal never fires");
ok(verdictFrom(offGoalOnly, "v0", s, "m").tag === "OFF-GOAL", "goals written -> off-goal fires");

console.log("\n-- heuristic fallback --");
ok(heuristicVerdict(videos[0], s).tag === "CLICK-BAIT", "keyword+emoji title -> CLICK-BAIT");
ok(heuristicVerdict(videos[1], s).tag === null, "clean title -> allowed");
ok(heuristicVerdict({ title: "Make $5000 a day with this FREE crypto airdrop" }, s).tag === "SPAM", "scam title -> SPAM");

console.log(fails ? "\n" + fails + " FAILED\n" : "\nall checks passed\n");
process.exit(fails ? 1 : 0);
