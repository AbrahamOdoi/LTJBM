import { auth } from "@/auth";
import { CreateBatchForm } from "@/components/finance/create-batch-form";
import { MoneyCell } from "@/components/finance/money-cell";
import { listCollectionBatches } from "@/lib/finance/service";
import { canWriteFinance } from "@/lib/roles";
import Link from "next/link";

export default async function BatchesPage() {
  const session = await auth();
  const canWrite = canWriteFinance(session?.user?.role);
  const batches = await listCollectionBatches();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Saturday collection batches
        </h2>
        <p className="mt-1 text-slate-600">
          Reconcile counted cash/MoMo totals against system payment totals.
          Variance is flagged when they differ.
        </p>
      </div>

      <CreateBatchForm canWrite={canWrite} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Label</th>
              <th className="px-4 py-3 font-medium">Counted</th>
              <th className="px-4 py-3 font-medium">System</th>
              <th className="px-4 py-3 font-medium">Variance</th>
              <th className="px-4 py-3 font-medium">Flag</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  No batches yet.
                </td>
              </tr>
            )}
            {batches.map((b) => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="px-4 py-3 tabular-nums">
                  <Link
                    href={`/finance/batches/${b.id}`}
                    className="font-medium text-sky-800 hover:underline"
                  >
                    {b.batchDate.slice(0, 10)}
                  </Link>
                </td>
                <td className="px-4 py-3">{b.label}</td>
                <td className="px-4 py-3">
                  <MoneyCell value={b.countedTotal} />
                </td>
                <td className="px-4 py-3">
                  <MoneyCell value={b.systemTotal} />
                </td>
                <td className="px-4 py-3">
                  <MoneyCell
                    value={b.varianceAmount}
                    emphasize={b.hasVariance ? "warn" : "muted"}
                  />
                </td>
                <td className="px-4 py-3">
                  {b.hasVariance ? (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Variance
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      Balanced
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
