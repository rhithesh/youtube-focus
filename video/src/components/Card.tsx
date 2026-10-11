import type { CSSProperties } from "react";
import { Img, staticFile } from "remotion";
import type { Item, Platform, Post, Video } from "../data";
import { C, SANS } from "../theme";

// A frame-driven port of the site's FeedCard. `blur` runs 0→1 so scenes can animate it.

const AVATAR_TONES = ["#E8D9A8", "#CFE6D6", "#D9D3F1", "#F3C8B6", "#C8DCF1", "#E9D0E4", "#DDE7B8"];

const clampLines = (n: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: n,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

export function Glyph({ platform, size }: { platform: Platform; size: number }) {
  if (platform === "youtube")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0033" />
        <path d="M10 8.8v6.4l5.6-3.2z" fill="#fff" />
      </svg>
    );
  if (platform === "x")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size}>
        <rect width="24" height="24" rx="6" fill="#0f0f0f" />
        <path d="M6.5 6h3.1l3 4.1L16.2 6h1.6l-4.5 5.1L18 18h-3.1l-3.2-4.4L7.8 18H6.2l4.8-5.4z" fill="#fff" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}>
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path d="M7 10h2.3v7H7zM8.15 6.3a1.3 1.3 0 110 2.6 1.3 1.3 0 010-2.6zM11 10h2.2v1c.4-.7 1.3-1.2 2.4-1.2 2 0 2.6 1.3 2.6 3V17h-2.3v-3.7c0-.9-.2-1.6-1.1-1.6-1 0-1.4.7-1.4 1.7V17H11z" fill="#fff" />
    </svg>
  );
}

function Avatar({ name, size }: { name: string; size: number }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <div style={{ width: size, height: size, borderRadius: size, background: tone, flexShrink: 0, display: "grid", placeItems: "center", fontSize: size * 0.34, fontWeight: 600, color: "rgba(22,21,15,0.8)" }}>
      {initials}
    </div>
  );
}

