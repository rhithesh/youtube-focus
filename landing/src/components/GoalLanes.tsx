"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { GOAL_FEED, GOALS, type GoalKey } from "@/lib/feed";
import { FeedCard } from "./FeedCard";
import { Kicker, Mark, Reveal } from "./ui";

const KEYS = Object.keys(GOALS) as GoalKey[];
const SPRING = { type: "spring", stiffness: 260, damping: 30 } as const;

function Typed({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(text.length);
  useEffect(() => {
    if (reduce) return;
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setN(Math.min(i, text.length));
      if (i >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text, reduce]);
  const shown = reduce ? text.length : n;
  return (
    <>
      {text.slice(0, shown)}
      <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse bg-ink" />
    </>
  );
}

function Lane({ title, count, children, className = "" }: { title: string; count: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-baseline justify-between border-b border-ink/10 pb-2">
        <p className="text-[14px] font-medium">{title}</p>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={count}
            className="font-serif text-[28px] leading-none"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {count}
          </motion.span>
        </AnimatePresence>
      </div>
      {children}
    </div>
  );
}

export function GoalLanes() {
  const [goal, setGoal] = useState<GoalKey>("interviews");
  const g = GOALS[goal];
  const blurred = new Set(g.blurred);
  const kept = GOAL_FEED.filter((i) => !blurred.has(i.id));
  const noise = GOAL_FEED.filter((i) => blurred.has(i.id));

  const card = (id: string, isBlurred: boolean) => {
    const item = GOAL_FEED.find((i) => i.id === id)!;
    return (
      <motion.div key={id} layoutId={"lane-" + id} layout transition={SPRING}>
        <FeedCard item={item} blurred={isBlurred} delay={0.25} />
      </motion.div>
    );
  };

  return (
    <section id="goals" className="mx-auto max-w-[1200px] px-5 pt-24 sm:pt-36">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
        <Reveal>
          <Kicker>Your goals, not a keyword list</Kicker>
          <h2 className="mt-4 font-serif text-[clamp(44px,6.4vw,84px)] leading-[0.95] tracking-[-0.02em]">
            Same feed.
            <br />
            Different <Mark>you.</Mark>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="max-w-[460px] text-[17px] leading-relaxed text-muted">
            A sourdough thread is noise when you&rsquo;re cramming for interviews and gold when you&rsquo;re
            learning to bake. Pick a goal and watch the same nine posts sort themselves. Bait gets blurred for
            everyone.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.1} className="mt-12 rounded-[28px] border border-ink/10 bg-card p-3 shadow-[0_20px_60px_-30px_rgba(22,21,15,0.35)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          <div role="radiogroup" aria-label="Goal" className="flex shrink-0 flex-wrap gap-1 rounded-2xl bg-paper p-1">
            {KEYS.map((k) => (
              <button
                key={k}
                role="radio"
                aria-checked={goal === k}
                onClick={() => setGoal(k)}
                className={`relative whitespace-nowrap rounded-xl px-4 py-2.5 text-[14px] font-medium transition-colors ${goal === k ? "text-paper" : "text-muted hover:text-ink"}`}
              >
                {goal === k && <motion.span layoutId="goal-pill" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <span className="relative">{GOALS[k].label}</span>
              </button>
            ))}
          </div>
          <div className="flex min-h-[52px] flex-1 items-center rounded-2xl border border-ink/10 px-4 py-2.5 text-[15px] leading-snug">
            <span className="mr-2 shrink-0 text-muted">My goal:</span>
            <span className="min-w-0">
              <Typed key={goal} text={g.text} />
            </span>
          </div>
        </div>
      </Reveal>

      <LayoutGroup>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
          <Lane title="Gets through" count={kept.length} className="col-span-2 lg:col-span-1">
            <div className="grid grid-cols-2 items-start gap-4 lg:grid-cols-1">
              {kept.map((i) => card(i.id, false))}
            </div>
          </Lane>
          <Lane title="Blurred for you" count={noise.length} className="col-span-2">
            <div className="grid grid-cols-2 items-start gap-4">{noise.map((i) => card(i.id, true))}</div>
          </Lane>
        </div>
      </LayoutGroup>
      <p className="mt-6 text-[13px] text-muted">
        Real verdicts, one request per goal. In the extension nothing moves: blurred posts stay in place in your feed.
      </p>
    </section>
  );
}
