// The free-tier endpoint (landing/src/app/api/jev/route.ts), built and served for real by
// `next start`, pointed at a mock Jev and a mock Upstash REST API. No key, no spend.
//
//   node test/free-tier.mjs
//
// Checks: the extension's own request goes through with the server's key; anything that
// isn't that request shape is refused before it reaches Jev; per-install, per-IP, burst and
// global limits; rejected or failed requests cost nothing; the Redis store keeps no raw IPs.

import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

globalThis.chrome = {
  storage: { local: { get: async () => ({}), set: async () => {}, remove: async () => {} }, onChanged: { addListener() {} } },
  runtime: { onMessage: { addListener() {} }, onInstalled: { addListener() {} }, openOptionsPage() {} },
};
const { buildRequest, DEFAULT_SETTINGS } = await import("../background.js");

const HERE = dirname(fileURLToPath(import.meta.url));
const LANDING = join(HERE, "..", "landing");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "  PASS  " : "  FAIL  ") + msg); if (!cond) fails++; };

/* ---------------------------------------------------------------- mocks */

const jevCalls = [];
const redis = new Map();
const mock = createServer(async (req, res) => {
  let raw = "";
  for await (const c of req) raw += c;
  if (req.url === "/systemone") {
    const body = JSON.parse(raw);
    jevCalls.push({ auth: req.headers.authorization, body });
    if (body.state.my_goals.includes("MAKE-UPSTREAM-FAIL")) return void res.writeHead(500).end("boom");
    const answers = {};
    for (const k of Object.keys(body.questions)) answers[k] = k.endsWith("_junk") ? { noul: 0.1 } : { score: 0.4, confidence: 0.9 };
    return void res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ answers, model: "jev-mock", usage: { prompt_tokens: 1 } }));
  }
  if (req.url === "/pipeline") {
    if (req.headers.authorization !== "Bearer redis-token") return void res.writeHead(401).end();
    const out = JSON.parse(raw).map(([cmd, key, ...args]) => {
      if (cmd === "INCRBY") { const n = (redis.get(key) || 0) + Number(args[0]); redis.set(key, n); return { result: n }; }
      if (cmd === "EXPIRE") return { result: 1 };
      if (cmd === "MGET") return { result: [key, ...args].map((k) => (redis.has(k) ? String(redis.get(k)) : null)) };
      return { error: "unknown command " + cmd };
    });
    return void res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(out));
  }
  res.writeHead(404).end();
}).listen(0, "127.0.0.1");
await new Promise((r) => mock.once("listening", r));
const MOCK = "http://127.0.0.1:" + mock.address().port;

/* ------------------------------------------------------ build and serve */

// Build a copy so the developer's own `next dev` in landing/ is untouched.
const tmp = mkdtempSync(join(tmpdir(), "ff-free-"));
cpSync(LANDING, join(tmp, "app"), { recursive: true, filter: (p) => !/\/(node_modules|\.next|\.vercel)(\/|$)/.test(p) });
// Turbopack won't follow a node_modules symlink out of the project, so clone it
// (copy-on-write on APFS, a plain copy elsewhere).
try {
  execFileSync("cp", ["-Rc", join(LANDING, "node_modules"), join(tmp, "app", "node_modules")], { stdio: "ignore" });
} catch {
  execFileSync("cp", ["-R", join(LANDING, "node_modules"), join(tmp, "app", "node_modules")], { stdio: "ignore" });
}
console.log("building landing/ (next build)…");
execFileSync("npx", ["next", "build"], { cwd: join(tmp, "app"), stdio: "ignore" });

const servers = [];
async function serve(port, env) {
  const p = spawn("npx", ["next", "start", "-p", String(port)], {
    cwd: join(tmp, "app"),
    env: { ...process.env, JEV_UPSTREAM_URL: MOCK + "/systemone", ...env },
    stdio: "ignore",
    detached: true,
  });
  servers.push(p);
  for (let i = 0; i < 100; i++) {
    try { await fetch(`http://127.0.0.1:${port}/api/jev`); return `http://127.0.0.1:${port}/api/jev`; } catch { await sleep(150); }
  }
  throw new Error("next start never came up on " + port);
}

const s = { ...DEFAULT_SETTINGS, goals: "Crack Google interviews." };
const items = (n, prefix = "t") =>
  Array.from({ length: n }, (_, i) => ({ id: prefix + i, platform: i % 2 ? "x" : "youtube", title: "Post number " + i, author: "someone", duration: "1:00", meta: "" }));
