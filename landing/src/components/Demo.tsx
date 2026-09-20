"use client";

import { RotateCcw } from "lucide-react";
import Image from "next/image";
import { ReactNode, useState } from "react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./Section";

type Scores = { bait: number; goal: number; junk: number; conf: number };

type LiveTile = {
  kind: "live";
  img: string;
  title: string;
  channel: string;
  meta: string;
  scores: Scores;
  span?: "2x2" | "2x1";
};

type CaptureTile = {
  kind: "capture";
  img: string;
  tag: "CLICK-BAIT" | "OFF-GOAL";
  why: string;
};

type QuoteTile = {
  kind: "quote";
  span?: 2;
  variant: "light" | "dark";
  label: string;
  main: ReactNode;
  sub: string;
};

type Tile = LiveTile | CaptureTile | QuoteTile;

const TILES: Tile[] = [
  {
    kind: "live",
    span: "2x2",
    img: "/tiles/live-3am.jpg",
    title: "3AM Observability Crash Course (A True Story)",
    channel: "pouria",
    meta: "753K views · 2w ago",
    scores: { bait: 1.2, goal: 0.5, junk: 0.05, conf: 0.9 },
  },
  {
    kind: "capture",
    img: "/tiles/cap-clickbait.jpg",
    tag: "CLICK-BAIT",
    why: "bait 2.04/3 · 90% conf",
  },
  {
    kind: "quote",
    variant: "light",
    label: "the promise",
    main: (
      <>
        Nothing is ever <em className="text-brand">deleted.</em>
      </>
    ),
    sub: "hover to peek · click through",
  },
  {
    kind: "capture",
    img: "/tiles/cap-offgoal-1.jpg",
    tag: "OFF-GOAL",
    why: "off-goal 2.98/3 · 98% conf",
  },
  {
    kind: "live",
    img: "/tiles/live-tiny.jpg",
    title: "This AI Startup Is Making Powerful AI Models (Desert Ant Labs)",
    channel: "Better Stack",
    meta: "125K views · 7d ago",
    scores: { bait: 1.6, goal: 1.4, junk: 0.12, conf: 0.72 },
  },
  {
    kind: "quote",
    span: 2,
    variant: "dark",
    label: "how it reads",
    main: (
      <>
        Your goals, <em className="text-brand">your</em> words — read against every listing on the page.
      </>
    ),
    sub: "20 listings · 60 questions · one request",
  },
  {
    kind: "capture",
    img: "/tiles/cap-offgoal-2.jpg",
    tag: "OFF-GOAL",
    why: "off-goal 2.95/3 · 95% conf",
  },
  {
    kind: "live",
    img: "/tiles/live-dsa.jpg",
    title: "How I Actually Mastered Data Structures and Algorithms (After Wasting 3 Years)",
    channel: "Rajat Garg",
    meta: "206K views · 3mo ago",
    scores: { bait: 0.8, goal: 1.1, junk: 0.08, conf: 0.85 },
  },
  {
    kind: "live",
    span: "2x1",
    img: "/tiles/live-physics.jpg",
    title: "Physics doesn't explain the universe. Computation does | Stephen Wolfram: Full Interview",
    channel: "Wolfram",
    meta: "54:08 · full interview",
    scores: { bait: 0.2, goal: 0.3, junk: 0.02, conf: 0.96 },
  },
  {
    kind: "quote",
    variant: "light",
    label: "the bill",
    main: (
      <>
        <span className="font-mono text-[0.85em] tracking-tight">≈ $0.00027</span> per page
      </>
    ),
    sub: "verdicts cached 7 days",
  },
  {
    kind: "capture",
    img: "/tiles/cap-offgoal-3.jpg",
    tag: "OFF-GOAL",
    why: "off-goal 3/3 · 100% conf",
  },
];

type Strict = { bait: number; goal: number; junk: number; conf: number };

