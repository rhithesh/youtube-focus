import { getStore, peek } from "@/lib/ratelimit";
import { apiKey, caller, isFlat, isObj, json, relay, type Checked } from "@/lib/relay";

// Free tier for the extension: the same System One request the extension would send to
// OpenRouter itself, forwarded with our key, behind per-install, per-IP and global limits.
// Nothing about the posts is stored or logged; only hashed counters are kept.
// Pictures go to ./look instead.

export const maxDuration = 30;

const UPSTREAM = process.env.JEV_UPSTREAM_URL || "https://openrouter.ai/api/v1/systemone";
const MODEL = process.env.FREE_MODEL || "jev-latest";
const MAX_BODY = 64_000; // a full 20-item batch is ~30KB
const MAX_ITEMS = 20;
const ITEM_KEY = /^v\d{1,2}$/;
const QUESTION_KEY = /^(v\d{1,2})_(bait|goal|junk)$/;

/** Only the exact request shape the extension builds gets through; anything else is a 400. */
function check(body: unknown): Checked {
  if (!isObj(body) || !isObj(body.state) || !isObj(body.questions)) return { ok: false, error: "expected { state, questions }" };
  const { state, questions } = body;
  if (Object.keys(state).some((k) => k !== "my_goals" && k !== "items")) return { ok: false, error: "unexpected state key" };
  if (typeof state.my_goals !== "string" || state.my_goals.length > 2000) return { ok: false, error: "my_goals must be a string up to 2000 chars" };
  if (!isObj(state.items)) return { ok: false, error: "state.items must be an object" };

  const itemKeys = Object.keys(state.items);
  if (!itemKeys.length || itemKeys.length > MAX_ITEMS) return { ok: false, error: `1-${MAX_ITEMS} items per request` };
  for (const k of itemKeys) {
    const it = state.items[k];
    if (!ITEM_KEY.test(k) || !isObj(it) || Object.keys(it).length > 10 || !Object.values(it).every((v) => isFlat(v, 1200)))
      return { ok: false, error: "bad item " + k };
  }

  const qKeys = Object.keys(questions);
  if (!qKeys.length || qKeys.length > itemKeys.length * 3) return { ok: false, error: "at most 3 questions per item" };
  for (const k of qKeys) {
    const m = QUESTION_KEY.exec(k);
    const q = questions[k];
    if (!m || !(m[1] in state.items) || !isObj(q)) return { ok: false, error: "bad question " + k };
    const want = m[2] === "junk" ? "noul" : "score";
    if (q.type !== want || JSON.stringify(q).length > 4000) return { ok: false, error: "bad question " + k };
  }

  return { ok: true, body: { model: MODEL, state, questions }, items: itemKeys.length };
}

export function POST(req: Request) {
  return relay(req, { kind: "text", maxBody: MAX_BODY, check, upstream: UPSTREAM, timeoutMs: 25_000 });
}

/** Today's allowance for this install, without spending any of it. */
export async function GET(req: Request) {
  const who = caller(req);
  try {
    const p = await peek(who.install);
    return json({ enabled: !!apiKey(), store: getStore().kind, ...p });
  } catch {
    return json({ enabled: !!apiKey(), error: "unavailable" }, 503);
  }
}
