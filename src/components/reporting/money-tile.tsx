import { MoneyCell } from "@/components/finance/money-cell";

export function MoneyTile({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: "ok" | "warn";
}) {
  return (
    <div className="lt-panel p-4">
      <p className="text-sm text-[var(--lt-muted)]">{label}</p>
      <p className="mt-1 font-display text-2xl">
        <MoneyCell value={value} emphasize={emphasize} />
      </p>
    </div>
  );
}
