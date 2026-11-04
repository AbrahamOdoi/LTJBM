import Link from "next/link";
import { auth } from "@/auth";
import { CustomReportBuilder } from "@/components/reporting/custom-report-builder";
import { ReportResultTable } from "@/components/reporting/report-result-table";
import {
  canUseCustomDataset,
  columnsForDataset,
  getSavedReport,
  runSavedReport,
  type CustomDataset,
} from "@/lib/reporting/custom-reports";
import { notFound, redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SavedCustomReportPage({
  params,
  searchParams,
}: Props) {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");

  const { id } = await params;
  const user = { id: session.user.id, role: session.user.role };
  const saved = await getSavedReport(user, id);
  if (!saved) notFound();

  const sp = await searchParams;
  const runFlag = Array.isArray(sp.run) ? sp.run[0] : sp.run;
  const result = runFlag === "1" ? await runSavedReport(user, id) : null;

  const allowedDatasets = (
    ["members", "contributions"] as CustomDataset[]
  ).filter((d) => canUseCustomDataset(session.user.role, d));

  return (
    <div className="space-y-8">
      <p className="text-sm">
        <Link href="/reports/builder" className="lt-link">
          ← Custom reports
        </Link>
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            {saved.name}
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Saved for {saved.roleScope}
            {saved.description ? ` · ${saved.description}` : ""}
          </p>
        </div>
        <Link
          href={`/reports/builder/${saved.id}?run=1`}
          className="lt-btn-primary"
        >
          Run saved report
        </Link>
      </div>

      {result ? (
        <ReportResultTable
          title={result.name}
          summary={result.summary}
          columns={result.columns}
          rows={result.rows}
          generatedAt={result.generatedAt}
        />
      ) : null}

      <CustomReportBuilder
        allowedDatasets={allowedDatasets}
        memberColumns={columnsForDataset("members")}
        contributionColumns={columnsForDataset("contributions")}
        saved={saved}
      />
    </div>
  );
}
