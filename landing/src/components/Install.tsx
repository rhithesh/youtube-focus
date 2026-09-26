"use client";

import { motion } from "motion/react";
import { btn, Kicker, Mark, Reveal } from "./ui";

const STEPS = [
  <>Download the zip and unzip it.</>,
  <>
    Open <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[13px]">chrome://extensions</code> and turn on Developer mode.
  </>,
  <>Click Load unpacked and pick the unzipped folder.</>,
  <>Settings open by themselves. Write your goals, paste an OpenRouter key, hit Save.</>,
  <>Reload any open YouTube, X or LinkedIn tab.</>,
];

export function Install() {
  return (
    <section id="install" className="mx-auto max-w-[1200px] px-5 pt-24 sm:pt-36">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <Reveal>
          <Kicker>Install</Kicker>
          <h2 className="mt-4 font-serif text-[clamp(44px,6.4vw,84px)] leading-[0.95] tracking-[-0.02em]">
            Two minutes. Then <Mark>forget</Mark> it&rsquo;s there.
          </h2>
          <p className="mt-6 max-w-[440px] text-[17px] leading-relaxed text-muted">
            Works in Chrome, Brave, Edge, Arc and any other Chromium browser. No key yet? Built-in keyword
            rules still catch obvious bait and scams. Matching your goals needs the model.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/feed-filter.zip" download className={btn.ink}>
              Download feed-filter.zip
              <span aria-hidden>↓</span>
            </a>
            <a href="https://github.com/rhithesh/youtube-focus" target="_blank" rel="noreferrer" className={btn.ghost}>
              Source on GitHub
            </a>
          </div>
        </Reveal>

        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={i}
              className="flex items-start gap-4 rounded-2xl border border-ink/10 bg-card p-4 sm:p-5"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime font-serif text-[18px]">{i + 1}</span>
              <span className="pt-1 text-[16px] leading-relaxed">{s}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
