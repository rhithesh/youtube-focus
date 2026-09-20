"use client";

import { Download } from "lucide-react";
import { Reveal } from "./Reveal";

export function Install() {
  return (
    <section id="install" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center border-t border-line pt-8 text-center">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              <span className="text-brand">06</span> · Install
            </p>
            <h2 className="mt-5 font-display text-[clamp(56px,9vw,120px)] leading-[1.02] tracking-[-0.01em]">
              Download
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <a
              href="/feed-filter.zip"
              download
              className="mt-10 inline-flex items-center justify-center gap-3 rounded-xl bg-ink px-10 py-6 text-[20px] font-semibold text-white transition-colors hover:bg-brand"
            >
              <Download className="size-6" /> Download .zip
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
