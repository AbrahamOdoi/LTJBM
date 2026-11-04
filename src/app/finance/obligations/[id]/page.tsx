import { auth } from "@/auth";
import { AddPaymentForm } from "@/components/finance/add-payment-form";
import { MoneyCell } from "@/components/finance/money-cell";
import {
  getObligation,
  listCollectionBatches,
} from "@/lib/finance/service";
import { canWriteFinance } from "@/lib/roles";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = { params: Promise<{ id: string }> };

export default async function ObligationDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await auth();
  const canWrite = canWriteFinance(session?.user?.role);
  const [obligation, batchPage] = await Promise.all([
    getObligation(id),
    listCollectionBatches({ page: 1, pageSize: 100 }),
  ]);
  const batches = batchPage.items;

  if (!obligation) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/finance/obligations"
          className="text-sm text-sky-700 hover:underline"
        >
          ← Obligations
        </Link>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {obligation.obligationType.name} — {obligation.member.name}
        </h2>
        <p className="mt-1 text-slate-600">
          Period {obligation.periodStart.slice(0, 10)}
          {obligation.periodEnd
            ? ` → ${obligation.periodEnd.slice(0, 10)}`
            : ""}
          {obligation.instalmentCount
            ? ` · ${obligation.instalmentCount} instalments`
            : ""}
          {obligation.projectTargetAmount != null
            ? ` · project target GH₵ ${obligation.projectTargetAmount.toFixed(2)}`
            : ""}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <BalanceTile label="Expected" value={obligation.balances.expected} />
        <BalanceTile
          label="Paid"
          value={obligation.balances.paid}
          emphasize="ok"
        />
        <BalanceTile
          label="Outstanding"
          value={obligation.balances.outstanding}
          emphasize={obligation.balances.outstanding > 0 ? "warn" : "ok"}
        />
      </section>

      <AddPaymentForm
        obligationId={obligation.id}
        canWrite={canWrite}
        batches={batches.map((b) => ({
          id: b.id,
          label: b.label,
          batchDate: b.batchDate,
        }))}
      />

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Batch</th>
            </tr>
          </thead>
          <tbody>
            {obligation.payments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  No payments posted yet.
                </td>
              </tr>
            )}
            {obligation.payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 tabular-nums">
                  {p.paidAt.slice(0, 10)}
                </td>
                <td className="px-4 py-3">
                  <MoneyCell value={p.amount} emphasize="ok" />
                </td>
                <td className="px-4 py-3">{p.method ?? "—"}</td>
                <td className="px-4 py-3">{p.reference ?? "—"}</td>
                <td className="px-4 py-3">
                  {p.batchId ? (
                    <Link
                      href={`/finance/batches/${p.batchId}`}
                      className="text-sky-700 hover:underline"
                    >
                      View batch
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function BalanceTile({
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
