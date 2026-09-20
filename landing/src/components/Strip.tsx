const LINES = [
  { tag: "SPAM", cls: "text-spam", rest: "Wealth Signals — junk 94%" },
  { tag: "CLICK-BAIT", cls: "text-brand", rest: "DramaDaily — bait 3.0/3 · 91% conf" },
  { tag: "ALLOW", cls: "text-muted", rest: "Systems Weekly — bait 0.2/3 · Rust ownership" },
  { tag: "ALLOW", cls: "text-muted", rest: "DB Deep Dives — Postgres indexes, visually" },
  { tag: "OFF-GOAL", cls: "text-muted", rest: "GamingClips — off-goal 2.8/3 · 87% conf" },
  { tag: "ALLOW", cls: "text-muted", rest: "VitalHacks — kept · conf 48% under the gate" },
  { tag: "SPAM", cls: "text-spam", rest: "AirdropDaily — keyword match · no key needed" },
  { tag: "ALLOW", cls: "text-muted", rest: "BuildLog — bait 1.6/3 · honest results" },
];

function Row() {
  return (
    <div className="flex shrink-0 items-center">
      {LINES.map((l, i) => (
        <span key={i} className="flex items-center whitespace-nowrap font-mono text-[11px] tracking-wide">
          <span className={`uppercase ${l.cls}`}>{l.tag}</span>
          <span className="text-muted">&nbsp;— {l.rest}</span>
          <span className="mx-6 text-line">·</span>
        </span>
      ))}
    </div>
  );
}

export function Strip() {
  return (
    <div className="marquee mt-20 overflow-hidden border-y border-line py-3.5">
      <div className="marquee-track flex w-max">
        <Row />
        <Row />
      </div>
    </div>
  );
}
