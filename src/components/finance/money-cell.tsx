import { formatGhs } from "@/lib/finance/money";

export function MoneyCell({
  value,
  emphasize,
}: {
  value: number;
  emphasize?: "ok" | "warn" | "muted";
}) {
  const color =
    emphasize === "warn"
      ? "text-[var(--lt-warn)]"
      : emphasize === "ok"
        ? "text-[var(--lt-ok)]"
        : emphasize === "muted"
          ? "text-[var(--lt-muted)]"
          : "text-[var(--lt-ink)]";
  return <span className={`tabular-nums font-medium ${color}`}>{formatGhs(value)}</span>;
}
