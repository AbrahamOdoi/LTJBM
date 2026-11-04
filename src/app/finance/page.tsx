import { auth } from "@/auth";
import { MoneyCell } from "@/components/finance/money-cell";
import { getBalanceRollup, listCollectionBatches } from "@/lib/finance/service";
import { canWriteFinance } from "@/lib/roles";
import Link from "next/link";

export default async function FinancePage() {
  const session = await auth();
  const role = session?.user?.role;
  const [rollup, batches] = await Promise.all([
    getBalanceRollup({}),
    listCollectionBatches(),
  ]);
  const openVariances = batches.filter((b) => b.hasVariance);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Finance overview</h2>
        <p className="mt-1 text-slate-600">
          Post pledges, special projects, and Saturday collections here. Totals
          feed Board reports automatically
          {canWriteFinance(role)
            ? " — you can post and reconcile."
            : " — your account is read-only on this surface."}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Expected" value={rollup.totals.expected} />
        <SummaryTile label="Paid" value={rollup.totals.paid} emphasize="ok" />
        <SummaryTile
          label="Outstanding"
          value={rollup.totals.outstanding}
          emphasize={rollup.totals.outstanding > 0 ? "warn" : "ok"}
        />
      </section>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Obligations</th>
              <th className="px-4 py-3 font-medium">Expected</th>
              <th className="px-4 py-3 font-medium">Paid</th>
              <th className="px-4 py-3 font-medium">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {rollup.byKind.map((row) => (
              <tr key={row.kind} className="border-t border-slate-100">
                <td className="px-4 py-3">{row.kind}</td>
                <td className="px-4 py-3 tabular-nums">{row.obligationCount}</td>
                <td className="px-4 py-3">
                  <MoneyCell value={row.expected} />
                </td>
                <td className="px-4 py-3">
                  <MoneyCell value={row.paid} emphasize="ok" />
                </td>
                <td className="px-4 py-3">
                  <MoneyCell
                    value={row.outstanding}
                    emphasize={row.outstanding > 0 ? "warn" : "muted"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/finance/obligations"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Manage obligations
        </Link>
        <Link
          href="/finance/batches"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Saturday batches
          {openVariances.length > 0
            ? ` (${openVariances.length} variance)`
            : ""}
        </Link>
        <Link
          href="/finance/arrears"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Dues arrears
        </Link>
      </section>

      <p className="text-xs text-slate-500">
        After you post a payment, open <Link href="/reports" className="text-sky-800 hover:underline">Reports</Link>{" "}
        to show the Board dashboard refreshing without a manual rebuild.
      </p>
    </div>
  );
}

function SummaryTile({
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
