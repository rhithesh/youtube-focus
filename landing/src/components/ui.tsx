"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { Platform } from "@/lib/feed";

export const btn = {
  ink: "inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-medium text-paper transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0",
  lime: "inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-[15px] font-medium text-ink transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0",
  ghost:
    "inline-flex items-center gap-2 rounded-full border border-ink/15 bg-card/60 px-6 py-3.5 text-[15px] font-medium text-ink transition-colors duration-200 hover:border-ink/40",
};

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-medium tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect width="24" height="24" rx="7" className="fill-ink" />
        <rect x="6" y="6.5" width="12" height="2.4" rx="1.2" className="fill-lime" />
        <rect x="6" y="10.8" width="12" height="2.4" rx="1.2" className="fill-paper" opacity=".28" />
        <rect x="6" y="15.1" width="8" height="2.4" rx="1.2" className="fill-lime" />
      </svg>
      Feed Filter
    </span>
  );
}

export function Glyph({ platform, className = "size-4" }: { platform: Platform; className?: string }) {
  if (platform === "youtube")
    return (
      <svg viewBox="0 0 24 24" className={className} aria-label="YouTube">
        <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0033" />
        <path d="M10 8.8v6.4l5.6-3.2z" fill="#fff" />
      </svg>
    );
  if (platform === "x")
    return (
      <svg viewBox="0 0 24 24" className={className} aria-label="X">
        <rect width="24" height="24" rx="6" fill="#0f0f0f" />
        <path d="M6.5 6h3.1l3 4.1L16.2 6h1.6l-4.5 5.1L18 18h-3.1l-3.2-4.4L7.8 18H6.2l4.8-5.4z" fill="#fff" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="LinkedIn">
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path d="M7 10h2.3v7H7zM8.15 6.3a1.3 1.3 0 110 2.6 1.3 1.3 0 010-2.6zM11 10h2.2v1c.4-.7 1.3-1.2 2.4-1.2 2 0 2.6 1.3 2.6 3V17h-2.3v-3.7c0-.9-.2-1.6-1.1-1.6-1 0-1.4.7-1.4 1.7V17H11z" fill="#fff" />
    </svg>
  );
}

/** A highlighter swipe behind a word that draws itself in when scrolled into view. */
export function Mark({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <motion.span
        aria-hidden
        className={`absolute inset-x-[-0.08em] bottom-[0.08em] origin-left rounded-[0.12em] bg-lime ${dark ? "top-[0.14em]" : "top-[0.42em]"}`}
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.65, 0, 0.35, 1] }}
      />
      <span className={`relative italic ${dark ? "text-ink" : ""}`}>{children}</span>
    </span>
  );
}

export function Kicker({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <p className={`inline-flex items-center gap-2 text-[13px] font-medium ${dark ? "text-paper/60" : "text-muted"}`}>
      <span className="size-1.5 rounded-full bg-lime ring-2 ring-lime/30" />
      {children}
    </p>
  );
}

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
