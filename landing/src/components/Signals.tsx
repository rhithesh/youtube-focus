import { Reveal } from "./Reveal";
import { SectionHead } from "./Section";

const BAIT_LEVELS = [
  "Plain and accurate. The title says what the video contains.",
  "Mildly promotional. Punchy phrasing, still honest.",
  "Clear clickbait. Withheld payoff, shock claims, fake urgency.",
  "Pure engagement bait. The title misrepresents the video.",
];

const GOAL_LEVELS = [
  "Directly advances your goals. Worth seeking out.",
  "Useful and adjacent. Plausibly worth the time.",
  "Tangential. Same area, mostly commentary or entertainment.",
  "Unrelated distraction. Drama, time-filler, noise.",
];

const JUNK = {
  q: "Is this spam, a scam, or mass-produced filler?",
  yes: "Crypto pitches, fake giveaways, engagement farming, AI slop, re-uploads, misleading medical or financial claims.",
  no: "A genuine video from a real channel, whatever its quality or subject.",
};

const ORDER = [
  { tag: "SPAM", cls: "bg-spam", rule: "junk ≥ 0.85" },
  { tag: "CLICK-BAIT", cls: "bg-brand", rule: "bait ≥ 2.0 · conf ≥ 0.5" },
  { tag: "OFF-GOAL", cls: "bg-[#8a867d]", rule: "goal ≥ 2.6 · conf ≥ 0.5" },
  { tag: "ALLOW", cls: "bg-line", rule: "otherwise — nothing is hidden" },
];

function LevelList({ levels }: { levels: string[] }) {
  return (
    <ul>
      {levels.map((l, i) => (
        <li key={i} className="flex gap-3 border-t border-line py-3 first:border-t-0">
          <span className="font-mono text-[11px] tabular-nums text-muted">{i}</span>
          <span className="text-[13.5px] leading-relaxed text-ink">{l}</span>
        </li>
      ))}
    </ul>
  );
}

function Question({
  n,
  name,
  kind,
  children,
}: {
  n: string;
  name: string;
  kind: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 pb-3">
        <h3 className="text-[15px] font-semibold tracking-tight">
          <span className="font-mono text-[11px] font-normal text-brand">{n}</span> {name}
        </h3>
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted">{kind}</span>
      </div>
      {children}
    </div>
  );
}

export function Signals() {
  return (
    <section id="how" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHead
            n="03"
            label="How it judges"
            title={
              <>
                Three questions,
                <br />
                every <em className="text-brand">listing.</em>
              </>
            }
            lede="Jev answers every question against the same state in one parallel pass — so a whole feed page fits in a single request."
          />
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
            <Question n="Q1" name="How much clickbait?" kind="score 0–3">
              <LevelList levels={BAIT_LEVELS} />
            </Question>
            <Question n="Q2" name="How far from your goals?" kind="score 0–3">
              <LevelList levels={GOAL_LEVELS} />
            </Question>
            <Question n="Q3" name={JUNK.q} kind="yes / no">
              <ul>
                <li className="border-t border-line py-3 first:border-t-0">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-spam">Yes</span>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{JUNK.yes}</p>
                </li>
                <li className="border-t border-line py-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted">No</span>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink">{JUNK.no}</p>
                </li>
              </ul>
            </Question>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="mt-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">How a verdict is picked</p>
            <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
              {ORDER.map((o, i) => (
                <div key={o.tag} className="bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className={`inline-block rounded px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-white ${o.cls}`}>
                      {o.tag}
                    </span>
                    <span className="font-mono text-[11px] text-muted">{i + 1}</span>
                  </div>
                  <p className="mt-3 font-mono text-[12px] tabular-nums text-ink">{o.rule}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-muted">
              Rules run top to bottom and the first hit wins. Every block is confidence-gated — a high score the
              model isn&apos;t sure about never hides anything. No API key? Keyword heuristics still catch the obvious
              bait and scams; goal-fit needs Jev.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
