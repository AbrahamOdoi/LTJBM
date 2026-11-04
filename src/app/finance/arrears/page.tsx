import { EmptyState } from "@/components/empty-state";
import { MoneyCell } from "@/components/finance/money-cell";
import { prisma } from "@/lib/db";
import { listDuesArrears } from "@/lib/finance/service";
import Link from "next/link";

export default async function ArrearsPage({
  searchParams,
}: {
  searchParams: Promise<{
    memberId?: string;
    fellowshipMinistryId?: string;
    cellId?: string;
    periodStart?: string;
    periodEnd?: string;
  }>;
}) {
  const params = await searchParams;
  const [fellowships, cells, arrears] = await Promise.all([
    prisma.fellowshipMinistry.findMany({ orderBy: { name: "asc" } }),
    prisma.cell.findMany({
      orderBy: { name: "asc" },
      include: { branch: { select: { name: true } } },
    }),
    listDuesArrears({
      memberId: params.memberId,
      fellowshipMinistryId: params.fellowshipMinistryId,
      cellId: params.cellId,
      periodStart: params.periodStart
        ? new Date(params.periodStart)
        : undefined,
      periodEnd: params.periodEnd ? new Date(params.periodEnd) : undefined,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Dues arrears</h2>
        <p className="mt-1 text-slate-600">
          Outstanding dues by member, group (cell / fellowship), and period.
        </p>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block text-sm">
          <span className="text-slate-600">Fellowship</span>
          <select
            name="fellowshipMinistryId"
            defaultValue={params.fellowshipMinistryId ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Any</option>
            {fellowships.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Cell</span>
          <select
            name="cellId"
            defaultValue={params.cellId ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Any</option>
            {cells.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.branch.name})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Period start ≥</span>
          <input
            type="date"
            name="periodStart"
            defaultValue={params.periodStart ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">Period start ≤</span>
          <input
            type="date"
            name="periodEnd"
            defaultValue={params.periodEnd ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Filter
          </button>
        </div>
      </form>

      <p className="text-sm text-slate-600">
        {arrears.length} member obligation
        {arrears.length === 1 ? "" : "s"} in arrears
      </p>

      {arrears.length === 0 ? (
        <EmptyState
          title="No dues arrears for this filter"
          body="Clear filters to see all outstanding dues, or open Obligations to confirm dues were posted for the period."
          actionHref="/finance/obligations?kind=Dues"
          actionLabel="View dues obligations"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Groups</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Expected</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {arrears.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/finance/obligations/${row.id}`}
                      className="font-medium text-sky-800 hover:underline"
                    >
                      {row.member.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.groups.length === 0
                      ? "—"
                      : row.groups
                          .map((g) =>
                            g.kind === "Cell"
                              ? g.cell?.name
                              : g.fellowshipMinistry?.name,
                          )
                          .filter(Boolean)
                          .join(", ")}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.periodStart.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell value={row.balances.expected} />
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell value={row.balances.paid} emphasize="ok" />
                  </td>
                  <td className="px-4 py-3">
                    <MoneyCell value={row.balances.outstanding} emphasize="warn" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
