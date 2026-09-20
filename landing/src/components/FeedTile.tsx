export type Thumb = {
  id: string;
  title: string;
  channel: string;
  meta: string;
  duration: string;
  bg: string;
  glyph: string;
  watched?: boolean;
};

export type Verdict = {
  tag: "SPAM" | "CLICK-BAIT" | "OFF-GOAL";
  cls: string;
  why: string;
};

export const CHIP: Record<string, string> = {
  SPAM: "bg-spam",
  "CLICK-BAIT": "bg-brand",
  "OFF-GOAL": "bg-slate-500",
};

export function ThumbBox({
  t,
  frosted,
  blurPx = 16,
  tag,
}: {
  t: Thumb;
  frosted: boolean;
  blurPx?: number;
  tag?: Verdict | null;
}) {
  return (
    <div className="group relative aspect-video overflow-hidden" style={{ background: t.bg }}>
      <span className="absolute inset-0 grid select-none place-items-center font-display text-5xl italic text-white/75">
        {t.glyph}
      </span>
      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] leading-none text-white">
        {t.duration}
      </span>
      {t.watched && (
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
          <span className="block h-full w-[38%] bg-red-600" />
        </span>
      )}
      {frosted && (
        <>
          <div
            className="ygf-veil absolute inset-0 transition-opacity duration-200 group-hover:opacity-0"
            style={{ backdropFilter: `blur(${blurPx}px) saturate(1.05)`, WebkitBackdropFilter: `blur(${blurPx}px) saturate(1.05)` }}
          />
          {tag && (
            <span
              className={`absolute left-2 top-2 rounded px-2 py-1 font-mono text-[10px] font-bold leading-none tracking-wider text-white transition-opacity duration-200 group-hover:opacity-60 ${tag.cls}`}
            >
              {tag.tag}
            </span>
          )}
          <span className="pointer-events-none absolute inset-x-0 bottom-2.5 mx-auto w-fit rounded-full bg-black/55 px-3 py-1 text-[11px] text-white backdrop-blur transition-opacity duration-200 group-hover:opacity-0">
            hover to peek
          </span>
        </>
      )}
    </div>
  );
}

export function TileCard({
  t,
  frosted,
  blurPx = 16,
  tag,
  why,
}: {
  t: Thumb;
  frosted: boolean;
  blurPx?: number;
  tag?: Verdict | null;
  why?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <ThumbBox t={t} frosted={frosted} blurPx={blurPx} tag={tag} />
      <div className="p-3">
        <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug">{t.title}</p>
        <p className="mt-1 text-xs text-muted">
          {t.channel} · {t.meta}
        </p>
        {why && (
          <p className={`mt-2 font-mono text-[11px] ${tag ? "font-semibold text-brand" : "text-muted/70"}`}>{why}</p>
        )}
      </div>
    </div>
  );
}

/* CSS-only "thumbnails" — gradients + one typographic glyph each */
export const HERO_TILES: Thumb[] = [
  {
    id: "h1",
    title: "Make $5,000 a day with this FREE crypto airdrop bot",
    channel: "Wealth Signals",
    meta: "12K views · 2 days ago",
    duration: "6:44",
    bg: "radial-gradient(circle at 30% 35%, #6b5410 0%, transparent 55%), radial-gradient(circle at 72% 70%, #3d3006 0%, transparent 50%), #12100a",
    glyph: "$",
  },
  {
    id: "h2",
    title: "Rust's ownership model, explained with memory diagrams",
    channel: "Systems Weekly",
    meta: "84K views · 1 month ago",
    duration: "41:15",
    bg: "radial-gradient(circle at 65% 30%, #7a3d12 0%, transparent 55%), radial-gradient(circle at 25% 75%, #40200a 0%, transparent 50%), #1a120d",
    glyph: "{ }",
  },
  {
    id: "h3",
    title: "You WON'T BELIEVE what happened next (GONE WRONG)",
    channel: "DramaDaily",
    meta: "2.1M views · 3 days ago",
    duration: "18:02",
    bg: "radial-gradient(circle at 35% 40%, #8f1d2c 0%, transparent 55%), radial-gradient(circle at 75% 75%, #4a0f18 0%, transparent 50%), #170a0d",
    glyph: "!",
  },
  {
    id: "h4",
    title: "Postgres indexes, visually — B-trees to GIN",
    channel: "DB Deep Dives",
    meta: "32K views · 2 weeks ago",
    duration: "27:48",
    bg: "radial-gradient(circle at 30% 30%, #1c4a80 0%, transparent 55%), radial-gradient(circle at 70% 75%, #12325a 0%, transparent 50%), #0c1118",
    glyph: "SQL",
    watched: true,
  },
];
