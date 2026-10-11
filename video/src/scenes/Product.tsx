import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GOAL_FEED, GOALS, HERO_GOAL, ITEMS, WALL_NOISE, WALL_TOTAL, isNoise, type GoalKey } from "../data";
import { lerp, prog, rise } from "../anim";
import { Card } from "../components/Card";
import { Cursor, Mark, Toggle } from "../components/bits";
import { Wall } from "../components/Wall";
import { C, EASE_IN_OUT, SANS, SERIF } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 4. You write your goal once. */
export function Goal() {
  const f = useCurrentFrame();
  const n = Math.max(0, Math.min(HERO_GOAL.length, Math.floor((f - 16) * 1.55)));
  const caret = Math.floor(f / 8) % 2 === 0;
  const pressed = f >= 92 && f < 98;
  const saved = f >= 98;
  return (
    <AbsoluteFill style={{ background: C.paper, alignItems: "center", justifyContent: "center", fontFamily: SANS, color: C.ink }}>
      <div style={{ ...rise(f, 0, 16, 30), fontSize: 30, color: C.muted, marginBottom: 34, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ width: 14, height: 14, borderRadius: 14, background: C.lime, boxShadow: `0 0 0 6px rgba(201,242,93,0.35)` }} />
        Step 1 · tell it what you&rsquo;re here for
      </div>
      <div
        style={{
          ...rise(f, 2, 20, 70),
          width: 1180,
          padding: 48,
          borderRadius: 40,
          background: C.card,
          border: `1px solid ${C.line}`,
          boxShadow: "0 40px 90px -50px rgba(22,21,15,0.45)",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 500 }}>What do you actually want out of your feeds?</div>
        <div style={{ marginTop: 24, minHeight: 190, padding: "30px 34px", borderRadius: 24, border: `2px solid ${f > 12 ? C.ink : C.line}`, boxShadow: f > 12 ? `0 0 0 8px rgba(201,242,93,0.55)` : undefined, fontSize: 46, lineHeight: 1.35 }}>
          {HERO_GOAL.slice(0, n)}
          <span style={{ display: "inline-block", width: 4, height: 50, background: C.ink, marginLeft: 3, transform: "translateY(8px)", opacity: caret ? 1 : 0 }} />
        </div>
        <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 27, color: C.muted }}>Say what you don&rsquo;t want, too.</span>
          <span
            style={{
              padding: "18px 38px",
              borderRadius: 999,
              fontSize: 30,
              fontWeight: 500,
              background: saved ? C.lime : C.ink,
              color: saved ? C.ink : C.paper,
              transform: `scale(${pressed ? 0.93 : 1})`,
            }}
          >
            {saved ? "Saved ✓" : "Save"}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/** 5. Filter on: a scan line sweeps the wall and every bait post blurs as it passes. */
