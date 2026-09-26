"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { btn, Logo } from "./ui";

export function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const blur = useTransform(scrollYProgress, [0, 0.5], [14, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);

  return (
    <section className="px-3 pt-32 sm:px-5 sm:pt-44">
      <motion.div ref={ref} style={{ scale }} className="mx-auto max-w-[1320px] overflow-hidden rounded-[36px] bg-lime px-6 py-20 text-center sm:py-28">
        <motion.h2 style={{ filter }} className="font-serif text-[clamp(56px,11vw,160px)] leading-[0.88] tracking-[-0.03em]">
          Get your
          <br />
          <span className="italic">feed back.</span>
        </motion.h2>
        <p className="mx-auto mt-7 max-w-[420px] text-[17px] leading-relaxed text-ink/70">
          Free, with the source on GitHub. A heavy day of scrolling costs a few cents.
        </p>
        <div className="mt-9 flex justify-center">
          <a href="#install" className={btn.ink}>
            Add to Chrome, free
            <span aria-hidden>→</span>
          </a>
        </div>
      </motion.div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto mt-16 max-w-[1200px] px-5 pb-24 sm:pb-12">
      <div className="flex flex-col gap-4 border-t border-ink/10 pt-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <Logo className="text-[15px] text-ink" />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a href="https://github.com/rhithesh/youtube-focus" target="_blank" rel="noreferrer" className="hover:text-ink">
            GitHub
          </a>
          <a href="https://docs.typesafe.ai" target="_blank" rel="noreferrer" className="hover:text-ink">
            TypeSafe Jev
          </a>
          <span>Not affiliated with YouTube, X or LinkedIn.</span>
        </div>
      </div>
    </footer>
  );
}
