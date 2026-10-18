import { isFlat, isObj, relay, type Checked } from "@/lib/relay";

// Free tier for the extension's image pass: thumbnails and post pictures, each next to its
// title or text, judged by Jev through OpenRouter's Decisions route (which takes images as
// data-URL parts). Pictures have their own daily allowance, separate from posts.
// Nothing is stored or logged; only hashed counters are kept.

export const maxDuration = 60; // image requests run in Jev's slower long-context mode

const UPSTREAM = process.env.JEV_LOOK_UPSTREAM_URL || "https://openrouter.ai/api/alpha/decisions";
const MODEL = process.env.FREE_LOOK_MODEL || "~typesafe/jev-latest";
const MAX_ITEMS = 10;
const MAX_IMAGE = 300_000; // base64 chars; the extension sends ≤768px JPEGs, typically 30-90KB
const MAX_BODY = MAX_ITEMS * MAX_IMAGE + 64_000; // under Vercel's 4.5MB request limit
const ITEM_KEY = /^v\d{1,2}$/;
const QUESTION_KEY = /^(v\d{1,2})_(look|scam|goal)$/;
const JPEG_DATA_URL = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/;

type Item = Record<string, unknown>;

function isImagePart(v: unknown) {
  if (!isObj(v) || v.type !== "image_url" || Object.keys(v).length !== 2 || !isObj(v.image_url)) return false;
  const { url } = v.image_url;
  return Object.keys(v.image_url).length === 1 && typeof url === "string" && url.length <= MAX_IMAGE && JPEG_DATA_URL.test(url);
}

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
    const it = state.items[k] as Item;
    if (!ITEM_KEY.test(k) || !isObj(it) || Object.keys(it).length > 10 || !isImagePart(it.image)) return { ok: false, error: "bad item " + k };
    if (!Object.entries(it).every(([f, v]) => f === "image" || isFlat(v, 1200))) return { ok: false, error: "bad item " + k };
  }

  const qKeys = Object.keys(questions);
  if (!qKeys.length || qKeys.length > itemKeys.length * 3) return { ok: false, error: "at most 3 questions per item" };
  for (const k of qKeys) {
    const m = QUESTION_KEY.exec(k);
    const q = questions[k];
    if (!m || !(m[1] in state.items) || !isObj(q)) return { ok: false, error: "bad question " + k };
    const want = m[2] === "scam" ? "noul" : "score";
    if (q.type !== want || JSON.stringify(q).length > 4000) return { ok: false, error: "bad question " + k };
  }

  return { ok: true, body: { model: MODEL, state, questions }, items: itemKeys.length };
}

export function POST(req: Request) {
  return relay(req, { kind: "image", maxBody: MAX_BODY, check, upstream: UPSTREAM, timeoutMs: 55_000 });
}
