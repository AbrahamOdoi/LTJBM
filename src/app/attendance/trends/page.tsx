import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAttendanceAccess } from "@/lib/auth-guards";
import {
  attendanceTrend,
  listAbsenteeAlerts,
} from "@/lib/attendance/service";
import { getScopedBranchIds } from "@/lib/members/access";

export default async function AttendanceTrendsPage() {
  const session = await requireAttendanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const scoped = await getScopedBranchIds(session.user);
  const branchId =
    scoped === null ? null : scoped.length === 1 ? scoped[0] : scoped[0] ?? null;

  const [trend, alerts] = await Promise.all([
    attendanceTrend({
      branchId: scoped && scoped.length === 1 ? scoped[0] : null,
      limit: 14,
    }),
    listAbsenteeAlerts({
      branchId: scoped && scoped.length === 1 ? branchId : null,
      lookbackSessions: 3,
    }),
  ]);

  const max = Math.max(1, ...trend.map((t) => t.effective));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Attendance trends
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          Headcount (or marked present) across recent sessions, plus simple absentee
          alerts for Active members missing recent services.
        </p>
      </div>

      <section className="lt-panel p-5">
        <h3 className="text-sm font-medium text-[var(--lt-ink)]">Recent sessions</h3>
        {trend.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--lt-muted)]">No sessions yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {trend.map((t) => (
              <li key={t.id} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
                <Link href={`/attendance/${t.id}`} className="lt-link truncate">
                  {t.heldAt}
                </Link>
                <div className="h-2.5 overflow-hidden rounded bg-[var(--lt-line)]">
                  <div
                    className="h-full rounded bg-[var(--lt-accent)]"
                    style={{ width: `${Math.round((t.effective / max) * 100)}%` }}
                  />
                </div>
                <span className="tabular-nums text-right text-[var(--lt-ink)]">
                  {t.effective}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lt-panel overflow-x-auto">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-medium text-[var(--lt-ink)]">
            Absentee alerts
          </h3>
          <p className="mt-0.5 text-xs text-[var(--lt-muted)]">
            Active members absent from at least two of the last{" "}
            {alerts.sessions.length || 3} service sessions
            {alerts.sessions.length
              ? ` (${alerts.sessions.map((s) => s.heldAt.toISOString().slice(0, 10)).join(", ")})`
              : ""}
            .
          </p>
        </div>
        {alerts.absentees.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">
            No absentee alerts right now.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Missed</th>
              </tr>
            </thead>
            <tbody>
              {alerts.absentees.slice(0, 50).map((m) => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/members/${m.id}`} className="lt-link">
                      {m.firstName} {m.lastName}
                    </Link>
                    <span className="text-[var(--lt-muted)]">
                      {" "}
                      · {m.memberNumber ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{m.branchName}</td>
                  <td className="px-4 py-3 tabular-nums">{m.missed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
