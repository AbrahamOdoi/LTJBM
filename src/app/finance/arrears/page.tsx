import { DataTable, DataTableFilterBar } from "@/components/data-table";
import { MoneyCell } from "@/components/finance/money-cell";
import { prisma } from "@/lib/db";
import { parsePageParams } from "@/lib/data-table";
import { listDuesArrears } from "@/lib/finance/service";
import Link from "next/link";

export default async function ArrearsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    memberId?: string;
    fellowshipMinistryId?: string;
    cellId?: string;
    periodStart?: string;
    periodEnd?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  const { page, pageSize } = parsePageParams(params);
  const [fellowships, cells, listed] = await Promise.all([
    prisma.fellowshipMinistry.findMany({ orderBy: { name: "asc" } }),
    prisma.cell.findMany({
      orderBy: { name: "asc" },
      include: { branch: { select: { name: true } } },
    }),
    listDuesArrears({
      memberId: params.memberId,
      fellowshipMinistryId: params.fellowshipMinistryId,
      cellId: params.cellId,
      q: params.q,
      periodStart: params.periodStart
        ? new Date(params.periodStart)
        : undefined,
      periodEnd: params.periodEnd ? new Date(params.periodEnd) : undefined,
      page,
      pageSize,
    }),
  ]);

  const filters = {
    q: params.q,
    memberId: params.memberId,
    fellowshipMinistryId: params.fellowshipMinistryId,
    cellId: params.cellId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Dues arrears
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          Outstanding dues by member, group (cell / fellowship), and period.
        </p>
      </div>

      <DataTableFilterBar className="sm:grid-cols-2 lg:grid-cols-3" submitLabel="Filter">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search member name or number…"
          className="lt-input"
        />
        <select
          name="fellowshipMinistryId"
          defaultValue={params.fellowshipMinistryId ?? ""}
          className="lt-input"
        >
          <option value="">Any fellowship</option>
          {fellowships.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <select
          name="cellId"
          defaultValue={params.cellId ?? ""}
          className="lt-input"
        >
          <option value="">Any cell</option>
          {cells.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.branch.name})
            </option>
          ))}
        </select>
        <label className="block text-sm text-[var(--lt-muted)]">
          Period start ≥
          <input
            type="date"
            name="periodStart"
            defaultValue={params.periodStart ?? ""}
            className="lt-input mt-1"
          />
        </label>
        <label className="block text-sm text-[var(--lt-muted)]">
          Period start ≤
          <input
            type="date"
            name="periodEnd"
            defaultValue={params.periodEnd ?? ""}
            className="lt-input mt-1"
          />
        </label>
      </DataTableFilterBar>

      <p className="text-sm text-[var(--lt-muted)]">
        {listed.total} member obligation
        {listed.total === 1 ? "" : "s"} in arrears
      </p>

      <DataTable
        columns={[
          { key: "member", header: "Member" },
          { key: "groups", header: "Groups" },
          { key: "period", header: "Period" },
          { key: "expected", header: "Expected" },
          { key: "paid", header: "Paid" },
          { key: "outstanding", header: "Outstanding" },
        ]}
        rows={listed.items}
        rowKey={(row) => row.id}
        emptyTitle="No dues arrears for this filter"
        emptyBody="Clear filters to see all outstanding dues, or open Obligations to confirm dues were posted for the period."
        emptyActionHref="/finance/obligations?kind=Dues"
        emptyActionLabel="View dues obligations"
        pagination={{
          pathname: "/finance/arrears",
          filters,
          result: listed,
          noun: "arrears rows",
        }}
        renderCell={(row, key) => {
          switch (key) {
            case "member":
              return (
                <Link
                  href={`/finance/obligations/${row.id}`}
                  className="lt-link"
                >
                  {row.member.name}
                </Link>
              );
            case "groups":
              return (
                <span className="text-[var(--lt-muted)]">
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
                </span>
              );
            case "period":
              return (
                <span className="tabular-nums">
                  {row.periodStart.slice(0, 10)}
                </span>
              );
            case "expected":
              return <MoneyCell value={row.balances.expected} />;
            case "paid":
              return <MoneyCell value={row.balances.paid} emphasize="ok" />;
            case "outstanding":
              return (
                <MoneyCell value={row.balances.outstanding} emphasize="warn" />
              );
            default:
              return null;
          }
        }}
      />
    </div>
  );
}
