import Link from "next/link";
import { auth } from "@/auth";
import { CustomReportBuilder } from "@/components/reporting/custom-report-builder";
import {
  canUseCustomDataset,
  columnsForDataset,
  listSavedReports,
  type CustomDataset,
} from "@/lib/reporting/custom-reports";
import { redirect } from "next/navigation";

export default async function CustomReportsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) redirect("/login");

  const user = { id: session.user.id, role: session.user.role };
  const allowedDatasets = (
    ["members", "contributions"] as CustomDataset[]
  ).filter((d) => canUseCustomDataset(session.user.role, d));
  const saved = await listSavedReports(user);

  return (
    <div className="space-y-8">
      <CustomReportBuilder
        allowedDatasets={allowedDatasets}
        memberColumns={columnsForDataset("members")}
        contributionColumns={columnsForDataset("contributions")}
      />

      <section className="space-y-3">
        <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[var(--lt-muted)]">
          Saved for your role
        </h3>
        {saved.length === 0 ? (
          <p className="text-sm text-[var(--lt-muted)]">
            No saved custom reports yet. Run a definition above and choose Save
            for my role.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {saved.map((report) => (
              <li key={report.id}>
                <Link
                  href={`/reports/builder/${report.id}`}
                  className="lt-panel block p-4 transition hover:border-[var(--lt-accent)]"
                >
                  <h4 className="font-medium text-[var(--lt-ink)]">
                    {report.name}
                  </h4>
                  <p className="mt-1 text-sm text-[var(--lt-muted)]">
                    {report.dataset === "members"
                      ? "Members"
                      : "Contributions"}
                    {report.description ? ` · ${report.description}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
