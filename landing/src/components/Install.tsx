"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { Reveal } from "./Reveal";
import { SectionHead } from "./Section";

const steps = [
  {
    title: "Download the extension",
    body: "Grab feed-filter.zip below. It's the folder in this repo — manifest, workers, icons — ready to load.",
  },
  {
    title: "Open chrome://extensions",
    body: "Enable Developer mode (top right), then click Load unpacked and pick the unzipped folder.",
  },
  {
    title: "Set goals + key",
    body: "The settings page opens on install. Write goals, paste a key, run a test call, save. Reload any YouTube tab.",
  },
];

export function Install() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText("chrome://extensions");
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section id="install" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHead
            n="06"
            label="Install"
            title={
              <>
                Under a minute, <em className="text-brand">sideloaded.</em>
              </>
            }
            lede="Developer preview for now — Chrome Web Store listing is on its way. Until then, load it unpacked."
          />
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
          <Reveal>
            <ol>
              {steps.map((s, i) => (
                <li key={s.title} className="grid gap-2 border-t border-line py-6 last:border-b sm:grid-cols-[52px_1fr]">
                  <span className="font-mono text-[12px] tabular-nums text-muted">0{i + 1}</span>
                  <div>
                    <h3 className="text-[16px] font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-lg bg-ink p-7 text-white">
              <p className="text-[17px] font-semibold tracking-tight">Ready when you are.</p>
              <p className="mt-1 font-mono text-[11.5px] text-white/60">feed-filter.zip · v1.0.0 · ~40 KB</p>
              <div className="mt-6 flex flex-col gap-2.5">
                <a
                  href="/feed-filter.zip"
                  download
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-brand hover:text-white"
                >
                  <Download className="size-4" /> Download .zip
                </a>
                <button
                  onClick={copy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-5 py-3 text-[14px] font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copied" : "Copy chrome://extensions"}
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
