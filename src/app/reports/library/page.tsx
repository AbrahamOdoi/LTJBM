import Link from "next/link";
import { auth } from "@/auth";
import { listStandardReportCatalog } from "@/lib/reporting/standard-reports";
import { redirect } from "next/navigation";

const CATEGORY_LABEL: Record<string, string> = {
  membership: "Membership",
  contributions: "Contributions",
  board: "Board",
};

export default async function StandardReportsLibraryPage() {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");

  const reports = listStandardReportCatalog(session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Standard reports
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--lt-muted)]">
          Printable and exportable reports for your ministry role. Run a report
          to apply filters, then print or download CSV.
        </p>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-[var(--lt-muted)]">
          No standard reports are available for this role.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {reports.map((report) => (
            <li key={report.id}>
              <Link
                href={`/reports/library/${report.id}`}
                className="lt-panel block h-full p-4 transition hover:border-[var(--lt-accent)]"
              >
                <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-[var(--lt-muted)]">
                  {CATEGORY_LABEL[report.category] ?? report.category}
                </p>
                <h3 className="mt-1 text-base font-medium text-[var(--lt-ink)]">
                  {report.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--lt-muted)]">
                  {report.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
