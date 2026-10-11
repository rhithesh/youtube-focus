import { ITEMS, WALL } from "../data";
import { Card } from "./Card";

// The drifting four-column wall of real posts. Card heights are fixed per platform so every
// card's position is known on every frame, which lets a scene blur cards by screen position.

export const WALL_W = 420;
const GAP = 24;
const H = { youtube: 330, x: 230, linkedin: 300 } as const;

export function Wall({
  frame,
  speed,
  top = 0,
  blurOf = () => 0,
}: {
  frame: number;
  speed: number[]; // px per frame per column; negative drifts down
  top?: number;
  blurOf?: (id: string, centerY: number) => number;
}) {
  const totalW = 4 * WALL_W + 3 * GAP;
  const left0 = (1920 - totalW) / 2;
  return (
    <>
      {WALL.map((ids, c) => {
        const colH = ids.reduce((a, id) => a + H[ITEMS[id].platform] + GAP, 0);
        const y0 = top + (c % 2 ? -150 : 0) - frame * speed[c];
        let y = (((y0 % colH) + colH) % colH) - colH;
        const cards = [];
        for (let k = 0; y < 1200; k++) {
          const id = ids[k % ids.length];
          const h = H[ITEMS[id].platform];
          cards.push(
            <div key={k} style={{ position: "absolute", left: left0 + c * (WALL_W + GAP), top: y }}>
              <Card item={ITEMS[id]} width={WALL_W} height={h} blur={blurOf(id, y + h / 2)} lines={ITEMS[id].platform === "x" ? 5 : 6} />
            </div>
          );
          y += h + GAP;
        }
        return cards;
      })}
    </>
  );
}
