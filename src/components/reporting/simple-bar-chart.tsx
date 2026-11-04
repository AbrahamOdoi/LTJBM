import { formatGhs } from "@/lib/finance/money";

export type BarDatum = {
  label: string;
  value: number;
};

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
      <h3 className="text-sm font-medium text-[var(--lt-ink)]">{title}</h3>
      <ul className="space-y-2">
        {data.map((row) => {
          const pct = Math.max(2, Math.round((row.value / max) * 100));
          return (
            <li key={row.label} className="space-y-1">
              <div className="flex justify-between gap-2 text-xs text-[var(--lt-muted)]">
                <span>{row.label}</span>
                <span className="tabular-nums">{formatGhs(row.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-[#eef0f3]">
                <div
                  className="h-full rounded bg-[var(--lt-accent)]"
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
