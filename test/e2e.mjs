// End-to-end test with the real extension in real Chrome.
// Serves test/fixtures/*.html as www.youtube.com, x.com and www.linkedin.com over
// local HTTPS, loads the unpacked extension over CDP, then checks what gets
// blurred, that hover clears it, and that reloading the extension leaves no errors.
//
//   node test/e2e.mjs                         no key: the free tier, served by a local mock
//                                              (rate-limits the first call, then answers)
//   OPENROUTER_API_KEY=sk-or-... node test/e2e.mjs   your own key: live Jev verdicts
//
// Needs openssl on PATH for the throwaway certificate. Set CHROME=... to override the binary.

import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:https";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, "..");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const KEY = process.env.OPENROUTER_API_KEY || "";
const PORT = 8443;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HOSTS = {
  "www.youtube.com": "youtube.html",
  "x.com": "x.html",
  "www.linkedin.com": "linkedin.html",
};

// What each fixture item should end up as. Items not listed must not be judged at all.
const EXPECT = {
  "www.youtube.com": { bait: true, clean: false },
  "x.com": { bait: true, spam: true, clean: false, media: false },
  "www.linkedin.com": { bait: true, spam: true, clean: false },
};

const FREE_HOST = "feed-filter-two.vercel.app";
const freeCalls = [];

// Stand-in for landing/src/app/api/jev: the first call is over the limit, the rest get answers.
function freeTier(req, res, raw) {
  const body = JSON.parse(raw);
  freeCalls.push({ install: req.headers["x-feed-filter-install"], auth: req.headers.authorization, items: Object.keys(body.state.items).length });
  if (freeCalls.length === 1) {
    res.writeHead(429, { "content-type": "application/json", "retry-after": "2" }).end(JSON.stringify({ error: "limit", scope: "install", limit: 300, retryAfter: 2 }));
    return;
  }
  const answers = {};
  for (const [k, item] of Object.entries(body.state.items)) {
    const t = JSON.stringify(item);
    answers[k + "_bait"] = { score: /believe|99% of|fired my best/i.test(t) ? 3 : 0.2, confidence: 0.95 };
    answers[k + "_goal"] = { score: 0.5, confidence: 0.9 };
    answers[k + "_junk"] = { noul: /airdrop|passive income/i.test(t) ? 0.97 : 0.03 };
  }
  res.writeHead(200, { "content-type": "application/json", "x-ratelimit-limit": "300", "x-ratelimit-remaining": String(300 - freeCalls.length) })
    .end(JSON.stringify({ answers, model: "jev-free-mock" }));
}

const tmp = mkdtempSync(join(tmpdir(), "ygf-e2e-"));
execFileSync("openssl", [
  "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
  "-keyout", join(tmp, "key.pem"), "-out", join(tmp, "cert.pem"),
  "-subj", "/CN=feed-filter-test", "-addext", "subjectAltName=" + [...Object.keys(HOSTS), FREE_HOST].map((h) => "DNS:" + h).join(","),
], { stdio: "ignore" });

const server = createServer({ key: readFileSync(join(tmp, "key.pem")), cert: readFileSync(join(tmp, "cert.pem")) }, async (req, res) => {
  if ((req.headers.host || "").startsWith(FREE_HOST) && req.url === "/api/jev" && req.method === "POST") {
    let raw = "";
    for await (const c of req) raw += c;
    return freeTier(req, res, raw);
  }
  const file = HOSTS[(req.headers.host || "").split(":")[0]];
  if (!file) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(readFileSync(join(HERE, "fixtures", file)));
}).listen(PORT, "127.0.0.1");

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-pipe", "--enable-unsafe-extension-debugging",
  "--user-data-dir=" + join(tmp, "profile"), "--no-first-run", "--window-size=1200,900",
  "--host-resolver-rules=" + [...Object.keys(HOSTS), FREE_HOST].map((h) => `MAP ${h}:443 127.0.0.1:${PORT}`).join(","),
  "--ignore-certificate-errors", "about:blank",
], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });

