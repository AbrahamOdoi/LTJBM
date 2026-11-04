import { auth } from "@/auth";
import { MoneyCell } from "@/components/finance/money-cell";
import { obligationKindLabel } from "@/lib/church-labels";
import { getBalanceRollup, listCollectionBatches } from "@/lib/finance/service";
import { canWriteFinance } from "@/lib/roles";
import Link from "next/link";

export default async function FinancePage() {
  const session = await auth();
  const role = session?.user?.role;
  const [rollup, varianceBatches] = await Promise.all([
    getBalanceRollup({}),
    listCollectionBatches({ variance: "open", page: 1, pageSize: 1 }),
  ]);
  const openVarianceCount = varianceBatches.total;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Contributions overview
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
          Record pledges, tithes, dues, thanksgiving, and special project
          contributions at Head Office. Totals feed Board reports automatically
          {canWriteFinance(role)
            ? " — you may post and reconcile."
            : " — your account is read-only here."}
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

      <section className="lt-table-wrap">
        <table className="min-w-full text-sm">
            <thead className="bg-[#f9fafb] text-left text-[var(--lt-muted)]">
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
              <tr
                key={row.kind}
                className="border-t border-[var(--lt-line)]/70"
              >
                <td className="px-4 py-3 font-medium text-[var(--lt-ink)]">
                  {obligationKindLabel(row.kind)}
                </td>
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
        <Link href="/finance/obligations" className="lt-btn-primary">
          Pledges &amp; obligations
        </Link>
        <Link href="/finance/batches?variance=open" className="lt-btn-secondary">
          Saturday collection batches
          {openVarianceCount > 0 ? ` (${openVarianceCount} variance)` : ""}
        </Link>
        <Link href="/finance/arrears" className="lt-btn-secondary">
          Dues arrears
        </Link>
      </section>

      <p className="text-xs text-[var(--lt-muted)]">
        Board totals update when payments are posted. Open{" "}
        <Link href="/reports" className="lt-link">
          Reports
        </Link>{" "}
        for Expected / Paid / Outstanding. Named givers stay on this surface.
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
    <div className="lt-panel p-4">
      <p className="text-sm text-[var(--lt-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        <MoneyCell value={value} emphasize={emphasize} />
      </p>
    </div>
  );
}
