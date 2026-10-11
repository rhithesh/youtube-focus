import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ITEMS } from "../data";
import { lerp, prog, rise } from "../anim";
import { Card } from "../components/Card";
import { Mark } from "../components/bits";
import { Wall } from "../components/Wall";
import { C, EASE_IN_OUT, SERIF } from "../theme";

/** 1. The feed, sharp and too fast: "Your feed is loud." */
export function Loud() {
  const f = useCurrentFrame();
  const shake = f > 24 ? Math.sin(f * 2.3) * 7 * (1 - prog(f, 24, 26)) : 0;
  const r2 = rise(f, 14, 12, 70);
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: "rotate(-5deg) scale(1.2)" }}>
        <Wall frame={f} speed={[10, -8, 12, -9]} />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 62% 50% at center, rgba(243,240,232,0.97) 0%, rgba(243,240,232,0.86) 45%, rgba(243,240,232,0.1) 100%)",
        }}
      />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: SERIF, color: C.ink, fontSize: 220, lineHeight: 0.9, letterSpacing: -6, textAlign: "center" }}>
        <div style={rise(f, 2, 14, 70)}>Your feed</div>
        <div style={{ opacity: r2.opacity, transform: `${r2.transform} translateX(${shake}px)` }}>
          is <span style={{ fontStyle: "italic" }}>loud.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

const SLAMS: [string, string, number, number, number][] = [
  // word, post id, x offset, y offset, resting rotation
  ["Clickbait.", "yt-quit", -70, -60, -6],
  ["Rage-bait.", "x-destroyed", 60, 10, 5],
  ["Scams.", "x-airdrop", -30, 70, -3],
  ["Broetry.", "li-fired", 50, -20, 7],
];
export const SLAM_EVERY = 26;

/** 2. Four real bait posts slam onto a pile, one word each. */
export function Slams() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const current = Math.min(SLAMS.length - 1, Math.floor(f / SLAM_EVERY));
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      {SLAMS.map(([, id, dx, dy, rot], i) => {
        const s = i * SLAM_EVERY;
        if (f < s) return null;
        const sp = spring({ frame: f - s, fps, config: { damping: 13, stiffness: 190, mass: 0.9 } });
        const buried = Math.max(0, current - i);
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: 1120 + dx,
              top: 210 + dy,
              transform: `translateY(${(1 - sp) * 760}px) rotate(${lerp(22, rot, sp)}deg) scale(${1 - buried * 0.03})`,
              opacity: 1 - buried * 0.18,
            }}
          >
            <Card item={ITEMS[id]} width={560} lines={9} />
          </div>
        );
      })}
      {SLAMS.map(([word], i) => {
        const s = i * SLAM_EVERY;
        const end = i === SLAMS.length - 1 ? 9999 : s + SLAM_EVERY;
        if (f < s || f >= end) return null;
        const p = prog(f, s, 7);
        return (
          <div
            key={word}
            style={{
              position: "absolute",
              left: 140,
              top: 380,
              fontFamily: SERIF,
              fontSize: 230,
              lineHeight: 1,
              letterSpacing: -6,
              color: C.paper,
              opacity: p,
              transform: `scale(${lerp(1.35, 1, p)})`,
              transformOrigin: "left center",
            }}
          >
            {word}
            <div style={{ height: 14, marginTop: 18, width: 380, background: C.lime, borderRadius: 7, transform: `scaleX(${prog(f, s + 3, 10)})`, transformOrigin: "left" }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** 3. The turn: "What if it only showed what you came for?" */
export function Turn() {
  const f = useCurrentFrame();
  const lines = [
    ["What", "if", "it", "only", "showed"],
    ["what", "you", "came for?"],
  ];
  let i = 0;
  return (
    <AbsoluteFill style={{ background: C.paper, alignItems: "center", justifyContent: "center", fontFamily: SERIF, color: C.ink, fontSize: 158, lineHeight: 1, letterSpacing: -4, textAlign: "center" }}>
      {lines.map((words, li) => (
        <div key={li}>
          {words.map((w) => {
            const r = rise(f, 4 + i++ * 3, 18, 60);
            return (
              <span key={w} style={{ display: "inline-block", marginRight: "0.22em", ...r }}>
                {w === "came for?" ? <Mark p={prog(f, 38, 18, EASE_IN_OUT)}>came for?</Mark> : w}
              </span>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
}
