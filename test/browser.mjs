// Browser test. Loads the real content.js against fake YouTube tiles, then drives
// real pointer input over the Chrome DevTools Protocol to verify that hovering a
// flagged tile clears the blur and lets the click reach the video.
// Node 24 ships a global WebSocket, so this needs no dependencies.
//   node test/browser.mjs   (set CHROME=... to override the binary)

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const PAGE = "file://" + join(HERE, "dom.html");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/ygf-cdp-profile",
  "--window-size=1100,760", PAGE,
], { stdio: "ignore" });

let ws, nextId = 1;
const waiters = new Map();

function send(method, params = {}) {
  const id = nextId++;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => waiters.set(id, { res, rej }));
}

async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval failed");
  return r.result.value;
}

async function shot(path) {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(path, Buffer.from(data, "base64"));
}

try {
  // wait for the debugging endpoint, then find our page target
  let target = null;
  for (let i = 0; i < 100 && !target; i++) {
    await sleep(100);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page" && t.url.startsWith("file://"));
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error("Chrome never exposed a page target on :" + PORT);

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiters.has(m.id)) {
      const w = waiters.get(m.id); waiters.delete(m.id);
      m.error ? w.rej(new Error(m.error.message)) : w.res(m.result);
    }
  };

  await send("Page.enable");
  await send("Runtime.enable");

  // let content.js scan and the in-page structural checks finish
  await evaluate("window.__ready");

  const rect = await evaluate(`(() => {
    const r = document.querySelector("#tileA .thumb").getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`);

  const read = () => evaluate(`(() => {
    const v = document.querySelector("#tileA .ygf-veil");
    const c = document.querySelector("#tileA .ygf-chip");
    const s = getComputedStyle(v);
    return {
      opacity: s.opacity,
      pointerEvents: s.pointerEvents,
      chipOpacity: getComputedStyle(c).opacity,
      hovered: document.querySelector("#tileA").matches(":hover"),
      navigated: window.__navigated,
      topEl: (document.elementFromPoint(${rect.x}, ${rect.y}) || {}).className || "",
    };
  })()`);

  const before = await read();
  await shot("/tmp/ygf-before.png");

  // real pointer movement
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y, buttons: 0 });
  await sleep(400); // let the 0.18s transition settle
  const after = await read();
  await shot("/tmp/ygf-after.png");

  // and a real click at the same spot
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(150);
  const clicked = await read();

  const checks = [
    [before.opacity === "1", "before hover: veil is opaque"],
    [before.pointerEvents === "auto", "before hover: veil takes pointer events"],
    [before.topEl.includes("ygf-veil"), "before hover: veil is the topmost element over the thumbnail"],
    [after.hovered === true, "real mouse move puts the tile in :hover"],
    [after.opacity === "0", "on hover: veil fades to transparent (blur gone)"],
    [after.pointerEvents === "none", "on hover: veil stops taking pointer events"],
    [!after.topEl.includes("ygf-veil"), "on hover: the video link is topmost again"],
    [Number(after.chipOpacity) > 0 && Number(after.chipOpacity) < 1, "on hover: tag chip stays visible but dims (" + after.chipOpacity + ")"],
    [clicked.navigated === "/watch?v=aaaaaaaaaaa", "clicking a hovered tile reaches the video link"],
  ];

  const extra = ["", "-- real pointer input over CDP --",
    ...checks.map(([c, m]) => (c ? "  PASS  " : "  FAIL  ") + m)];
  for (const [c, m] of checks) if (!c) process.exitCode = 1;

  const fails = await evaluate(`window.__report(${JSON.stringify(extra)})`);
  console.log(await evaluate(`document.getElementById("results").textContent`));
  if (fails) process.exitCode = 1;
  console.log("\nscreenshots: /tmp/ygf-before.png (blurred)  /tmp/ygf-after.png (hovered)");
} catch (e) {
  console.error("hover test failed:", e.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  chrome.kill();
}