// CDP over the pipe: NUL-delimited JSON, flattened sessions.
const toChrome = chrome.stdio[3];
const fromChrome = chrome.stdio[4];
let nextId = 1, buf = "";
const waiters = new Map();
const events = [];
fromChrome.on("data", (d) => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf("\0")) >= 0) {
    const m = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    if (m.id && waiters.has(m.id)) {
      const w = waiters.get(m.id);
      waiters.delete(m.id);
      m.error ? w.rej(new Error(m.error.message)) : w.res(m.result);
    } else events.push(m);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => {
    const id = nextId++;
    waiters.set(id, { res, rej });
    toChrome.write(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }) + "\0");
  });
const evaluate = async (expression, sessionId) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};

let fails = 0;
const check = (cond, msg) => {
  console.log((cond ? "  PASS  " : "  FAIL  ") + msg);
  if (!cond) fails++;
};

async function openPage(url) {
  const { targetId } = await send("Target.createTarget", { url });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Runtime.enable", {}, sessionId);
  return sessionId;
}

async function waitFor(expression, sessionId, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evaluate(expression, sessionId).catch(() => false)) return true;
    await sleep(200);
  }
  return false;
}

try {
  const { id: extId } = await send("Extensions.loadUnpacked", { path: EXT });
  await sleep(1000);

  const { targetInfos } = await send("Target.getTargets");
  const sw = targetInfos.find((t) => t.type === "service_worker" && t.url.includes(extId));
  const { sessionId: swSession } = await send("Target.attachToTarget", { targetId: sw.targetId, flatten: true });
  await evaluate(`(async () => {
    const { settings } = await chrome.storage.local.get("settings");
    await chrome.storage.local.set({ settings: { ...settings, apiKey: ${JSON.stringify(KEY)},
      goals: "Crack Google interview LeetCode, system design, programming and real tech news." } });
  })()`, swSession);
  console.log(KEY ? "mode: live Jev via OpenRouter" : "mode: free tier (local mock) — set OPENROUTER_API_KEY for live Jev");

  const pages = {};
  for (const [host, expected] of Object.entries(EXPECT)) {
    console.log("\n-- " + host + " --");
    const s = await openPage("https://" + host + "/");
    pages[host] = s;
    const flaggedIds = Object.entries(expected).filter(([, v]) => v).map(([k]) => k);
    const settled = await waitFor(
      `${JSON.stringify(flaggedIds)}.every((id) => document.querySelector("#" + id + " > .ygf-veil, #" + id + ".ygf-host > .ygf-veil"))`,
      s,
      KEY ? 20000 : 8000
    );
    if (!settled) console.log("  (timed out waiting for every expected blur)");
    for (const [id, shouldBlur] of Object.entries(expected)) {
      const blurred = await evaluate(`!!document.querySelector("#${id}").querySelector(".ygf-veil")`, s);
      check(blurred === shouldBlur, `${id}: ${shouldBlur ? "blurred" : "left alone"}`);
    }
    const siteClass = { "www.youtube.com": "ygf-host--youtube", "x.com": "ygf-host--x", "www.linkedin.com": "ygf-host--linkedin" }[host];
    check(await evaluate(`!!document.querySelector(".${siteClass}")`, s), `blurred items carry ${siteClass}`);
  }

  if (!KEY) {
    console.log("\n-- free tier (no key) --");
    check(freeCalls.length > 0, `the extension called the free tier (${freeCalls.length} calls)`);
    check(freeCalls.every((c) => /^[0-9a-f-]{36}$/.test(c.install || "")), "every call carries this install's id");
    check(freeCalls.every((c) => !c.auth), "no Authorization header is sent to the free tier");
    // First call was a 429: those items got keyword-rule stand-ins, then were asked again after Retry-After.
    const judged = await waitFor(`(async () => {
      const all = await chrome.storage.local.get(null);
      return Object.entries(all).filter(([k, v]) => k.startsWith("v:") && v.d?.source === "jev-free-mock").length >= 8;
    })()`, swSession, 15000);
    check(judged, "after the 429 and its Retry-After, all judged items were re-asked and cached from the free tier (8 items)");
    const st = await evaluate(`chrome.storage.local.get(["freeUsage", "freePausedUntil"])`, swSession);
    check(st.freePausedUntil > 0, "the 429 paused free calls (freePausedUntil was set)");
    check(st.freeUsage?.limit === 300 && st.freeUsage.remaining < 300, `remaining allowance is tracked for the popup (${st.freeUsage?.remaining} of ${st.freeUsage?.limit})`);
  }

  console.log("\n-- hover on x.com --");
  const xs = pages["x.com"];
  await send("Target.activateTarget", { targetId: (await send("Target.getTargets")).targetInfos.find((t) => t.url.startsWith("https://x.com")).targetId });
  const pt = await evaluate(`(() => { const b = document.querySelector("#bait").getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`, xs);
  const veilOpacity = `getComputedStyle(document.querySelector("#bait > .ygf-veil")).opacity`;
  check((await evaluate(veilOpacity, xs)) === "1", "blur is on before hover");
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pt.x, y: pt.y }, xs);
  await sleep(400);
  check((await evaluate(veilOpacity, xs)) === "0", "real mouse hover clears the blur");
  check((await evaluate(`getComputedStyle(document.querySelector("#bait > .ygf-veil")).pointerEvents`, xs)) === "none", "cleared blur lets clicks through");

  console.log("\n-- on-page switch --");
  const pillInfo = `(() => { const h = document.querySelector("[data-ygf-pill]"); if (!h) return null;
    const r = h.shadowRoot, b = r.querySelector("button").getBoundingClientRect();
    return { label: r.querySelector(".label").textContent, x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`;
  for (const [host, s] of Object.entries(pages)) {
    const p = await evaluate(pillInfo, s);
    check(p?.label === "Filter on", `${host}: switch is on the page and reads "${p?.label}"`);
  }
  const li = pages["www.linkedin.com"];
  await send("Target.activateTarget", { targetId: (await send("Target.getTargets")).targetInfos.find((t) => t.url.startsWith("https://www.linkedin.com")).targetId });
  const { data: pillShot } = await send("Page.captureScreenshot", { format: "png" }, li);
  writeFileSync("/tmp/ygf-pill-linkedin.png", Buffer.from(pillShot, "base64"));
  const lp = await evaluate(pillInfo, li);
  const clickAt = async (x, y, s) => {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, s);
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, s);
  };
  await clickAt(lp.x, lp.y, li);
  await sleep(800);
  check((await evaluate(`document.querySelectorAll(".ygf-veil").length`, li)) === 0, "clicking it on LinkedIn clears LinkedIn's blur");
  check((await evaluate(`document.querySelectorAll(".ygf-veil").length`, xs)) === 0, "...and the X tab's too (one shared setting)");
  check((await evaluate(pillInfo, xs))?.label === "Filter off", "the X tab's switch now reads Filter off");
  check((await evaluate(`chrome.storage.local.get("settings").then((r) => r.settings.enabled)`, swSession)) === false, "enabled=false is what's stored");
  const lp2 = await evaluate(pillInfo, li);
  check(Math.abs(lp2.x - lp.x) < 1, "the switch doesn't move when it flips");
  await clickAt(lp2.x, lp2.y, li);
  check(await waitFor(`document.querySelectorAll(".ygf-veil").length > 0`, li, KEY ? 15000 : 6000), "clicking it again brings the blur back");

  console.log("\n-- extension reloaded under open tabs --");
  send("Runtime.evaluate", { expression: "chrome.runtime.reload()" }, swSession).catch(() => {});
  await sleep(3000);
  for (const [host, s] of Object.entries(pages)) {
    const left = await evaluate(`document.querySelectorAll(".ygf-veil").length`, s);
    check(left === 0, `${host}: orphaned tab clears its blur (${left} left)`);
    check(!(await evaluate(`!!document.querySelector("[data-ygf-pill]")`, s)), `${host}: orphaned tab removes its switch`);
  }
  const pageSessions = new Set(Object.values(pages));
  const errors = events.filter((e) => e.method === "Runtime.exceptionThrown" && pageSessions.has(e.sessionId));
  check(errors.length === 0, "no uncaught errors in any tab" + (errors.length ? ": " + errors[0].params.exceptionDetails.exception?.description : ""));
} catch (e) {
  console.error("e2e failed:", e.message);
  fails++;
} finally {
  const exited = new Promise((r) => chrome.once("exit", r));
  chrome.kill();
  await Promise.race([exited, sleep(3000)]);
  server.close();
  rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

console.log(fails ? `\n${fails} FAILED` : "\nall checks passed");
process.exit(fails ? 1 : 0);