export function Filter() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = spring({ frame: f - 24, fps, config: { damping: 16, stiffness: 220 } });
  const scanY = f < 42 ? -200 : f > 100 ? 99999 : interpolate(f, [42, 100], [150, 1200], { ...clamp, easing: EASE_IN_OUT });
  const blurOf = (id: string, cy: number) => (isNoise(id) && on > 0.5 ? Math.max(0, Math.min(1, (scanY - cy) / 110)) : 0);
  const count = Math.round(interpolate(f, [46, 100], [0, WALL_NOISE], clamp));
  const cap = rise(f, 112, 22, 50);
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${interpolate(f, [0, 216], [1.07, 1], clamp)})` }}>
        <Wall frame={f} speed={[1.2, -1, 1.4, -1.1]} top={60} blurOf={blurOf} />
      </AbsoluteFill>
      {f >= 42 && f <= 106 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: Math.min(scanY, 1200),
            height: 4,
            background: C.lime,
            boxShadow: "0 0 50px 18px rgba(201,242,93,0.55)",
            opacity: 1 - prog(f, 98, 8),
          }}
        />
      )}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(243,240,232,0.95) 0%, rgba(243,240,232,0) 22%)", pointerEvents: "none" }} />
      <div
        style={{
          ...rise(f, 0, 18, -30),
          position: "absolute",
          top: 44,
          left: "50%",
          marginLeft: -640,
          width: 1280,
          display: "flex",
          alignItems: "center",
          gap: 26,
          padding: "18px 30px 18px 22px",
          borderRadius: 999,
          background: C.card,
          border: `1px solid ${C.line}`,
          boxShadow: "0 24px 60px -28px rgba(22,21,15,0.45)",
          fontFamily: SANS,
          fontSize: 28,
        }}
      >
        <Toggle on={on} scale={1.3} />
        <span style={{ fontWeight: 500, width: 150 }}>Filter {on > 0.5 ? "on" : "off"}</span>
        <span style={{ width: 1, height: 36, background: C.line }} />
        <span style={{ color: C.muted, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Goal: <span style={{ color: C.ink }}>{HERO_GOAL}</span>
        </span>
        <span style={{ width: 1, height: 36, background: C.line }} />
        <span style={{ color: C.muted, whiteSpace: "nowrap" }}>
          <span style={{ color: C.ink, fontWeight: 600 }}>{count}</span> of {WALL_TOTAL} blurred
        </span>
      </div>
      {f >= 108 && (
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 90, background: `linear-gradient(to top, rgba(243,240,232,0.98) 0%, rgba(243,240,232,0.9) 26%, rgba(243,240,232,0) 52%)`, opacity: prog(f, 108, 14) }}>
          <div style={{ ...cap, fontFamily: SERIF, fontSize: 104, letterSpacing: -2.5, color: C.ink, textAlign: "center", lineHeight: 1 }}>
            One request judges the <Mark p={prog(f, 130, 16, EASE_IN_OUT)}>whole page.</Mark>
          </div>
          <div style={{ ...rise(f, 138, 18, 30), marginTop: 26, fontFamily: SANS, fontSize: 30, color: C.muted }}>
            About a second. Clickbait, rage-bait, scams and off-goal posts blur.
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

/** 6. Hover to peek: a cursor lifts the blur, then it comes back. */
export function Peek() {
  const f = useCurrentFrame();
  const unblur = prog(f, 46, 12);
  const reblur = prog(f, 98, 14);
  const blur = 1 - unblur + reblur;
  const toCard = prog(f, 14, 32, EASE_IN_OUT);
  const away = prog(f, 88, 22, EASE_IN_OUT);
  const cx = lerp(lerp(1800, 1360, toCard), 1820, away);
  const cy = lerp(lerp(1020, 560, toCard), 1040, away);
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 150, top: 330, fontFamily: SERIF, color: C.ink }}>
        <div style={{ ...rise(f, 0, 18, 50), fontSize: 150, letterSpacing: -4, lineHeight: 0.95 }}>
          Hover to <Mark p={prog(f, 18, 16, EASE_IN_OUT)}>peek.</Mark>
        </div>
        <div style={{ ...rise(f, 50, 18, 40), fontSize: 86, letterSpacing: -2, color: C.muted, marginTop: 30 }}>Nothing is deleted.</div>
        <div style={{ ...rise(f, 64, 18, 30), fontFamily: SANS, fontSize: 30, color: C.muted, marginTop: 34, maxWidth: 720, lineHeight: 1.4 }}>
          Blurred posts stay right where they are. Flip the switch and they&rsquo;re all back.
        </div>
      </div>
      <div style={{ ...rise(f, 4, 20, 60), position: "absolute", left: 1060, top: 230 }}>
        <Card item={ITEMS["li-fired"]} width={640} blur={blur} lines={10} />
      </div>
      <Cursor x={cx} y={cy} size={58} />
    </AbsoluteFill>
  );
}

const GOAL_ORDER: GoalKey[] = ["interviews", "cooking", "strength"];
const SWITCH_AT = [0, 54, 106];
const CHIP_W = [430, 280, 270];
const CHIP_GAP = 14;

/** 7. Same nine posts, three goals: the real per-goal verdicts. */
export function Goals() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = f >= SWITCH_AT[2] ? 2 : f >= SWITCH_AT[1] ? 1 : 0;
  const chipX = (i: number) => CHIP_W.slice(0, i).reduce((a, w) => a + w + CHIP_GAP, 0);
  const sp = k === 0 ? 1 : spring({ frame: f - SWITCH_AT[k], fps, config: { damping: 18, stiffness: 200 } });
  const pillX = lerp(chipX(Math.max(0, k - 1)), chipX(k), k === 0 ? 1 : sp);
  const pillW = lerp(CHIP_W[Math.max(0, k - 1)], CHIP_W[k], k === 0 ? 1 : sp);
  const blurred = (g: number, id: string) => (GOALS[GOAL_ORDER[g]].blurred.includes(id) ? 1 : 0);
  const blurOf = (id: string) => {
    if (k === 0) return blurred(0, id) * prog(f, 10, 14);
    return lerp(blurred(k - 1, id), blurred(k, id), prog(f, SWITCH_AT[k] + 4, 12));
  };
  const total = CHIP_W.reduce((a, w) => a + w, 0) + CHIP_GAP * 2;
  const W = 500;
  const gridLeft = (1920 - (3 * W + 2 * 26)) / 2;
  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: SANS, color: C.ink }}>
      <div style={{ ...rise(f, 0, 18, 40), position: "absolute", top: 70, width: "100%", textAlign: "center", fontFamily: SERIF, fontSize: 118, letterSpacing: -3, lineHeight: 1 }}>
        Same feed. Different <Mark p={prog(f, 12, 16, EASE_IN_OUT)}>you.</Mark>
      </div>
      <div style={{ ...rise(f, 6, 18, 30), position: "absolute", top: 232, left: (1920 - total) / 2, width: total, height: 70, borderRadius: 22, background: "#e9e4d8" }}>
        <div style={{ position: "absolute", top: 6, left: 6 + pillX, width: pillW - 12, height: 58, borderRadius: 17, background: C.ink }} />
        {GOAL_ORDER.map((g, i) => (
          <div key={g} style={{ position: "absolute", top: 0, left: chipX(i), width: CHIP_W[i], height: 70, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 500, color: i === k ? C.paper : C.muted }}>
            {GOALS[g].label}
          </div>
        ))}
      </div>
      {GOAL_FEED.map((item, i) => {
        const r = rise(f, 8 + i * 2, 18, 40);
        return (
          <div key={item.id} style={{ ...r, position: "absolute", left: gridLeft + (i % 3) * (W + 26), top: 340 + Math.floor(i / 3) * 222 }}>
            <Card item={item} width={W} height={200} compact lines={3} blur={blurOf(item.id)} />
          </div>
        );
      })}
      <div style={{ ...rise(f, 20, 18, 20), position: "absolute", bottom: 40, width: "100%", textAlign: "center", fontSize: 28, color: C.muted }}>
        <span style={{ color: C.ink, fontWeight: 600 }}>{GOALS[GOAL_ORDER[k]].blurred.length} of 9</span> blurred · real verdicts for each goal · bait stays blurred for everyone
      </div>
    </AbsoluteFill>
  );
}

