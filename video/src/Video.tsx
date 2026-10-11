import { Easing } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { blurDissolve } from "./components/bits";
import { End, Free, Platforms } from "./scenes/Outro";
import { Filter, Goal, Goals, Peek } from "./scenes/Product";
import { Loud, SLAM_EVERY, Slams, Turn } from "./scenes/Intro";

// [component, frames, blur-dissolve into the next scene?]
const SCENES: [React.FC, number, boolean][] = [
  [Loud, 64, false], // hard cut into the slams
  [Slams, SLAM_EVERY * 4 + 14, true],
  [Turn, 96, true],
  [Goal, 122, true],
  [Filter, 216, true],
  [Peek, 128, true],
  [Goals, 158, true],
  [Platforms, 104, true],
  [Free, 92, true],
  [End, 160, false],
];
const T = 14;

export const DURATION = SCENES.reduce((a, [, d, t], i) => a + d - (t && i < SCENES.length - 1 ? T : 0), 0);

export function LaunchVideo() {
  return (
    <TransitionSeries>
      {SCENES.flatMap(([Scene, d, t], i) => {
        const parts = [
          <TransitionSeries.Sequence key={"s" + i} durationInFrames={d}>
            <Scene />
          </TransitionSeries.Sequence>,
        ];
        if (t && i < SCENES.length - 1)
          parts.push(
            <TransitionSeries.Transition key={"t" + i} presentation={blurDissolve()} timing={linearTiming({ durationInFrames: T, easing: Easing.bezier(0.65, 0, 0.35, 1) })} />
          );
        return parts;
      })}
    </TransitionSeries>
  );
}
