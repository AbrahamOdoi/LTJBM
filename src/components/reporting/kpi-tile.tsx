import { MoneyCell } from "@/components/finance/money-cell";

export function KpiTile({
  label,
  value,
  format,
  emphasize,
}: {
  label: string;
  value: number;
  format: "count" | "money";
  emphasize?: "ok" | "warn" | "muted";
}) {
  return (
    <div className="lt-panel p-4">
      <p className="text-sm text-[var(--lt-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[var(--lt-ink)]">
        {format === "money" ? (
          <MoneyCell
            value={value}
            emphasize={emphasize === "muted" ? undefined : emphasize}
          />
        ) : (
          <span
            className={
              emphasize === "warn"
                ? "text-[var(--lt-warn)]"
                : emphasize === "ok"
                  ? "text-[var(--lt-ok)]"
                  : undefined
            }
          >
            {value.toLocaleString()}
          </span>
        )}
      </p>
    </div>
  );
}
