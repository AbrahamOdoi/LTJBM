import { auth } from "@/auth";
import { CreateBatchForm } from "@/components/finance/create-batch-form";
import { MoneyCell } from "@/components/finance/money-cell";
import { DataTable, DataTableFilterBar } from "@/components/data-table";
import { parsePageParams } from "@/lib/data-table";
import { listCollectionBatches } from "@/lib/finance/service";
import { canWriteFinance } from "@/lib/roles";
import Link from "next/link";

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    variance?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const session = await auth();
  const canWrite = canWriteFinance(session?.user?.role);
  const sp = await searchParams;
  const { page, pageSize } = parsePageParams(sp);
  const listed = await listCollectionBatches({
    q: sp.q,
    variance: sp.variance,
    page,
    pageSize,
  });
  const filters = { q: sp.q, variance: sp.variance };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Saturday collection batches
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          Reconcile counted cash/MoMo totals against system payment totals.
          Variance is flagged when they differ.
        </p>
      </div>

      <DataTableFilterBar className="sm:grid-cols-[1fr_200px_auto]" submitLabel="Filter">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search label or notes…"
          className="lt-input"
        />
        <select
          name="variance"
          defaultValue={sp.variance ?? ""}
          className="lt-input"
        >
          <option value="">All batches</option>
          <option value="open">Open variance</option>
          <option value="balanced">Balanced</option>
        </select>
      </DataTableFilterBar>

      <CreateBatchForm canWrite={canWrite} />

      <DataTable
        columns={[
          { key: "date", header: "Date" },
          { key: "label", header: "Label" },
          { key: "counted", header: "Counted" },
          { key: "system", header: "System" },
          { key: "variance", header: "Variance" },
          { key: "flag", header: "Flag" },
        ]}
        rows={listed.items}
        rowKey={(b) => b.id}
        emptyTitle="No Saturday batches yet"
        emptyBody={
          canWrite
            ? "Create a batch with a counted total. If it differs from the system payment sum, the variance flag appears for reconciliation."
            : "Ask a Financial Secretary to open a Saturday collection batch for the demo."
        }
        pagination={{
          pathname: "/finance/batches",
          filters,
          result: listed,
          noun: "batches",
        }}
        renderCell={(b, key) => {
          switch (key) {
            case "date":
              return (
                <Link
                  href={`/finance/batches/${b.id}`}
                  className="lt-link tabular-nums"
                >
                  {b.batchDate.slice(0, 10)}
                </Link>
              );
            case "label":
              return b.label;
            case "counted":
              return <MoneyCell value={b.countedTotal} />;
            case "system":
              return <MoneyCell value={b.systemTotal} />;
            case "variance":
              return (
                <MoneyCell
                  value={b.varianceAmount}
                  emphasize={b.hasVariance ? "warn" : "muted"}
                />
              );
            case "flag":
              return b.hasVariance ? (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Variance
                </span>
              ) : (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  Balanced
                </span>
              );
            default:
              return null;
          }
        }}
      />
    </div>
  );
}
