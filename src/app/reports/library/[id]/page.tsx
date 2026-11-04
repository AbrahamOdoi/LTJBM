import Link from "next/link";
import { ObligationKind } from "@prisma/client";
import { auth } from "@/auth";
import { ReportResultTable } from "@/components/reporting/report-result-table";
import {
  canRunStandardReport,
  getStandardReportMeta,
  runStandardReport,
  type StandardReportId,
} from "@/lib/reporting/standard-reports";
import { listBranchesForUser } from "@/lib/members/queries";
import { notFound, redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function RunStandardReportPage({
  params,
  searchParams,
}: Props) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");

  const { id } = await params;
  const meta = getStandardReportMeta(id);
  if (!meta || !canRunStandardReport(session.user.role, meta.id)) {
    notFound();
  }

  const sp = await searchParams;
  const periodStart = one(sp.periodStart);
  const periodEnd = one(sp.periodEnd);
  const branchId = one(sp.branchId);
  const kindParam = one(sp.kind);
  const kind =
    kindParam &&
    (Object.values(ObligationKind) as string[]).includes(kindParam)
      ? (kindParam as ObligationKind)
      : undefined;

  const hasRun = one(sp.run) === "1";
  const branches = meta.filters.includes("branchId")
    ? await listBranchesForUser({
        id: session.user.id,
        role: session.user.role,
      })
    : [];

  const result = hasRun
    ? await runStandardReport(
        { id: session.user.id, role: session.user.role },
        meta.id as StandardReportId,
        {
          branchId,
          periodStart: periodStart ? new Date(periodStart) : undefined,
          periodEnd: periodEnd ? new Date(periodEnd) : undefined,
          kind,
        },
      )
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm">
          <Link href="/reports/library" className="lt-link">
            ← Standard reports
          </Link>
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          {meta.name}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
          {meta.description}
        </p>
      </div>

      <form
        method="get"
        className="lt-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input type="hidden" name="run" value="1" />
        {meta.filters.includes("branchId") ? (
          <label className="block text-sm">
            <span className="text-[var(--lt-muted)]">Branch</span>
            <select
              name="branchId"
              className="lt-input mt-1"
              defaultValue={branchId ?? ""}
            >
              <option value="">All in scope</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {meta.filters.includes("periodStart") ? (
          <label className="block text-sm">
            <span className="text-[var(--lt-muted)]">From</span>
            <input
              type="date"
              name="periodStart"
              className="lt-input mt-1"
              defaultValue={periodStart ?? ""}
            />
          </label>
        ) : null}
        {meta.filters.includes("periodEnd") ? (
          <label className="block text-sm">
            <span className="text-[var(--lt-muted)]">To</span>
            <input
              type="date"
              name="periodEnd"
              className="lt-input mt-1"
              defaultValue={periodEnd ?? ""}
            />
          </label>
        ) : null}
        {meta.filters.includes("kind") ? (
          <label className="block text-sm">
            <span className="text-[var(--lt-muted)]">Contribution kind</span>
            <select
              name="kind"
              className="lt-input mt-1"
              defaultValue={kindParam ?? ""}
            >
              <option value="">All kinds</option>
              <option value="Pledge">Pledge</option>
              <option value="Tithe">Tithe</option>
              <option value="Dues">Dues</option>
              <option value="SpecialProject">Special Project</option>
              <option value="Thanksgiving">Thanksgiving</option>
            </select>
          </label>
        ) : null}
        <div className="flex items-end">
          <button type="submit" className="lt-btn-primary">
            Run report
          </button>
        </div>
      </form>

      {result ? (
        <ReportResultTable
          title={result.meta.name}
          summary={result.summary}
          columns={result.columns}
          rows={result.rows}
          generatedAt={result.generatedAt}
        />
      ) : (
        <p className="text-sm text-[var(--lt-muted)]">
          Choose filters and run the report to preview, print, or export CSV.
        </p>
      )}
    </div>
  );
}
