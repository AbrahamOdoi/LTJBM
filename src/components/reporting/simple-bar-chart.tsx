import { formatGhs } from "@/lib/finance/money";

export type BarDatum = {
  label: string;
  value: number;
};

/** Lightweight CSS bar chart — no chart library dependency for MVP/demo. */
export function SimpleBarChart({
  title,
  data,
}: {
  title: string;
  data: BarDatum[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="lt-panel space-y-3 p-4">
      <h3 className="text-sm font-medium text-[var(--lt-ink-soft)]">{title}</h3>
      <ul className="space-y-2">
        {data.map((row) => {
          const pct = Math.max(2, Math.round((row.value / max) * 100));
          return (
            <li key={row.label} className="space-y-1">
              <div className="flex justify-between gap-2 text-xs text-[var(--lt-muted)]">
                <span>{row.label}</span>
                <span className="tabular-nums">{formatGhs(row.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-[#e8efeb]">
                <div
                  className="h-full rounded bg-[var(--lt-accent)] transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
