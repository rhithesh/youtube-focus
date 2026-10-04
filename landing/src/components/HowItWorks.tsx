"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { HERO_GOAL, ITEMS, SAMPLE_ANSWERS } from "@/lib/feed";
import { FeedCard } from "./FeedCard";
import { Kicker, Mark, Reveal } from "./ui";

/** Types the goal out, holds it, clears it, repeats. */
function GoalVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    let i = 0;
    let hold = 0;
    const id = setInterval(() => {
      if (i < HERO_GOAL.length) setN(++i);
      else if (++hold > 60) {
        i = 0;
        hold = 0;
        setN(0);
      }
    }, 45);
    return () => clearInterval(id);
  }, [inView, reduce]);

  return (
    <div ref={ref} className="flex h-full flex-col justify-center p-5">
      <p className="text-[12px] font-medium text-muted">What do you actually want out of your feeds?</p>
      <div className="mt-2 min-h-[120px] rounded-xl border border-ink/15 bg-card p-3.5 text-[15px] leading-relaxed">
        {reduce ? HERO_GOAL : HERO_GOAL.slice(0, n)}
        <span aria-hidden className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] animate-pulse bg-ink" />
      </div>
      <p className="mt-2 text-[12px] text-muted">Say what you don&rsquo;t want, too.</p>
    </div>
  );
}

/** Two real items go out in one request; their real scores come back. */
function RequestVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const row = (i: number) => ({
    initial: { opacity: 0, x: -10 },
    animate: inView ? { opacity: 1, x: 0 } : {},
    transition: { duration: 0.45, delay: 0.2 + i * 0.35 },
  });
  return (
    <div ref={ref} className="flex h-full flex-col justify-center gap-2 p-5 font-mono text-[11.5px] leading-relaxed">
      <motion.p {...row(0)} className="text-paper/50">
        POST /api/v1/systemone · 1 request
      </motion.p>
      {SAMPLE_ANSWERS.map((a, i) => (
        <motion.div key={a.key} {...row(i + 1)} className="rounded-lg bg-night-2 p-2.5">
          <p className="truncate text-paper/80">“{a.text}”</p>
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-paper/50">
            <span>
              bait <span className="text-paper">{a.bait.toFixed(2)}</span>
            </span>
            <span>
              off-goal <span className="text-paper">{a.goal.toFixed(2)}</span>
            </span>
            <span>
              spam <span className="text-paper">{a.junk.toFixed(2)}</span>
            </span>
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ delay: 1.4 + i * 0.3 }}
            className={`mt-1.5 inline-block rounded px-1.5 font-sans text-[11px] font-medium ${a.blurred ? "bg-lime text-ink" : "bg-paper/10 text-paper/80"}`}
          >
            {a.blurred ? "→ blur" : "→ keep"}
          </motion.p>
        </motion.div>
      ))}
    </div>
  );
}

const LOOP = 5;
const TIMES = [0, 0.25, 0.4, 0.7, 0.85, 1];

/** A cursor drifts onto a blurred post, the blur lifts, the cursor leaves, it blurs again. */
function PeekVisual() {
  const reduce = useReducedMotion();
  const item = ITEMS["li-fired"];
  const loop = { duration: LOOP, times: TIMES, repeat: Infinity, ease: "easeInOut" as const };
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden p-5">
      <div className="pointer-events-none w-full max-w-[280px]">
        <div className="relative">
          <FeedCard item={item} blurred={false} showGlyph={false} />
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-2xl"
            style={{ backdropFilter: "blur(7px) saturate(0.6)", WebkitBackdropFilter: "blur(7px) saturate(0.6)", background: "rgba(243,240,232,0.3)" }}
            animate={reduce ? { opacity: 1 } : { opacity: [1, 1, 0, 0, 1, 1] }}
            transition={loop}
          />
        </div>
      </div>
      {!reduce && (
        <motion.svg
          viewBox="0 0 24 24"
          className="absolute left-0 top-0 size-6 drop-shadow"
          aria-hidden
          animate={{ x: [300, 300, 150, 150, 300, 300], y: [260, 260, 110, 110, 260, 260] }}
          transition={loop}
        >
          <path d="M4 2l15 9.5-6.6 1.4 3.8 7.4-2.7 1.4-3.8-7.5L4 19z" fill="#16150f" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
        </motion.svg>
      )}
    </div>
  );
}

const STEPS = [
  {
    title: "Write what you want.",
    body: "Plain words, the way you’d tell a friend. It’s saved in your browser and only sent along with the posts being judged.",
    visual: <GoalVisual />,
    dark: false,
  },
  {
    title: "One request judges the page.",
    body: "Every post becomes text and goes to TypeSafe’s Jev model at once: is it bait, is it on-goal, is it spam. About a second.",
    visual: <RequestVisual />,
    dark: true,
  },
  {
    title: "Noise blurs. Nothing’s deleted.",
    body: "Your thresholds decide what blurs. Hover to read anything anyway and click through as normal.",
    visual: <PeekVisual />,
    dark: false,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1200px] px-5 pt-24 sm:pt-36">
      <Reveal>
        <Kicker>How it works</Kicker>
        <h2 className="mt-4 max-w-[820px] font-serif text-[clamp(44px,6.4vw,84px)] leading-[0.95] tracking-[-0.02em]">
          Three steps, and the <Mark>first</Mark> is the only one you do.
        </h2>
      </Reveal>
      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.1}>
            <div className="flex h-full flex-col rounded-[28px] border border-ink/10 bg-card p-2">
              <div className={`h-[260px] overflow-hidden rounded-[22px] ${s.dark ? "bg-night text-paper" : "bg-paper"}`}>{s.visual}</div>
              <div className="p-4 pt-5">
                <p className="font-serif text-[15px] italic text-muted">Step {i + 1}</p>
                <h3 className="mt-1 text-[20px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
