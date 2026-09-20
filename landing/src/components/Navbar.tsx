"use client";

import { useEffect, useState } from "react";

const links = [
  { label: "Demo", href: "#demo" },
  { label: "How it judges", href: "#how" },
  { label: "Install", href: "#install" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? "border-line bg-paper/90 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#1D6FE0" />
            <path d="M16 7.5l7 2.6v5.4c0 4.4-3 8.3-7 9-4-.7-7-4.6-7-9v-5.4l7-2.6z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12.8 15.8l2.3 2.3 4.4-4.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[14px] font-semibold tracking-tight">Feed Filter</span>
          <span className="font-mono text-[11px] text-muted">v1.0.0</span>
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[13.5px] text-muted transition-colors hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="#install"
          className="rounded-lg bg-ink px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand"
        >
          Download
        </a>
      </div>
    </header>
  );
}
