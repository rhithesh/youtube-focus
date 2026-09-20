import { Reveal } from "./Reveal";
import { SectionHead } from "./Section";

const ITEMS = [
  {
    title: "Frost, not delete",
    body: "Flagged tiles get a frosted veil at your blur strength and a corner chip. Hover and the frost fades in 0.18s — the chip dims but stays, so you always know what was flagged. Nothing is ever removed.",
  },
  {
    title: "One request per page",
    body: "Jev evaluates all questions against the same state in a single parallel pass. Twenty listings are sixty questions, ~6.4k tokens, one batch — back in about a second.",
  },
  {
    title: "Rubric-stamped cache",
    body: "Verdicts cache for 7 days, stamped with the goals and thresholds they were judged under. Change either one and the stamp misses — everything re-judges instead of serving stale blocks.",
  },
  {
    title: "Heuristics when keyless",
    body: "No key, no API bill: a regex fallback still catches obvious bait and scam patterns. It can't read your goals, though — goal-fit needs the model.",
  },
  {
    title: "Your key, your endpoint",
    body: "OpenRouter or TypeSafe direct. The key lives in chrome.storage.local and is sent to exactly one place: the endpoint you picked. Nowhere else.",
  },
  {
    title: "Four surfaces, quietly",
    body: "Home, search, sidebar and the Shorts feed — each can be toggled. The immersive Shorts player is left alone, and no verdict is ever reported back anywhere.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHead
            n="04"
            label="Mechanics"
            title={
              <>
                Small, honest <em className="text-brand">machinery.</em>
              </>
            }
            lede="No accounts, no telemetry, no background polling. Six things it actually does — nothing it doesn't."
          />
        </Reveal>

        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.05}>
              <div className="border-t border-line pt-5">
                <p className="font-mono text-[11px] tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-[15.5px] font-semibold tracking-tight">{it.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{it.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