function verdict(t: LiveTile, s: Strict) {
  const { bait, goal, junk, conf } = t.scores;
  if (junk >= s.junk) return { tag: "SPAM", why: `spam ${Math.round(junk * 100)}%` };
  if (bait >= s.bait && conf >= s.conf) return { tag: "CLICK-BAIT", why: `bait ${bait.toFixed(1)}/3 · ${Math.round(conf * 100)}% conf` };
  if (goal >= s.goal && conf >= s.conf) return { tag: "OFF-GOAL", why: `off-goal ${goal.toFixed(1)}/3 · ${Math.round(conf * 100)}% conf` };
  return null;
}

const DEFAULTS = { bait: 2.0, goalT: 2.6, blur: 80 };

function VerdictChip({ tag, why }: { tag: string; why: string }) {
  return (
    <span className="absolute left-2 top-2 z-10 rounded-[10px] bg-[#3f434b]/95 px-2 py-1.5 shadow-sm">
      <span className="block text-[10px] font-bold uppercase leading-tight tracking-[0.06em] text-white">{tag}</span>
      <span className="block text-[9.5px] leading-tight text-white/80 tabular-nums">{why}</span>
    </span>
  );
}

function LiveCard({ t, v, blurPx }: { t: LiveTile; v: { tag: string; why: string } | null; blurPx: number }) {
  const frosted = !!v;
  const big = t.span === "2x2";
  const wide = t.span === "2x1";
  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-lg border border-line bg-white ${
        big ? "col-span-2 row-span-2" : wide ? "col-span-2" : ""
      }`}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Image
          src={t.img}
          alt=""
          fill
          sizes="(min-width: 1024px) 24rem, 50vw"
          className="absolute inset-0 object-cover"
          draggable={false}
        />
        {frosted && (
          <div
            className="ygf-veil absolute inset-0 transition-opacity duration-200 group-hover:opacity-0"
            style={{ backdropFilter: `blur(${blurPx}px) saturate(1.05)`, WebkitBackdropFilter: `blur(${blurPx}px) saturate(1.05)` }}
          />
        )}
        {v && <VerdictChip tag={v.tag} why={v.why} />}
        {v && (
          <span className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] text-white backdrop-blur transition-opacity duration-200 group-hover:opacity-0">
            hover to peek
          </span>
        )}
      </div>
      <div className={`shrink-0 ${big ? "p-3.5" : "p-2.5"}`}>
        <p className={`font-semibold leading-snug ${big ? "line-clamp-2 text-[15px]" : "line-clamp-2 text-[12.5px]"}`}>{t.title}</p>
        <p className={`mt-0.5 truncate text-muted ${big ? "text-[11.5px]" : "text-[10.5px]"}`}>
          {t.channel} · {t.meta}
        </p>
        <p className={`mt-1 font-mono text-muted/70 ${big ? "text-[11px]" : "text-[9.5px]"}`}>
          {v ? (
            <span className="font-semibold text-brand">{v.why}</span>
          ) : (
            `clean · bait ${t.scores.bait.toFixed(1)} · junk ${Math.round(t.scores.junk * 100)}%`
          )}
        </p>
      </div>
    </div>
  );
}

function CaptureCard({ t }: { t: CaptureTile }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Image
          src={t.img}
          alt={`${t.tag} — ${t.why}`}
          fill
          sizes="(min-width: 1024px) 24rem, 50vw"
          className="absolute inset-0 object-cover"
          draggable={false}
        />
      </div>
      <div className="shrink-0 p-2.5">
        <p className="text-[12.5px] font-semibold leading-snug">Blocked in a live session</p>
        <p className="mt-0.5 font-mono text-[9.5px] text-muted">{t.why}</p>
      </div>
    </div>
  );
}

function QuoteCard({ t }: { t: QuoteTile }) {
  const dark = t.variant === "dark";
  return (
    <div
      className={`flex flex-col justify-between overflow-hidden rounded-lg border p-4 ${
        t.span === 2 ? "col-span-2" : ""
      } ${dark ? "border-ink bg-ink text-white" : "border-line bg-paper text-ink"}`}
    >
      <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${dark ? "text-white/50" : "text-muted"}`}>
        {t.label}
      </p>
      <p className="font-display text-[clamp(17px,1.7vw,21px)] leading-[1.25] tracking-[-0.01em]">{t.main}</p>
      <p className={`font-mono text-[10px] ${dark ? "text-white/60" : "text-muted"}`}>{t.sub}</p>
    </div>
  );
}

