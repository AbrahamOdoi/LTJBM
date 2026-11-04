import { auth } from "@/auth";
import { MoneyCell } from "@/components/finance/money-cell";
import { UpdateBatchForm } from "@/components/finance/update-batch-form";
import { getCollectionBatch } from "@/lib/finance/service";
import { canWriteFinance } from "@/lib/roles";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = { params: Promise<{ id: string }> };

export default async function BatchDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const canWrite = canWriteFinance(session?.user?.role);
  const batch = await getCollectionBatch(id);
  if (!batch) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/finance/batches"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Batches
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {batch.label}
        </h2>
        <p className="mt-1 text-slate-600">
          {batch.batchDate.slice(0, 10)} · {batch.paymentCount} payment
          {batch.paymentCount === 1 ? "" : "s"}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <Tile label="Counted" value={batch.countedTotal} />
        <Tile label="System total" value={batch.systemTotal} />
        <Tile
          label="Variance"
          value={batch.varianceAmount}
          emphasize={batch.hasVariance ? "warn" : "ok"}
        />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Flag</p>
          <p className="mt-2">
            {batch.hasVariance ? (
              <span className="rounded bg-amber-100 px-2 py-1 text-sm font-medium text-amber-800">
                Variance flagged
              </span>
            ) : (
              <span className="rounded bg-emerald-100 px-2 py-1 text-sm font-medium text-emerald-800">
                Balanced
              </span>
            )}
          </p>
        </div>
      </section>

      <UpdateBatchForm
        batchId={batch.id}
        countedTotal={batch.countedTotal}
        label={batch.label}
        notes={batch.notes}
        canWrite={canWrite}
      />

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {batch.payments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-500">
                  No payments linked yet. Post payments against Tithe /
                  Thanksgiving / Dues and select this batch.
                </td>
              </tr>
            )}
            {batch.payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 tabular-nums">
                  {p.paidAt.slice(0, 10)}
                </td>
                <td className="px-4 py-3">
                  {"obligation" in p && p.obligation ? (
                    <Link
                      href={`/finance/obligations/${p.obligationId}`}
                      className="text-sky-800 hover:underline"
                    >
                      {p.obligation.member.name}
                    </Link>
                  ) : (
                    p.obligationId
                  )}
                </td>
                <td className="px-4 py-3">
                  {"obligation" in p && p.obligation
                    ? p.obligation.typeName
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <MoneyCell value={p.amount} emphasize="ok" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Tile({
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
      <p className="mt-1 text-xl">
        <MoneyCell value={value} emphasize={emphasize} />
      </p>
    </div>
  );
}
