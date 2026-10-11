import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { prog, rise } from "../anim";
import { Glyph } from "../components/Card";
import { Logo, Mark } from "../components/bits";
import { C, EASE_IN_OUT, SANS, SERIF } from "../theme";
import type { Platform } from "../data";

const TILES: { key: Platform; name: string; sub: string }[] = [
  { key: "youtube", name: "YouTube", sub: "Home, search, sidebar, Shorts" },
  { key: "x", name: "X", sub: "For you and Following" },
  { key: "linkedin", name: "LinkedIn", sub: "Your home feed" },
];

/** 8. Where it works. */
export function Platforms() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const W = 480;
  const left = (1920 - (3 * W + 2 * 36)) / 2;
  return (
    <AbsoluteFill style={{ background: C.night, color: C.paper }}>
      <div style={{ ...rise(f, 0, 18, 40), position: "absolute", top: 170, width: "100%", textAlign: "center", fontFamily: SERIF, fontSize: 128, letterSpacing: -3, lineHeight: 1 }}>
        Works where you <Mark full p={prog(f, 12, 16, EASE_IN_OUT)}>actually</Mark> scroll.
      </div>
      {TILES.map((t, i) => {
        const sp = spring({ frame: f - 14 - i * 7, fps, config: { damping: 15, stiffness: 170 } });
        return (
          <div
            key={t.key}
            style={{
              position: "absolute",
              left: left + i * (W + 36),
              top: 450,
              width: W,
              height: 360,
              borderRadius: 40,
              background: C.night2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 22,
              opacity: Math.min(1, sp * 1.4),
              transform: `translateY(${(1 - sp) * 160}px)`,
              fontFamily: SANS,
            }}
          >
            <Glyph platform={t.key} size={124} />
            <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: -1 }}>{t.name}</div>
            <div style={{ fontSize: 27, color: "rgba(243,240,232,0.55)" }}>{t.sub}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** 9. Free. */
export function Free() {
  const f = useCurrentFrame();
  const r = rise(f, 0, 18, 60);
  return (
    <AbsoluteFill style={{ background: C.paper, color: C.ink, flexDirection: "row", alignItems: "center", padding: "0 150px", gap: 90 }}>
      <div style={{ ...r, fontFamily: SERIF, fontSize: 400, letterSpacing: -12, lineHeight: 0.85 }}>
        <Mark p={prog(f, 16, 18, EASE_IN_OUT)}>Free.</Mark>
      </div>
      <div style={{ fontFamily: SANS }}>
        <div style={{ ...rise(f, 14, 18, 40), fontSize: 62, fontWeight: 500, letterSpacing: -1.5, lineHeight: 1.15 }}>
          300 posts a day,
          <br />
          on us.
        </div>
        <div style={{ ...rise(f, 26, 18, 30), fontSize: 38, color: C.muted, marginTop: 26, lineHeight: 1.3 }}>
          Unlimited with your own key.
          <br />
          No account needed.
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** 10. End card. */
export function End() {
  const f = useCurrentFrame();
  const noise = prog(f, 64, 24);
  return (
    <AbsoluteFill style={{ background: C.paper, color: C.ink, alignItems: "center", justifyContent: "center", fontFamily: SANS }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26, ...rise(f, 0, 16, 30) }}>
        <Logo size={112} grow={prog(f, 4, 26)} />
        <div style={{ fontSize: 76, fontWeight: 500, letterSpacing: -1.5 }}>Feed Filter</div>
      </div>
      <div style={{ ...rise(f, 24, 20, 50), marginTop: 60, fontFamily: SERIF, fontSize: 168, letterSpacing: -5, lineHeight: 0.95, textAlign: "center" }}>
        Your feeds, minus the{" "}
        <span style={{ display: "inline-block", fontStyle: "italic", filter: `blur(${noise * 0.075}em)`, opacity: 1 - noise * 0.42 }}>noise.</span>
      </div>
      <div style={{ ...rise(f, 84, 18, 30), marginTop: 70, display: "flex", gap: 18, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 34px", borderRadius: 999, background: C.ink, color: C.paper, fontSize: 36, fontWeight: 500 }}>
          <span style={{ width: 14, height: 14, borderRadius: 14, background: C.lime }} />
          ff.hithesh.online
        </div>
        <div style={{ padding: "20px 30px", borderRadius: 999, border: `2px solid ${C.line}`, fontSize: 30, color: C.muted, display: "flex", alignItems: "center", gap: 14 }}>
          Free Chrome extension
          <Glyph platform="youtube" size={34} />
          <Glyph platform="x" size={34} />
          <Glyph platform="linkedin" size={34} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