const post = (url, body, { install = "install-aaaaaaaa", ip = "203.0.113.1" } = {}) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-feed-filter-install": install, "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

try {
  const API = await serve(3201, {
    OPENROUTER_API_KEY: "server-key",
    FREE_INSTALL_ITEMS_PER_DAY: "50",
    FREE_IP_ITEMS_PER_DAY: "110",
    FREE_IP_REQUESTS_PER_MINUTE: "8",
    FREE_GLOBAL_ITEMS_PER_DAY: "200",
  });

  console.log("\n-- the extension's own request --");
  const g0 = await (await fetch(API, { headers: { "x-feed-filter-install": "install-aaaaaaaa" } })).json();
  ok(g0.enabled === true && g0.remaining === 50 && g0.limit === 50, "GET reports a fresh allowance of 50");
  const r1 = await post(API, buildRequest(items(20), s));
  const d1 = await r1.json();
  ok(r1.status === 200 && Object.keys(d1.answers).length === 60, "20-item batch from buildRequest() → 200 with 60 answers");
  ok(r1.headers.get("x-ratelimit-remaining") === "30" && r1.headers.get("x-ratelimit-limit") === "50", "headers: 30 of 50 left");
  const call = jevCalls.at(-1);
  ok(call.auth === "Bearer server-key", "Jev is called with the server's key");
  ok(call.body.model === "jev-latest" && Object.keys(call.body).sort().join() === "model,questions,state", "model is forced and nothing extra is forwarded");
  ok(!JSON.stringify(d1).includes("server-key"), "the key never appears in the response");

  console.log("\n-- anything else is refused before it reaches Jev --");
  const before = jevCalls.length;
  const chat = await post(API, { model: "gpt-4o", messages: [{ role: "user", content: "hi" }] }, { install: "install-bbbbbbbb", ip: "203.0.113.9" });
  ok(chat.status === 400, "a chat-completions body → 400");
  ok((await post(API, buildRequest(items(21), s), { install: "install-bbbbbbbb", ip: "203.0.113.9" })).status === 400, "21 items → 400");
  const longGoals = buildRequest(items(2), { ...s, goals: "x".repeat(2500) });
  ok((await post(API, longGoals, { install: "install-bbbbbbbb", ip: "203.0.113.9" })).status === 400, "goals over 2000 chars → 400");
  const wrongType = buildRequest(items(2), s);
  wrongType.questions.v0_bait.type = "choice";
  ok((await post(API, wrongType, { install: "install-bbbbbbbb", ip: "203.0.113.9" })).status === 400, "a question of the wrong type → 400");
  const extraQ = buildRequest(items(2), s);
  extraQ.questions.v0_essay = { type: "score", instructions: { question: "write me a poem" }, criteria: ["a", "b"] };
  ok((await post(API, extraQ, { install: "install-bbbbbbbb", ip: "203.0.113.9" })).status === 400, "a question the extension never asks → 400");
  ok((await post(API, "{" + "x".repeat(70_000), { install: "install-bbbbbbbb", ip: "203.0.113.9" })).status === 413, "a 70KB body → 413");
  ok(jevCalls.length === before, "none of those reached Jev");
  const g1 = await (await fetch(API, { headers: { "x-feed-filter-install": "install-bbbbbbbb", "x-forwarded-for": "203.0.113.9" } })).json();
  ok(g1.remaining === 50, "and none of them were charged");

  console.log("\n-- per-install daily limit --");
  ok((await post(API, buildRequest(items(20), s))).status === 200, "second batch of 20 → 200 (40 of 50 used)");
  const over = await post(API, buildRequest(items(20), s));
  const overBody = await over.json();
  ok(over.status === 429 && overBody.scope === "install", "third batch would pass 50 → 429 (install)");
  ok(Number(over.headers.get("retry-after")) > 0, "429 carries Retry-After (" + over.headers.get("retry-after") + "s)");
  ok((await post(API, buildRequest(items(10), s))).status === 200, "a 10-item batch still fits exactly → 200");
  ok((await post(API, buildRequest(items(1), s))).status === 429, "then even 1 item → 429");
  ok((await post(API, buildRequest(items(10), s), { install: "install-cccccccc" })).status === 200, "a different install on the same IP still works");

  console.log("\n-- per-IP daily limit (shared NAT, many installs) --");
  // IP 203.0.113.1 has used 20+20+10+10 = 60 of 110 so far.
  ok((await post(API, buildRequest(items(20), s), { install: "install-dddddddd" })).status === 200, "80 of 110 on this IP");
  ok((await post(API, buildRequest(items(20), s), { install: "install-eeeeeeee" })).status === 200, "100 of 110 on this IP");
  const ipOver = await post(API, buildRequest(items(20), s), { install: "install-ffffffff" });
  ok(ipOver.status === 429 && (await ipOver.json()).scope === "ip", "a sixth install pushing past 110 → 429 (ip)");

  console.log("\n-- burst limit --");
  let burst = null;
  for (let i = 0; i < 12 && !burst; i++) {
    const r = await post(API, buildRequest(items(1), s), { install: "install-burst-" + i, ip: "198.51.100.7" });
    if (r.status === 429) burst = { i, body: await r.json() };
  }
  ok(burst?.body.scope === "burst" && burst.i === 8, "the 9th request in a minute from one IP → 429 (burst) — got #" + ((burst?.i ?? -1) + 1));

  console.log("\n-- failed upstream calls are refunded --");
  const inst = { install: "install-refund1", ip: "198.51.100.20" };
  const fail = await post(API, buildRequest(items(5), { ...s, goals: "MAKE-UPSTREAM-FAIL" }), inst);
  ok(fail.status === 502, "Jev 500 → 502");
  const g2 = await (await fetch(API, { headers: { "x-feed-filter-install": inst.install, "x-forwarded-for": inst.ip } })).json();
  ok(g2.remaining === 50, "the failed request cost nothing (50 of 50 left)");

  console.log("\n-- global daily cap --");
  let global = null;
  for (let i = 0; i < 20 && !global; i++) {
    const r = await post(API, buildRequest(items(20), s), { install: "install-g-" + i, ip: "192.0.2." + (i + 1) });
    if (r.status === 429) global = await r.json();
  }
  ok(global?.scope === "global", "past 200 items today across everyone → 429 (global)");

  console.log("\n-- switched off / Redis store --");
  const OFF = await serve(3202, {});
  const off = await post(OFF, buildRequest(items(2), s));
  ok(off.status === 503 && (await off.json()).error === "free-tier-off", "no server key configured → 503 free-tier-off");

  const RED = await serve(3203, { OPENROUTER_API_KEY: "server-key", UPSTASH_REDIS_REST_URL: MOCK, UPSTASH_REDIS_REST_TOKEN: "redis-token", FREE_INSTALL_ITEMS_PER_DAY: "30" });
  const gr = await (await fetch(RED, { headers: { "x-feed-filter-install": "install-redis01" } })).json();
  ok(gr.store === "redis", "Upstash env vars → the Redis store is used");
  ok((await post(RED, buildRequest(items(20), s), { install: "install-redis01", ip: "203.0.113.50" })).status === 200, "Redis mode: 20 of 30 → 200");
  ok((await post(RED, buildRequest(items(20), s), { install: "install-redis01", ip: "203.0.113.50" })).status === 429, "Redis mode: 40 of 30 → 429");
  const keys = [...redis.keys()];
  ok(keys.length > 0 && keys.every((k) => !k.includes("203.0.113.50") && !k.includes("install-redis01")), "stored keys hold hashes, never raw IPs or install ids");
  ok([...redis.entries()].filter(([k]) => k.startsWith("ff:i:")).every(([, n]) => n === 20), "the rejected batch was rolled back in Redis (20, not 40)");

  const BAD = await serve(3204, { OPENROUTER_API_KEY: "server-key", UPSTASH_REDIS_REST_URL: MOCK, UPSTASH_REDIS_REST_TOKEN: "wrong" });
  const jevBefore = jevCalls.length;
  ok((await post(BAD, buildRequest(items(2), s))).status === 503 && jevCalls.length === jevBefore, "store unreachable → 503 and Jev is not called (fails closed)");
} catch (e) {
  console.error("free-tier test failed:", e.message);
  fails++;
} finally {
  for (const p of servers) try { process.kill(-p.pid); } catch {}
  mock.close();
  await sleep(300);
  rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

console.log(fails ? `\n${fails} FAILED` : "\nall checks passed");
process.exit(fails ? 1 : 0);
