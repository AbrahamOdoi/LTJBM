import { auth } from "@/auth";
import { RunScheduleButton } from "@/components/reporting/run-schedule-button";
import {
  ensureDefaultBoardTemplate,
  listReportSchedules,
} from "@/lib/reporting/service";
import { canEditReportTemplates } from "@/lib/roles";

export default async function ReportSchedulesPage() {
  const session = await auth();
  const canRun = canEditReportTemplates(session?.user?.role);
  await ensureDefaultBoardTemplate();
  const schedules = await listReportSchedules();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Monthly Board email
        </h2>
        <p className="mt-1 text-sm text-slate-600 max-w-2xl">
          Cron expression <code className="rounded bg-slate-100 px-1">0 8 1 * *</code>{" "}
          (08:00 on the 1st) targets the Board distribution list. Demo mode
          writes HTML under <code className="rounded bg-slate-100 px-1">tmp/board-reports/</code>{" "}
          (or <code className="rounded bg-slate-100 px-1">REPORT_EMAIL_DIR</code>).
        </p>
      </div>

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">Cron</th>
              <th className="px-4 py-3 font-medium">Recipients</th>
              <th className="px-4 py-3 font-medium">Last run</th>
              <th className="px-4 py-3 font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{s.reportTemplateName}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.cronExpression}</td>
                <td className="px-4 py-3">{s.distributionList.join(", ")}</td>
                <td className="px-4 py-3 text-slate-600">
                  {s.lastRunAt
                    ? new Date(s.lastRunAt).toLocaleString()
                    : "Never"}
                </td>
                <td className="px-4 py-3">{s.isActive ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {canRun ? (
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Demo run
          </h3>
          <p className="text-sm text-slate-600">
            Use as Admin, or from the shell:{" "}
            <code className="rounded bg-slate-100 px-1">npm run report:monthly</code>
            . Cron/API:{" "}
            <code className="rounded bg-slate-100 px-1">
              POST /api/reports/schedules/run
            </code>{" "}
            with{" "}
            <code className="rounded bg-slate-100 px-1">
              Authorization: Bearer $REPORT_CRON_SECRET
            </code>
            .
          </p>
          <RunScheduleButton scheduleId={schedules[0]?.id} />
        </section>
      ) : (
        <p className="text-sm text-slate-500">
          Only Admin / Data Centre can trigger the schedule from the UI. Board
          recipients receive the monthly artifact when it runs.
        </p>
      )}
    </div>
  );
}
