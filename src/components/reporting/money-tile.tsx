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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl">
        <MoneyCell value={value} emphasize={emphasize} />
      </p>
    </div>
  );
}
