import { ReactNode } from "react";

export function SectionHead({
  n,
  label,
  title,
  lede,
}: {
  n: string;
  label: string;
  title: ReactNode;
  lede?: ReactNode;
}) {
  return (
    <div className="grid gap-6 border-t border-line pt-8 md:grid-cols-[1fr_300px] md:items-end">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          <span className="text-brand">{n}</span> · {label}
        </p>
        <h2 className="mt-5 font-display text-[clamp(38px,4.6vw,60px)] leading-[1.02] tracking-[-0.01em]">
          {title}
        </h2>
      </div>
      {lede && (
        <p className="max-w-sm text-[15px] leading-relaxed text-muted md:pb-1.5">{lede}</p>
      )}
    </div>
  );
}
