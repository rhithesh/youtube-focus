import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Card, Glyph } from "./components/Card";
import { Logo, Mark } from "./components/bits";
import { GOAL_FEED, GOALS, isNoise, ITEMS, type GoalKey, type Item } from "./data";
import { C, SANS, SERIF } from "./theme";

// Chrome Web Store art: five 1280x800 screenshots, the 440x280 small promo tile and the
// 1400x560 marquee. Rendered as stills by scripts/store.sh. The UI in them is real: the
// extension's popup and options pages (scripts/capture-ui.sh), a real YouTube screenshot,
// and the site's posts with their real Jev verdicts.

const Page = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <AbsoluteFill style={{ background: C.paper, color: C.ink, fontFamily: SANS, overflow: "hidden", ...style }}>{children}</AbsoluteFill>
);

const Kicker = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, color: C.muted }}>
    <span style={{ width: 8, height: 8, borderRadius: 8, background: C.lime, boxShadow: "0 0 0 3px rgba(201,242,93,0.35)" }} />
    {children}
  </div>
);

const Title = ({ children, size = 68 }: { children: ReactNode; size?: number }) => (
  <div style={{ fontFamily: SERIF, fontSize: size, lineHeight: 0.98, letterSpacing: "-0.025em", marginTop: 14 }}>{children}</div>
);

const Sub = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ fontSize: 20, lineHeight: 1.45, color: C.muted, marginTop: 16, ...style }}>{children}</div>
);

const shadow = "0 30px 60px -28px rgba(22,21,15,0.35), 0 0 0 1px rgba(22,21,15,0.08)";

