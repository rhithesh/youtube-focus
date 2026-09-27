import { charge, getStore, peek } from "@/lib/ratelimit";

// Free tier for the extension: the same System One request the extension would send to
// OpenRouter itself, forwarded with our key, behind per-install, per-IP and global limits.
// Nothing about the posts is stored or logged; only hashed counters are kept.

export const maxDuration = 30;

const UPSTREAM = process.env.JEV_UPSTREAM_URL || "https://openrouter.ai/api/v1/systemone";
const MODEL = process.env.FREE_MODEL || "jev-latest";
const MAX_BODY = 64_000; // a full 20-item batch is ~30KB
const MAX_ITEMS = 20;
const ITEM_KEY = /^v\d{1,2}$/;
const QUESTION_KEY = /^(v\d{1,2})_(bait|goal|junk)$/;
const INSTALL_ID = /^[A-Za-z0-9-]{8,64}$/;

const apiKey = () => process.env.OPENROUTER_API_KEY || process.env.JEV_API_KEY || "";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

function caller(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const raw = req.headers.get("x-feed-filter-install") || "";
  return { ip, install: INSTALL_ID.test(raw) ? raw : "ip:" + ip };
}

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
const isObj = (v: unknown): v is Record<string, Json> => !!v && typeof v === "object" && !Array.isArray(v);
const flatStrings = (o: Record<string, Json>, max: number) =>
  Object.values(o).every((v) => (typeof v === "string" ? v.length <= max : typeof v === "number" || typeof v === "boolean"));

/** Only the exact request shape the extension builds gets through; anything else is a 400. */
function validate(body: unknown): { ok: true; state: Record<string, Json>; questions: Record<string, Json>; items: number } | { ok: false; error: string } {
  if (!isObj(body) || !isObj(body.state) || !isObj(body.questions)) return { ok: false, error: "expected { state, questions }" };
  const { state, questions } = body;
  if (Object.keys(state).some((k) => k !== "my_goals" && k !== "items")) return { ok: false, error: "unexpected state key" };
  if (typeof state.my_goals !== "string" || state.my_goals.length > 2000) return { ok: false, error: "my_goals must be a string up to 2000 chars" };
  if (!isObj(state.items)) return { ok: false, error: "state.items must be an object" };

  const itemKeys = Object.keys(state.items);
  if (!itemKeys.length || itemKeys.length > MAX_ITEMS) return { ok: false, error: `1-${MAX_ITEMS} items per request` };
  for (const k of itemKeys) {
    const it = state.items[k];
    if (!ITEM_KEY.test(k) || !isObj(it) || Object.keys(it).length > 10 || !flatStrings(it, 1200)) return { ok: false, error: "bad item " + k };
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

  return { ok: true, state, questions, items: itemKeys.length };
}

export async function POST(req: Request) {
  if (!apiKey()) return json({ error: "free-tier-off", message: "The free tier is not configured on this server." }, 503);

  const text = await req.text();
  if (text.length > MAX_BODY) return json({ error: "too-large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad-json" }, 400);
  }
  const v = validate(body);
  if (!v.ok) return json({ error: "bad-request", message: v.error }, 400);

  const who = caller(req);
  let bill;
  try {
    bill = await charge(who.ip, who.install, v.items);
  } catch {
    // Fail closed: without working counters there is no spend limit.
    return json({ error: "unavailable", message: "Rate limiter unavailable." }, 503, { "Retry-After": "60" });
  }
  if (!bill.ok) {
    return json(
      { error: "limit", scope: bill.scope, limit: bill.limit, retryAfter: bill.retryAfter },
      429,
      { "Retry-After": String(bill.retryAfter) }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "X-Title": "Feed Filter (free tier)",
      },
      body: JSON.stringify({ model: MODEL, state: v.state, questions: v.questions }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });
  } catch {
    await bill.refund().catch(() => {});
    return json({ error: "upstream", message: "Could not reach the model." }, 502);
  }

  if (!upstream.ok) {
    await bill.refund().catch(() => {});
    const busy = upstream.status === 429 || upstream.status === 529;
    return json(
      { error: busy ? "busy" : "upstream", status: upstream.status },
      busy ? 503 : 502,
      busy ? { "Retry-After": upstream.headers.get("retry-after") || "5" } : {}
    );
  }

  const data = (await upstream.json()) as { answers?: unknown; model?: string; usage?: unknown };
  return json({ answers: data.answers ?? {}, model: data.model ?? MODEL, usage: data.usage }, 200, {
    "X-RateLimit-Limit": String(bill.limit),
    "X-RateLimit-Remaining": String(bill.remaining),
    "X-RateLimit-Reset": String(bill.resetSeconds),
  });
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
