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
      ? "text-amber-700"
      : emphasize === "ok"
        ? "text-emerald-700"
        : emphasize === "muted"
          ? "text-slate-500"
          : "text-slate-900";
  return <span className={`tabular-nums font-medium ${color}`}>{formatGhs(value)}</span>;
}
