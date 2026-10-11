import { interpolate } from "remotion";
import { EASE } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 over [start, start+dur], eased. */
export const prog = (frame: number, start: number, dur: number, easing = EASE) =>
  interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing });

/** Fade + rise, the house entrance. */
export const rise = (frame: number, start: number, dur = 18, dist = 40) => {
  const p = prog(frame, start, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dist}px)` };
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
