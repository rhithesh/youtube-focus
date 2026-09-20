"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { HERO_TILES, TileCard } from "./FeedTile";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section id="top" className="relative pt-32 sm:pt-40">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            <span className="text-brand">01</span> · A Chrome extension, judged by Jev
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="mt-6 max-w-4xl font-display text-[clamp(56px,9vw,118px)] leading-[0.92] tracking-[-0.01em]">
            Your feed, <em className="text-brand">frosted.</em>
          </h1>
        </Reveal>

        <div className="mt-10 flex flex-col justify-between gap-8 border-t border-line pt-8 md:flex-row md:items-end">
          <Reveal delay={0.15}>
            <p className="max-w-md text-[17px] leading-relaxed text-muted">
              Feed Filter frosts over the clickbait, scams and off-goal noise on YouTube —
              judged against goals <span className="text-ink">you</span> write yourself.
              Hover to peek. Nothing is ever deleted.
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <motion.a
                whileHover={{ y: -2 }}
                href="#install"
                className="rounded-lg bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand"
              >
                Download the extension
              </motion.a>
              <a href="#demo" className="group inline-flex items-center gap-1.5 px-1 py-3 text-[14px] font-medium text-muted hover:text-ink">
                See it judge
                <ArrowDown className="size-3.5 transition-transform group-hover:translate-y-0.5" />
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.28}>
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {HERO_TILES.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.6 }}
              >
                <TileCard
                  t={t}
                  frosted={i === 0 || i === 2}
                  tag={i === 0 ? { tag: "SPAM", cls: "bg-spam", why: "" } : i === 2 ? { tag: "CLICK-BAIT", cls: "bg-brand", why: "" } : null}
                />
              </motion.div>
            ))}
          </div>
          <p className="mt-4 font-mono text-[11.5px] text-muted">
            one request judges the whole page — 20 listings · 60 questions · ~6.4k tokens · ~950ms · $0.00027
          </p>
        </Reveal>
      </div>
    </section>
  );
}
