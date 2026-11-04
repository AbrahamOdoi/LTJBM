import Link from "next/link";
import { redirect } from "next/navigation";
import { requireReportingAccess } from "@/lib/auth-guards";
import { attendanceDashboardSlice } from "@/lib/attendance/service";
import { getScopedBranchIds } from "@/lib/members/access";
import {
  canAccessAttendance,
  dashboardProfileForRole,
} from "@/lib/roles";

export default async function ReportsAttendancePage() {
  const session = await requireReportingAccess().catch(() => null);
  if (!session) redirect("/login");

  const profile = dashboardProfileForRole(session.user.role);
  // FS / Board still get aggregate attendance counts (no named absentees here).
  const scoped = await getScopedBranchIds(session.user);
  const slice = await attendanceDashboardSlice({
    branchIds: scoped,
  });

  const max = Math.max(1, ...slice.trend.map((t) => t.effective));
  const showAbsenteeLink = canAccessAttendance(session.user.role);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Attendance dashboard
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Role-appropriate headcount and check-in totals
            {profile === "membership" ? " for your branch scope" : ""}
            . Named absentee follow-up lives under Attendance when your role allows.
          </p>
        </div>
        {showAbsenteeLink ? (
          <Link href="/attendance/trends" className="lt-btn-secondary">
            Trends &amp; absentees
          </Link>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Sessions (30 days)", value: slice.sessions30d },
          { label: "Check-ins (30 days)", value: slice.checkIns30d },
          { label: "Last session count", value: slice.lastSessionCount },
        ].map((kpi) => (
          <div key={kpi.label} className="lt-panel px-4 py-5">
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-[var(--lt-muted)]">
              {kpi.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-[var(--lt-ink)]">
              {kpi.value}
            </p>
          </div>
        ))}
      </section>

      <section className="lt-panel p-5">
        <h3 className="text-sm font-medium text-[var(--lt-ink)]">Trend</h3>
        {slice.trend.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--lt-muted)]">No attendance data yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {slice.trend.map((t) => (
              <li
                key={t.id}
                className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm"
              >
                <span className="truncate text-[var(--lt-muted)]">{t.heldAt}</span>
                <div className="h-2.5 overflow-hidden rounded bg-[var(--lt-line)]">
                  <div
                    className="h-full rounded bg-[var(--lt-accent)]"
                    style={{
                      width: `${Math.round((t.effective / max) * 100)}%`,
                    }}
                  />
                </div>
                <span className="tabular-nums text-right">{t.effective}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lt-panel overflow-x-auto">
        <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-medium">
          Recent sessions
        </h3>
        {slice.recent.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">No sessions.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Marked</th>
                <th className="px-4 py-3 font-medium">Headcount</th>
              </tr>
            </thead>
            <tbody>
              {slice.recent.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    {s.heldAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    {canAccessAttendance(session.user.role) ? (
                      <Link href={`/attendance/${s.id}`} className="lt-link">
                        {s.label}
                      </Link>
                    ) : (
                      s.label
                    )}
                  </td>
                  <td className="px-4 py-3">{s.branchName}</td>
                  <td className="px-4 py-3">{s.marked}</td>
                  <td className="px-4 py-3">{s.headcount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