export function Demo() {
  const [goals, setGoals] = useState(
    "Learning Rust, databases and distributed systems. Strength training + cooking. No drama, no hustle content, no gaming."
  );
  const [bait, setBait] = useState(DEFAULTS.bait);
  const [goalT, setGoalT] = useState(DEFAULTS.goalT);
  const [blur, setBlur] = useState(DEFAULTS.blur);
  const [enabled, setEnabled] = useState(true);

  const strict: Strict = { bait, goal: goalT, junk: 0.85, conf: 0.5 };
  const shown = TILES.filter((t) => t.kind !== "capture" || enabled);
  const totalTiles = shown.filter((t) => t.kind !== "quote").length;
  const blocked = shown.reduce((n, t) => n + (t.kind === "capture" || (t.kind === "live" && verdict(t, strict)) ? 1 : 0), 0);
  const blurPx = Math.max(2, Math.round(blur * 0.2));

  const sliders = [
    { label: "Clickbait blocks at", value: bait, min: 0.5, max: 3, step: 0.1, set: setBait, fmt: (v: number) => `${v.toFixed(1)}/3` },
    { label: "Off-goal blocks at", value: goalT, min: 0.5, max: 3, step: 0.1, set: setGoalT, fmt: (v: number) => `${v.toFixed(1)}/3` },
    { label: "Frost strength", value: blur, min: 0, max: 100, step: 5, set: setBlur, fmt: (v: number) => `${v}%` },
  ];

  return (
    <section id="demo" className="py-16 sm:py-20 ">
      <div className="mx-auto max-w-6xl px-5 flex flex-col ">
        <Reveal>
          <SectionHead
            n="02"
            label="Live demo"
            title={
              <>
                Drag the strictness.
                <br />
                Watch the feed <em className="text-brand">obey.</em>
              </>
            }
            lede={
              <>
                This is the real rubric from the extension — bait, goal-fit and spam thresholds,
                confidence-gated exactly like <span className="font-mono text-[13px] text-ink">background.js</span>.
              </>
            }
          />
        </Reveal>

        <div className="mt-10 grid gap-6 max-w-xl">
          {/* controls */}
          <Reveal>
            <div className="rounded-lg  bg-white">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <button
                  onClick={() => setEnabled(!enabled)}
                  aria-pressed={enabled}
                  className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider"
                >
                  <span className={enabled ? "text-ink" : "text-muted"}>{enabled ? "Filtering on" : "Paused"}</span>
                  <span className={`relative h-4 w-8 rounded-full transition-colors ${enabled ? "bg-brand" : "bg-line"}`}>
                    <span
                      className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${enabled ? "left-[18px]" : "left-0.5"}`}
                    />
                  </span>
                </button>
              </div>




            </div>
          </Reveal>

          {/* feed — bento of real captures, live tiles and quotes */}
          <Reveal delay={0.1} className="mr-auto w-full max-w-xl">
            <div className="  bg-white">
              {/*<div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="font-mono text-[11px] text-muted">
                  {enabled ? "drag the sliders — hover frosted live tiles to peek" : "filtering paused — live tiles unjudged"}
                </span>
                <span className="font-mono text-[11px] text-muted">youtube.com/</span>
              </div>*/}
              <div className="grid grid-flow-row-dense grid-cols-2 auto-rows-[150px] gap-3 p-3 sm:auto-rows-[172px] lg:auto-rows-[196px] lg:grid-cols-4">
                {shown.map((t) => {
                  if (t.kind === "live") return <LiveCard key={t.img} t={t} v={verdict(t, strict)} blurPx={blurPx} />;
                  if (t.kind === "capture") return <CaptureCard key={t.img} t={t} />;
                  return <QuoteCard key={t.label} t={t} />;
                })}
              </div>

            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
