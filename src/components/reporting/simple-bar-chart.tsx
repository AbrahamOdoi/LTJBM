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
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-medium text-slate-700">{title}</h3>
      <ul className="space-y-2">
        {data.map((row) => {
          const pct = Math.max(2, Math.round((row.value / max) * 100));
          return (
            <li key={row.label} className="space-y-1">
              <div className="flex justify-between gap-2 text-xs text-slate-600">
                <span>{row.label}</span>
                <span className="tabular-nums">{formatGhs(row.value)}</span>
              </div>
              <div className="h-2 rounded bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded bg-teal-700/80 transition-[width] duration-500"
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
