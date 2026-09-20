"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./Section";

const faqs = [
  {
    q: "Does it delete or hide videos?",
    a: "Never. Flagged tiles get a frosted veil and a corner chip (CLICK-BAIT blue, SPAM red, OFF-GOAL slate). Hover and the blur fades in 0.18s so you can read and click through — the chip stays dimmed so you always know what was flagged. Set blur to 0 to keep tags with no frosting.",
  },
  {
    q: "What does it cost to run?",
    a: "Input is $0.042 / Mtok and output tokens are free. Measured: 10 listings (30 questions, 6.4k tokens) came back in ~950ms for $0.00027. A 20-listing batch is ~$0.0005. Verdicts cache for 7 days, so repeat visits are free.",
  },
  {
    q: "Where does my API key go?",
    a: "chrome.storage.local in your browser only, sent solely to the endpoint you pick — OpenRouter (openrouter.ai/api/v1/systemone) or TypeSafe direct (api.typesafe.ai/v1/systemone). With no key, keyword heuristics handle obvious bait and scams, but goal-alignment needs Jev.",
  },
  {
    q: "Why did bait get tagged SPAM (or vice versa)?",
    a: "Clickbait titles score 0.45–0.75 on the spam question because low-effort filler overlaps with bait; real scams score 0.9+. That's why the spam gate defaults to 0.85 and SPAM outranks CLICK-BAIT outranks OFF-GOAL. Every block is confidence-gated — raise Minimum confidence if you see false blocks.",
  },
  {
    q: "What doesn't it cover?",
    a: "Jev is text-only, so thumbnails are never examined. Hover-to-clear needs a pointer (touch taps go straight through). Shorts feed tiles are filtered, but the immersive /shorts/ swipe player isn't. If YouTube's DOM shifts, tile selectors may need updating.",
  },
  {
    q: "How do I get it?",
    a: "Download feed-filter.zip in the Install section, open chrome://extensions, enable Developer mode, Load unpacked, pick the folder. Settings opens on install — write goals, paste a key, run a test call, save, reload YouTube.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHead
            n="07"
            label="FAQ"
            title={
              <>
                Fair <em className="text-brand">questions.</em>
              </>
            }
          />
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-10 max-w-3xl">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="border-t border-line last:border-b">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className={`text-[15.5px] font-medium tracking-tight transition-colors ${isOpen ? "text-ink" : "text-ink/80 group-hover:text-ink"}`}>
                      {f.q}
                    </span>
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25 }} className="shrink-0 text-muted">
                      <Plus className="size-4" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.21, 0.65, 0.16, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-2xl pb-6 text-[14.5px] leading-relaxed text-muted">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