function Browser({ url, width, children }: { url: string; width: number; children: ReactNode }) {
  return (
    <div style={{ width, borderRadius: 16, overflow: "hidden", background: C.card, boxShadow: shadow }}>
      <div style={{ height: 36, display: "flex", alignItems: "center", gap: 7, padding: "0 14px", background: "#ebe7dc", borderBottom: `1px solid ${C.line}` }}>
        {["#e6685e", "#e9bd4f", "#79c35b"].map((c) => <span key={c} style={{ width: 11, height: 11, borderRadius: 11, background: c }} />)}
        <div style={{ marginLeft: 14, flex: 1, maxWidth: 420, height: 22, borderRadius: 7, background: "rgba(255,255,255,0.75)", fontSize: 12.5, color: C.muted, display: "flex", alignItems: "center", padding: "0 10px" }}>
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- screenshots */

export function ShotYouTube() {
  const w = 1152;
  return (
    <Page>
      <div style={{ position: "absolute", left: 64, top: 52, right: 64, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
        <div>
          <Kicker>YouTube home, search, sidebar and Shorts</Kicker>
          <Title>
            Clickbait, <Mark p={1}>blurred.</Mark>
          </Title>
        </div>
        <Sub style={{ maxWidth: 470, marginTop: 0, paddingBottom: 4 }}>
          Every video is judged against the goal you wrote. The bait and the off-goal ones blur in place. Hover to peek.
        </Sub>
      </div>
      <div style={{ position: "absolute", left: 64, top: 206 }}>
        <Browser url="youtube.com" width={w}>
          {/* 2860x1284 capture; the last ~30px is Chrome's link-preview bar, cropped off. */}
          <div style={{ height: 1250 * (w / 2860), overflow: "hidden" }}>
            <Img src={staticFile("store/youtube.png")} style={{ width: w, display: "block" }} />
          </div>
        </Browser>
      </div>
    </Page>
  );
}

function Feed({ platform, title, ids, width }: { platform: "x" | "linkedin"; title: string; ids: string[]; width: number }) {
  return (
    <div style={{ width }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 500, marginBottom: 16 }}>
        <Glyph platform={platform} size={26} />
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {ids.map((id) => <Card key={id} item={ITEMS[id]} width={width} blur={isNoise(id) ? 1 : 0} glyph={false} lines={4} />)}
      </div>
    </div>
  );
}

export function ShotSocial() {
  return (
    <Page>
      <div style={{ position: "absolute", left: 64, top: 52, width: 470 }}>
        <Kicker>X and LinkedIn</Kicker>
        <Title>
          Your timeline, minus the <Mark p={1}>rage.</Mark>
        </Title>
        <Sub>Airdrop scams, engagement farming, one-line-per-sentence broetry and &ldquo;Agree?&rdquo; posts blur right where they sit.</Sub>
        <Sub style={{ fontSize: 16, marginTop: 28 }}>Real posts, real verdicts from TypeSafe&rsquo;s Jev model.</Sub>
      </div>
      <div
        style={{
          position: "absolute", left: 590, top: 52, display: "flex", gap: 24,
          WebkitMaskImage: "linear-gradient(to bottom, #000 82%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, #000 82%, transparent 100%)",
        }}
      >
        <Feed platform="x" title="For you" ids={["x-go", "x-airdrop", "x-hashing", "x-destroyed"]} width={300} />
        <Feed platform="linkedin" title="Feed" ids={["li-fired", "li-graphs", "li-synergy", "li-postmortem"]} width={300} />
      </div>
    </Page>
  );
}

export function ShotGoal() {
  // The options page, captured at 2x (1800 wide): header plus the goals card.
  const crop = { x: 120, y: 60, w: 1560, h: 1240 };
  const w = 700;
  const k = w / crop.w;
  return (
    <Page>
      <div style={{ position: "absolute", left: 64, top: 0, bottom: 0, width: 420, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Kicker>Step 1, and the only one</Kicker>
        <Title size={64}>
          Write what you&rsquo;re <Mark p={1}>here for.</Mark>
        </Title>
        <Sub>Plain words, the way you&rsquo;d tell a friend. Say what you don&rsquo;t want, too. No keyword lists to maintain.</Sub>
        <Sub style={{ fontSize: 16, marginTop: 28 }}>Your goal stays in your browser and is only sent along with the posts being judged.</Sub>
      </div>
      <div style={{ position: "absolute", right: 64, top: (800 - 36 - crop.h * k) / 2 }}>
        <Browser url="Feed Filter · settings" width={w}>
          <div style={{ width: w, height: crop.h * k, overflow: "hidden", background: C.paper }}>
            <Img src={staticFile("store/options.png")} style={{ width: 1800 * k, display: "block", marginLeft: -crop.x * k, marginTop: -crop.y * k }} />
          </div>
        </Browser>
      </div>
    </Page>
  );
}

const oneLine = (it: Item) => (it.platform === "youtube" ? it.title : it.text.split("\n")[0]);

function GoalColumn({ goal }: { goal: GoalKey }) {
  const g = GOALS[goal];
  const blurred = new Set(g.blurred);
  return (
    <div style={{ width: 362, background: C.card, borderRadius: 22, padding: 16, boxShadow: shadow }}>
      <div style={{ fontSize: 13, color: C.muted }}>My goal</div>
      <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1.05, marginTop: 2 }}>{g.label.replace(/\s+/g, " ")}</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 4, marginBottom: 12 }}>
        {GOAL_FEED.length - blurred.size} get through · {blurred.size} blurred
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {GOAL_FEED.map((it) => {
          const b = blurred.has(it.id);
          return (
            <div key={it.id} style={{ position: "relative", display: "flex", alignItems: "center", gap: 10, height: 40, padding: "0 10px", borderRadius: 11, background: b ? "#efebe1" : C.paper, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, filter: b ? "blur(3.5px) saturate(0.5)" : undefined, opacity: b ? 0.75 : 1 }}>
                <Glyph platform={it.platform} size={18} />
                <span style={{ fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{oneLine(it)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ShotGoals() {
  return (
    <Page>
      <div style={{ position: "absolute", left: 64, top: 52, right: 64, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
        <div>
          <Kicker>Your goals, not a keyword list</Kicker>
          <Title>
            Same feed. Different <Mark p={1}>you.</Mark>
          </Title>
        </div>
        <Sub style={{ maxWidth: 420, marginTop: 0, paddingBottom: 4 }}>The same nine posts under three goals. Bait is blurred for everyone; the rest depends on you.</Sub>
      </div>
      <div style={{ position: "absolute", left: 64, right: 64, top: 236, display: "flex", justifyContent: "space-between" }}>
        {(["interviews", "cooking", "strength"] as const).map((g) => <GoalColumn key={g} goal={g} />)}
      </div>
    </Page>
  );
}

const FACTS: [string, string][] = [
  ["300", "posts a day on the free tier. No account, no key"],
  ["One", "request judges the whole page, in about a second"],
  ["Hover", "to peek at anything blurred. Nothing is deleted"],
];

export function ShotPopup() {
  const pw = 400; // popup.png is 636x800 (318x400 at 2x)
  return (
    <Page>
      <div style={{ position: "absolute", left: 64, top: 0, bottom: 0, width: 560, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <Kicker>The popup, on any feed</Kicker>
        <Title>
          One switch. <Mark p={1}>Free</Mark> to start.
        </Title>
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 14 }}>
          {FACTS.map(([big, small]) => (
            <div key={big} style={{ display: "flex", alignItems: "baseline", gap: 18, paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1, width: 96, flexShrink: 0 }}>{big}</span>
              <span style={{ fontSize: 19, color: C.muted }}>{small}</span>
            </div>
          ))}
        </div>
        <Sub style={{ fontSize: 16 }}>Want more? Add your own OpenRouter or TypeSafe key for unlimited.</Sub>
      </div>
      <div style={{ position: "absolute", right: 110, top: (800 - pw * 1.258) / 2, width: pw, borderRadius: 24, overflow: "hidden", boxShadow: shadow, background: C.paper }}>
        <Img src={staticFile("store/popup.png")} style={{ width: pw, display: "block" }} />
      </div>
    </Page>
  );
}

/* ---------------------------------------------------------------- promo tiles */

const PlatformRow = ({ size }: { size: number }) => (
  <div style={{ display: "flex", gap: size * 0.35 }}>
    {(["youtube", "x", "linkedin"] as const).map((p) => <Glyph key={p} platform={p} size={size} />)}
  </div>
);

export function PromoSmall() {
  return (
    <Page style={{ padding: 30, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, fontWeight: 500 }}>
        <Logo size={34} />
        Feed Filter
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 52, lineHeight: 0.95, letterSpacing: "-0.025em" }}>
        Your feeds,
        <br />
        minus the <Mark p={1}>noise.</Mark>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <PlatformRow size={24} />
        <span style={{ fontSize: 14, color: C.muted }}>Blurs clickbait &amp; spam</span>
      </div>
    </Page>
  );
}

const MARQUEE_COLS: string[][] = [
  ["yt-dsa", "x-airdrop", "li-postmortem"],
  ["li-fired", "yt-3am", "x-go"],
  ["x-hashing", "yt-millionaire", "li-synergy"],
];

export function Marquee() {
  return (
    <Page>
      <div style={{ position: "absolute", left: 72, top: 0, bottom: 0, width: 600, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, fontWeight: 500 }}>
          <Logo size={40} />
          Feed Filter
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 92, lineHeight: 0.94, letterSpacing: "-0.03em", marginTop: 28 }}>
          Your feeds,
          <br />
          minus the <Mark p={1}>noise.</Mark>
        </div>
        <div style={{ fontSize: 21, lineHeight: 1.45, color: C.muted, marginTop: 24, maxWidth: 520 }}>
          Blurs clickbait, spam and off-goal posts on YouTube, X and LinkedIn, judged against goals you write.
        </div>
        <div style={{ marginTop: 28 }}>
          <PlatformRow size={30} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 700, top: -110, display: "flex", gap: 22, transform: "rotate(-7deg)", transformOrigin: "top left" }}>
        {MARQUEE_COLS.map((ids, c) => (
          <div key={c} style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: c % 2 ? 120 : 0 }}>
            {ids.map((id) => <Card key={id} item={ITEMS[id]} width={290} blur={isNoise(id) ? 1 : 0} lines={4} />)}
          </div>
        ))}
      </div>
    </Page>
  );
}
