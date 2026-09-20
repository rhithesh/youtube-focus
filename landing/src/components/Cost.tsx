import { Reveal } from "./Reveal";
import { SectionHead } from "./Section";

const ROWS = [
  { k: "Judge input", v: "$0.042 / Mtok" },
  { k: "Judge output", v: "$0 — free" },
  { k: "One page · 20 listings · 60 questions · ~6.4k tok", v: "≈ $0.00027" },
  { k: "A thousand pages", v: "≈ $0.27" },
  { k: "Repeat visits · verdicts cached 7 days", v: "$0" },
  { k: "No API key · heuristics only", v: "$0" },
];

export function Cost() {
  return (
    <section id="cost" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <SectionHead
            n="05"
            label="The bill"
            title={
              <>
                Measured, not <em className="text-brand">estimated.</em>
              </>
            }
            lede="Pricing from the endpoint's own meter, verified with the extension's test call. Output tokens are free — the whole page rides on input."
          />
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
          <Reveal>
            <dl>
              {ROWS.map((r) => (
                <div key={r.k} className="flex items-baseline justify-between gap-6 border-t border-line py-4 last:border-b">
                  <dt className="text-[14px] text-muted">{r.k}</dt>
                  <dd className="shrink-0 font-mono text-[13px] tabular-nums text-ink">{r.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-[13.5px] leading-relaxed text-muted">
              One request judges the whole visible page at once — 20 listings, 60 questions. Batching more would
              only repeat the title text; batching less would waste the round-trip.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-lg border border-line bg-white p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Per feed page</p>
              <p className="mt-3 font-display text-[clamp(44px,5vw,64px)] leading-none tracking-[-0.01em]">
                $0.00027
              </p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
                Roughly what a single search query costs elsewhere — except it judges twenty listings against{" "}
                <span className="text-ink">your</span> goals, and the answer is cached for a week.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
