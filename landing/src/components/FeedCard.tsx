"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import type { Item, Post, Video } from "@/lib/feed";
import { Glyph } from "./ui";

const AVATAR_TONES = ["#E8D9A8", "#CFE6D6", "#D9D3F1", "#F3C8B6", "#C8DCF1", "#E9D0E4", "#DDE7B8"];

function Avatar({ name, size = "size-9" }: { name: string; size?: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span aria-hidden className={`grid ${size} shrink-0 place-items-center rounded-full text-[11px] font-semibold text-ink/80`} style={{ background: tone }}>
      {initials}
    </span>
  );
}

const firstNum = (s: string) => s.split(" · ").map((p) => p.split(" ")[0]);

function VideoBody({ v }: { v: Video }) {
  return (
    <div className="p-2.5">
      <div className="relative aspect-video overflow-hidden rounded-xl">
        {"src" in v.thumb ? (
          <Image src={v.thumb.src} alt="" fill sizes="(min-width: 1024px) 20rem, 50vw" className="object-cover" draggable={false} />
        ) : (
          <div
            className="grid h-full place-items-center p-3 text-center text-[clamp(15px,1.9vw,22px)] font-black leading-[1.02] tracking-tight"
            style={{ background: v.thumb.bg, color: v.thumb.fg }}
          >
            {v.thumb.text}
          </div>
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1 text-[10px] font-medium leading-4 text-white">{v.duration}</span>
      </div>
      <div className="mt-2.5 flex gap-2.5 px-0.5 pb-0.5">
        <Avatar name={v.channel} size="size-7" />
        <div className="min-w-0">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{v.title}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted">
            {v.channel} · {v.meta}
          </p>
        </div>
      </div>
    </div>
  );
}

function XBody({ p }: { p: Post }) {
  const [replies, reposts, likes] = firstNum(p.stats);
  return (
    <div className="flex gap-3 p-3.5">
      <Avatar name={p.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px]">
          <span className="font-semibold">{p.name}</span>{" "}
          <span className="text-muted">
            {p.handle} · {p.when}
          </span>
        </p>
        <p className="mt-1 whitespace-pre-line text-[13.5px] leading-snug">{p.text}</p>
        <div className="mt-2.5 flex justify-between pr-4 text-[11.5px] text-muted">
          <span>↩ {replies}</span>
          <span>⇄ {reposts}</span>
          <span>♡ {likes}</span>
        </div>
      </div>
    </div>
  );
}

function LinkedInBody({ p }: { p: Post }) {
  return (
    <div className="p-3.5">
      <div className="flex gap-2.5">
        <Avatar name={p.name} size="size-10" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{p.name}</p>
          <p className="truncate text-[11.5px] text-muted">{p.handle}</p>
          <p className="text-[11px] text-muted">{p.when} · 🌐</p>
        </div>
      </div>
      <p className="mt-2.5 line-clamp-6 whitespace-pre-line text-[13px] leading-snug">{p.text}</p>
      <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2 text-[11.5px] text-muted">
        <span className="flex -space-x-1" aria-hidden>
          <span className="size-3.5 rounded-full border border-card bg-[#378FE9]" />
          <span className="size-3.5 rounded-full border border-card bg-[#DF704D]" />
          <span className="size-3.5 rounded-full border border-card bg-[#6DAE4F]" />
        </span>
        {p.stats}
      </div>
    </div>
  );
}

/**
 * One feed item. When `blurred`, the content blurs under a paper tint, exactly
 * like the extension; hover (or tap, on touch) peeks through.
 */
export function FeedCard({
  item,
  blurred,
  delay = 0,
  showGlyph = true,
  className = "",
}: {
  item: Item;
  blurred: boolean;
  delay?: number;
  showGlyph?: boolean;
  className?: string;
}) {
  const [peek, setPeek] = useState(false);
  const veiled = blurred && !peek;
  const t = { duration: peek ? 0.2 : 0.55, delay: veiled && !peek ? delay : 0, ease: [0.2, 0.7, 0.2, 1] as const };

  return (
    <motion.article
      className={`relative overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_0_rgba(22,21,15,0.04),0_8px_24px_-12px_rgba(22,21,15,0.18)] ${className}`}
      onHoverStart={() => setPeek(true)}
      onHoverEnd={() => setPeek(false)}
      onPointerUp={(e) => {
        if (e.pointerType === "touch") setPeek((p) => !p);
      }}
    >
      <motion.div
        initial={false}
        animate={{ filter: veiled ? "blur(7px) saturate(0.6)" : "blur(0px) saturate(1)" }}
        transition={t}
      >
        {item.platform === "youtube" ? <VideoBody v={item} /> : item.platform === "x" ? <XBody p={item} /> : <LinkedInBody p={item} />}
      </motion.div>
      {showGlyph && (
        <span className="absolute right-2.5 top-2.5 z-10 rounded-md bg-card/90 p-0.5 shadow-sm">
          <Glyph platform={item.platform} className="size-3.5" />
        </span>
      )}
      <motion.div
        aria-hidden
        className="ygf-veil pointer-events-none absolute inset-0"
        initial={false}
        animate={{ opacity: veiled ? 1 : 0 }}
        transition={t}
      />
      {blurred && <span className="sr-only">Blurred by Feed Filter.</span>}
    </motion.article>
  );
}