function Thumb({ v, u, radius }: { v: Video; u: number; radius: number }) {
  return (
    <div style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: radius, overflow: "hidden", width: "100%" }}>
      {"src" in v.thumb ? (
        <Img src={staticFile(v.thumb.src.replace(/^\//, ""))} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", padding: 12 * u, textAlign: "center", background: v.thumb.bg, color: v.thumb.fg, fontWeight: 600, fontSize: 24 * u, lineHeight: 1.02, letterSpacing: -0.5 }}>
          {v.thumb.text}
        </div>
      )}
      <div style={{ position: "absolute", right: 6 * u, bottom: 6 * u, background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: 10.5 * u, fontWeight: 500, padding: `${1 * u}px ${4 * u}px`, borderRadius: 4 * u }}>
        {v.duration}
      </div>
    </div>
  );
}

function VideoBody({ v, u }: { v: Video; u: number }) {
  return (
    <div style={{ padding: 10 * u }}>
      <Thumb v={v} u={u} radius={12 * u} />
      <div style={{ display: "flex", gap: 10 * u, marginTop: 10 * u }}>
        <Avatar name={v.channel} size={28 * u} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5 * u, fontWeight: 600, lineHeight: 1.3, ...clampLines(2) }}>{v.title}</div>
          <div style={{ fontSize: 11.5 * u, color: C.muted, marginTop: 3 * u, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {v.channel} · {v.meta}
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoCompact({ v, u }: { v: Video; u: number }) {
  return (
    <div style={{ display: "flex", gap: 12 * u, padding: 10 * u, alignItems: "flex-start" }}>
      <div style={{ width: "46%", flexShrink: 0 }}>
        <Thumb v={v} u={u * 0.62} radius={10 * u} />
      </div>
      <div style={{ minWidth: 0, paddingTop: 2 * u }}>
        <div style={{ fontSize: 13.5 * u, fontWeight: 600, lineHeight: 1.3, ...clampLines(3) }}>{v.title}</div>
        <div style={{ fontSize: 11.5 * u, color: C.muted, marginTop: 4 * u }}>{v.channel}</div>
      </div>
    </div>
  );
}

function XBody({ p, u, lines }: { p: Post; u: number; lines: number }) {
  const [replies, reposts, likes] = p.stats.split(" · ").map((s) => s.split(" ")[0]);
  return (
    <div style={{ display: "flex", gap: 12 * u, padding: 14 * u }}>
      <Avatar name={p.name} size={36 * u} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13 * u, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <span style={{ fontWeight: 600 }}>{p.name}</span> <span style={{ color: C.muted }}>{p.handle} · {p.when}</span>
        </div>
        <div style={{ fontSize: 13.5 * u, lineHeight: 1.35, marginTop: 4 * u, whiteSpace: "pre-line", ...clampLines(lines) }}>{p.text}</div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingRight: 16 * u, marginTop: 10 * u, fontSize: 11.5 * u, color: C.muted }}>
          <span>↩ {replies}</span>
          <span>⇄ {reposts}</span>
          <span>♡ {likes}</span>
        </div>
      </div>
    </div>
  );
}

function LinkedInBody({ p, u, lines }: { p: Post; u: number; lines: number }) {
  return (
    <div style={{ padding: 14 * u }}>
      <div style={{ display: "flex", gap: 10 * u }}>
        <Avatar name={p.name} size={40 * u} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13 * u, fontWeight: 600 }}>{p.name}</div>
          <div style={{ fontSize: 11.5 * u, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.handle}</div>
          <div style={{ fontSize: 11 * u, color: C.muted }}>{p.when} · 🌐</div>
        </div>
      </div>
      <div style={{ fontSize: 13 * u, lineHeight: 1.35, marginTop: 10 * u, whiteSpace: "pre-line", ...clampLines(lines) }}>{p.text}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 * u, marginTop: 10 * u, paddingTop: 8 * u, borderTop: `1px solid ${C.line}`, fontSize: 11.5 * u, color: C.muted }}>
        <span style={{ display: "flex" }}>
          {["#378FE9", "#DF704D", "#6DAE4F"].map((c, i) => (
            <span key={c} style={{ width: 14 * u, height: 14 * u, borderRadius: 14 * u, background: c, border: `${1.5 * u}px solid #fff`, marginLeft: i ? -4 * u : 0 }} />
          ))}
        </span>
        {p.stats}
      </div>
    </div>
  );
}

export function Card({
  item,
  width,
  height,
  blur = 0,
  compact = false,
  glyph = true,
  lines = 6,
  style,
}: {
  item: Item;
  width: number;
  height?: number;
  blur?: number;
  compact?: boolean;
  glyph?: boolean;
  lines?: number;
  style?: CSSProperties;
}) {
  const u = width / 320;
  const b = Math.max(0, Math.min(1, blur));
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius: 18 * u,
        background: C.card,
        border: `1px solid ${C.line}`,
        boxShadow: `0 ${10 * u}px ${30 * u}px -${14 * u}px rgba(22,21,15,0.28), 0 1px 0 rgba(22,21,15,0.04)`,
        fontFamily: SANS,
        color: C.ink,
        ...style,
      }}
    >
      <div style={{ filter: b ? `blur(${b * 9 * u}px) saturate(${1 - 0.45 * b})` : undefined }}>
        {item.platform === "youtube" ? (
          compact ? <VideoCompact v={item} u={u} /> : <VideoBody v={item} u={u} />
        ) : item.platform === "x" ? (
          <XBody p={item} u={u} lines={lines} />
        ) : (
          <LinkedInBody p={item} u={u} lines={lines} />
        )}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "rgba(243,240,232,0.32)", opacity: b }} />
      {glyph && (
        <div style={{ position: "absolute", right: 10 * u, top: 10 * u, background: "rgba(255,255,255,0.92)", borderRadius: 6 * u, padding: 2 * u, display: "flex", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
          <Glyph platform={item.platform} size={15 * u} />
        </div>
      )}
    </div>
  );
}
