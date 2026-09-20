"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./Section";
import { CHIP, DEMO_TILES, TileCard, Thumb, Verdict } from "./FeedTile";

type Strict = { bait: number; goal: number; junk: number; conf: number };

function verdict(t: Thumb & { bait: number; goal: number; junk: number; conf: number }, s: Strict): Verdict | null {
  if (t.junk >= s.junk) return { tag: "SPAM", cls: CHIP.SPAM, why: `spam ${Math.round(t.junk * 100)}%` };
  if (t.bait >= s.bait && t.conf >= s.conf)
    return { tag: "CLICK-BAIT", cls: CHIP["CLICK-BAIT"], why: `bait ${t.bait.toFixed(1)}/3 · ${Math.round(t.conf * 100)}% conf` };
  if (t.goal >= s.goal && t.conf >= s.conf)
    return { tag: "OFF-GOAL", cls: CHIP["OFF-GOAL"], why: `off-goal ${t.goal.toFixed(1)}/3 · ${Math.round(t.conf * 100)}% conf` };
  return null;
}

const DEFAULTS = { bait: 2.0, goalT: 2.6, blur: 80 };

export function Demo() {
  const [goals, setGoals] = useState(
    "Learning Rust, databases and distributed systems. Strength training + cooking. No drama, no hustle content, no gaming."
  );
  const [bait, setBait] = useState(DEFAULTS.bait);
  const [goalT, setGoalT] = useState(DEFAULTS.goalT);
  const [blur, setBlur] = useState(DEFAULTS.blur);
  const [enabled, setEnabled] = useState(true);

  const strict: Strict = { bait, goal: goalT, junk: 0.85, conf: 0.5 };
  const judged = DEMO_TILES.map((t) => ({ t, v: enabled ? verdict(t, strict) : null }));
  const blocked = judged.filter((j) => j.v).length;
  const blurPx = Math.max(2, Math.round(blur * 0.2));

  const sliders = [
    { label: "Clickbait blocks at", value: bait, min: 0.5, max: 3, step: 0.1, set: setBait, fmt: (v: number) => `${v.toFixed(1)}/3` },
    { label: "Off-goal blocks at", value: goalT, min: 0.5, max: 3, step: 0.1, set: setGoalT, fmt: (v: number) => `${v.toFixed(1)}/3` },
    { label: "Frost strength", value: blur, min: 0, max: 100, step: 5, set: setBlur, fmt: (v: number) => `${v}%` },
  ];

  return (
    <section id="demo" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
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

        <div className="mt-10 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* controls */}
          <Reveal>
            <div className="rounded-lg border border-line bg-white">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Controls</span>
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

              <div className="px-5 py-5">
                <label className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">My goals</label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-md border border-line bg-paper p-3 text-[13px] leading-relaxed text-ink outline-none focus:border-brand"
                />

                {sliders.map((s) => (
                  <div key={s.label} className="mt-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[13px] font-medium">{s.label}</span>
                      <span className="font-mono text-[12px] tabular-nums text-ink">{s.fmt(s.value)}</span>
                    </div>
                    <input
                      type="range"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={s.value}
                      onChange={(e) => s.set(Number(e.target.value))}
                      className="mt-1.5 w-full"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-line px-5 py-4">
                <p className="text-[26px] font-semibold tabular-nums leading-none">
                  {blocked}
                  <span className="text-[13px] font-normal text-muted">/{DEMO_TILES.length} frosted</span>
                </p>
                <button
                  onClick={() => {
                    setBait(DEFAULTS.bait);
                    setGoalT(DEFAULTS.goalT);
                    setBlur(DEFAULTS.blur);
                    setEnabled(true);
                  }}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted transition-colors hover:text-ink"
                >
                  <RotateCcw className="size-3" /> Reset
                </button>
              </div>
            </div>
          </Reveal>

          {/* feed */}
          <Reveal delay={0.1}>
            <div className="rounded-lg border border-line bg-white">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="font-mono text-[11px] text-muted">
                  {enabled ? "hover any frosted tile to peek" : "filtering paused — everything visible"}
                </span>
                <span className="font-mono text-[11px] text-muted">youtube.com/</span>
              </div>
              <div className="nice-scroll grid max-h-[560px] gap-4 overflow-y-auto p-4 sm:grid-cols-2">
                {judged.map(({ t, v }) => (
                  <TileCard key={t.id} t={t} frosted={!!v} blurPx={blurPx} tag={v} why={v ? v.why : `clean · bait ${t.bait.toFixed(1)} · junk ${Math.round(t.junk * 100)}%`} />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
