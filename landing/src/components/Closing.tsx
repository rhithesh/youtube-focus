import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="border-t border-line pt-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              <span className="text-brand">08</span> · Nothing is ever deleted
            </p>
            <h2 className="mt-6 max-w-4xl font-display text-[clamp(48px,7.5vw,96px)] leading-[0.95] tracking-[-0.01em]">
              Go frost <em className="text-brand">your</em> feed.
            </h2>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href="#install"
                className="rounded-lg bg-ink px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand"
              >
                Download the extension
              </a>
              <p className="font-mono text-[11.5px] text-muted">
                free · sideload today · store listing soon
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11.5px] text-muted">
          Feed Filter · Chrome · MV3 · v1.0.0
        </p>
        <nav className="flex gap-5">
          {[
            ["Demo", "#demo"],
            ["How it judges", "#how"],
            ["Install", "#install"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="text-[13px] text-muted transition-colors hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <p className="font-mono text-[11.5px] text-muted">Not affiliated with YouTube</p>
      </div>
    </footer>
  );
}
