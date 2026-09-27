import { createHash } from "node:crypto";

// Counters for the free tier. Upstash Redis (REST) when it's configured, so limits hold
// across every serverless instance; otherwise an in-process Map, which only limits per
// instance and resets on cold starts. Good enough to develop against, not to rely on.

type Store = {
  kind: "redis" | "memory";
  /** Add `by` to each key (creating it with a TTL) and return the new totals. */
  incr(entries: { key: string; by: number; ttl: number }[]): Promise<number[]>;
  get(keys: string[]): Promise<number[]>;
};

function redisStore(url: string, token: string): Store {
  const pipeline = async (commands: (string | number)[][]) => {
    const res = await fetch(url.replace(/\/$/, "") + "/pipeline", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`rate-limit store: ${res.status}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    return out.map((r) => {
      if (r.error) throw new Error(`rate-limit store: ${r.error}`);
      return r.result;
    });
  };
  return {
    kind: "redis",
    async incr(entries) {
      const cmds = entries.flatMap((e) => [
        ["INCRBY", e.key, e.by],
        ["EXPIRE", e.key, e.ttl, "NX"],
      ]);
      const results = await pipeline(cmds);
      return entries.map((_, i) => Number(results[i * 2]));
    },
    async get(keys) {
      if (!keys.length) return [];
      const [values] = await pipeline([["MGET", ...keys]]);
      return (values as (string | null)[]).map((v) => Number(v ?? 0));
    },
  };
}

function memoryStore(): Store {
  const m = new Map<string, { n: number; exp: number }>();
  const read = (key: string) => {
    const e = m.get(key);
    if (e && e.exp > Date.now()) return e;
    m.delete(key);
    return null;
  };
  return {
    kind: "memory",
    async incr(entries) {
      return entries.map(({ key, by, ttl }) => {
        const e = read(key) ?? { n: 0, exp: Date.now() + ttl * 1000 };
        e.n += by;
        m.set(key, e);
        return e.n;
      });
    },
    async get(keys) {
      return keys.map((k) => read(k)?.n ?? 0);
    },
  };
}

let store: Store | null = null;
export function getStore(): Store {
  if (store) return store;
  // The Vercel Marketplace Upstash integration exposes KV_REST_API_*; a direct Upstash setup uses UPSTASH_*.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  store = url && token ? redisStore(url, token) : memoryStore();
  return store;
}

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);

// Items are the unit: one feed post = 3 questions ≈ $0.00003 of Jev input.
export const LIMITS = {
  installPerDay: num(process.env.FREE_INSTALL_ITEMS_PER_DAY, 300),
  ipPerDay: num(process.env.FREE_IP_ITEMS_PER_DAY, 1000),
  ipRequestsPerMinute: num(process.env.FREE_IP_REQUESTS_PER_MINUTE, 20),
  globalPerDay: num(process.env.FREE_GLOBAL_ITEMS_PER_DAY, 20000),
};

// Raw IPs never reach the store.
export function hashId(value: string) {
  return createHash("sha256")
    .update((process.env.RATE_LIMIT_SALT || "feed-filter") + ":" + value)
    .digest("base64url")
    .slice(0, 22);
}

function buckets(now = Date.now()) {
  const d = new Date(now);
  const day = d.toISOString().slice(0, 10);
  const nextMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return {
    day,
    minute: Math.floor(now / 60000),
    secondsToMidnight: Math.ceil((nextMidnight - now) / 1000),
    secondsToNextMinute: 60 - (Math.floor(now / 1000) % 60),
  };
}

export type Verdict =
  | { ok: true; remaining: number; limit: number; resetSeconds: number; refund: () => Promise<void> }
  | { ok: false; scope: "install" | "ip" | "burst" | "global"; retryAfter: number; limit: number };

/**
 * Charge `items` against every limit at once. If any limit is exceeded the whole charge
 * is rolled back, so a rejected request costs the caller nothing.
 */
export async function charge(ip: string, install: string, items: number): Promise<Verdict> {
  const s = getStore();
  const b = buckets();
  const ipId = hashId(ip);
  const dayTtl = b.secondsToMidnight + 60;

  const entries = [
    { scope: "install" as const, key: `ff:i:${b.day}:${hashId(install)}`, by: items, ttl: dayTtl, limit: LIMITS.installPerDay },
    { scope: "ip" as const, key: `ff:ip:${b.day}:${ipId}`, by: items, ttl: dayTtl, limit: LIMITS.ipPerDay },
    { scope: "burst" as const, key: `ff:m:${b.minute}:${ipId}`, by: 1, ttl: 120, limit: LIMITS.ipRequestsPerMinute },
    { scope: "global" as const, key: `ff:g:${b.day}`, by: items, ttl: dayTtl, limit: LIMITS.globalPerDay },
  ];

  const totals = await s.incr(entries);
  const refund = () => s.incr(entries.map((e) => ({ key: e.key, by: -e.by, ttl: e.ttl }))).then(() => undefined);

  const over = entries.findIndex((e, i) => totals[i] > e.limit);
  if (over !== -1) {
    await refund();
    const e = entries[over];
    return { ok: false, scope: e.scope, limit: e.limit, retryAfter: e.scope === "burst" ? b.secondsToNextMinute : b.secondsToMidnight };
  }

  return {
    ok: true,
    limit: LIMITS.installPerDay,
    remaining: Math.max(0, LIMITS.installPerDay - totals[0]),
    resetSeconds: b.secondsToMidnight,
    refund,
  };
}

/** How much of today's allowance this install has left, without charging anything. */
export async function peek(install: string) {
  const b = buckets();
  const [used] = await getStore().get([`ff:i:${b.day}:${hashId(install)}`]);
  return { limit: LIMITS.installPerDay, remaining: Math.max(0, LIMITS.installPerDay - used), resetSeconds: b.secondsToMidnight };
}
