import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { C, SANS } from "../theme";

/** The Feed Filter mark; `grow` 0→1 slides the three bars in one after another. */
export function Logo({ size, grow = 1, dark = false }: { size: number; grow?: number; dark?: boolean }) {
  const u = size / 24;
  const bar = (i: number, top: number, width: number, color: string, opacity = 1) => {
    const g = Math.max(0, Math.min(1, grow * 3 - i));
    return <div style={{ position: "absolute", left: 6 * u, top: top * u, width: width * u * g, height: 2.4 * u, borderRadius: 1.2 * u, background: color, opacity }} />;
  };
  return (
    <div style={{ position: "relative", width: size, height: size, borderRadius: 7 * u, background: dark ? "#2a2920" : C.ink, flexShrink: 0 }}>
      {bar(0, 6.5, 12, C.lime)}
      {bar(1, 10.8, 12, C.paper, 0.28)}
      {bar(2, 15.1, 8, C.lime)}
    </div>
  );
}

/** Highlighter swipe behind a word; `p` 0→1 draws it. `full` covers the whole line height (for dark backgrounds). */
export function Mark({ children, p, full = false }: { children: ReactNode; p: number; full?: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.08em",
          right: "-0.08em",
          top: full ? "0.14em" : "0.44em",
          bottom: "0.06em",
          background: C.lime,
          borderRadius: "0.12em",
          transform: `scaleX(${p})`,
          transformOrigin: "left",
        }}
      />
      <span style={{ position: "relative", fontStyle: "italic" }}>{children}</span>
      {/* On dark backgrounds the word is light until the swipe reaches it, then dark on lime. */}
      {full && (
        <span style={{ position: "absolute", left: 0, top: 0, fontStyle: "italic", color: C.ink, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>{children}</span>
      )}
    </span>
  );
}

export function Toggle({ on, scale = 1 }: { on: number; scale?: number }) {
  const s = scale;
  return (
    <div style={{ position: "relative", width: 56 * s, height: 32 * s, borderRadius: 999, background: on > 0.5 ? C.ink : "rgba(22,21,15,0.15)", flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          top: 4 * s,
          left: 4 * s,
          width: 24 * s,
          height: 24 * s,
          borderRadius: 999,
          background: on > 0.5 ? C.lime : "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          transform: `translateX(${on * 24 * s}px)`,
        }}
      />
    </div>
  );
}

export function Cursor({ x, y, size = 44 }: { x: number; y: number; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ position: "absolute", left: x, top: y, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))" }}>
      <path d="M4 2l15 9.5-6.6 1.4 3.8 7.4-2.7 1.4-3.8-7.5L4 19z" fill={C.ink} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function Pill({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 26px", borderRadius: 999, fontFamily: SANS, fontWeight: 500, fontSize: 28, ...style }}>
      {children}
    </div>
  );
}

// Scene-to-scene transition in the product's own language: the old scene blurs away,
// the new one sharpens in.
function BlurDissolve({ children, presentationDirection, presentationProgress: p }: TransitionPresentationComponentProps<Record<string, never>>) {
  const entering = presentationDirection === "entering";
  const blur = entering ? (1 - p) * 26 : p * 26;
  return (
    <AbsoluteFill
      style={{
        opacity: entering ? p : 1 - p,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        transform: `scale(${entering ? 1.04 - 0.04 * p : 1 + 0.03 * p})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

export const blurDissolve = (): TransitionPresentation<Record<string, never>> => ({ component: BlurDissolve, props: {} });
