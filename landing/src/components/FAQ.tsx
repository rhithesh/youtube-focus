"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Kicker, Reveal } from "./ui";

const FAQS = [
  {
    q: "Does it delete or hide anything?",
    a: "No. Flagged posts are blurred where they are. Hover one and the blur lifts so you can read it and click through. Switch the filter off from the toolbar and every blur is gone at once.",
  },
  {
    q: "Where does it work?",
    a: "YouTube (home, search, the watch-next sidebar and Shorts), your X timeline and your LinkedIn feed. You can switch each one off separately in settings.",
  },
  {
    q: "What does it cost?",
    a: "Nothing, to start. Without a key, Feed Filter’s free tier judges up to 300 posts a day, and verdicts are cached for a week so scrolling back past something doesn’t count again. Want unlimited? Bring your own OpenRouter key: about $0.0003 for a page of ten posts. If the free tier is ever used up, keyword rules keep catching the obvious bait until it resets.",
  },
  {
    q: "Where do my posts and goals go?",
    a: "On the free tier, the text of each post and your goals pass through Feed Filter’s server on their way to the model; nothing is stored or logged, only an anonymous daily counter. With your own key, they go straight from your browser to OpenRouter or TypeSafe and Feed Filter never sees them. Settings and keys live in your browser (chrome.storage.local).",
  },
  {
    q: "What won’t it catch?",
    a: "The model reads text, not images, so a calm title over a screaming thumbnail gets through, and X posts with no text aren’t judged. Hover needs a mouse. And all three sites change their pages often, so the extension may occasionally need an update.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-[1200px] px-5 pt-24 sm:pt-36">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <Reveal>
          <Kicker>FAQ</Kicker>
          <h2 className="mt-4 font-serif text-[clamp(44px,6.4vw,84px)] leading-[0.95] tracking-[-0.02em]">
            Fair questions.
          </h2>
        </Reveal>
        <div className="space-y-2.5">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={f.q}
                layout
                className={`overflow-hidden rounded-2xl border transition-colors ${isOpen ? "border-ink/15 bg-card" : "border-transparent bg-ink/[0.035] hover:bg-ink/[0.06]"}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 px-5 py-4 text-left text-[17px] font-medium"
                >
                  {f.q}
                  <motion.span
                    aria-hidden
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-[18px] leading-none ${isOpen ? "bg-lime" : "bg-card"}`}
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                    >
                      <p className="max-w-[600px] px-5 pb-5 text-[15.5px] leading-relaxed text-muted">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
