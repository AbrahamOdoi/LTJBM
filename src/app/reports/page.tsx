import { auth } from "@/auth";
import { DashboardLive } from "@/components/reporting/dashboard-live";
import { getDashboardSnapshot } from "@/lib/reporting/aggregates";
import {
  ensureDefaultBoardTemplate,
} from "@/lib/reporting/service";
import { reportingViewMode } from "@/lib/roles";

export default async function ReportsDashboardPage() {
  const session = await auth();
  const role = session?.user?.role ?? "PastoralBoard";
  const view = reportingViewMode(role);

  const [snapshot, template] = await Promise.all([
    getDashboardSnapshot(),
    ensureDefaultBoardTemplate(),
  ]);

  const sections =
    view === "board"
      ? ["totals", "byKind", "charts"]
      : ["totals", "byKind", "byBranch", "byPeriod", "charts"];

  return (
    <DashboardLive
      layout={template.layout}
      initial={{
        view,
        role,
        generatedAt: snapshot.generatedAt,
        source: snapshot.source,
        financeContract: snapshot.financeContract,
        sections,
        totals: snapshot.totals,
        byKind: snapshot.byKind,
        byBranch: snapshot.byBranch,
        byPeriod: snapshot.byPeriod,
      }}
    />
  );
}
