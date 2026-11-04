import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAttendanceAccess } from "@/lib/auth-guards";
import { canWriteAttendance } from "@/lib/roles";
import { listAttendanceSessions } from "@/lib/attendance/service";

export default async function AttendanceIndexPage() {
  const session = await requireAttendanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const sessions = await listAttendanceSessions();
  const writeOk = canWriteAttendance(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Attendance sessions
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Named check-in for services and cells. Headcount optional.
          </p>
        </div>
        {writeOk ? (
          <Link href="/attendance/new" className="lt-btn-primary">
            New session
          </Link>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No sessions yet. Create a Sunday service or cell meeting session to start
          marking attendance.
        </p>
      ) : (
        <div className="lt-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Marked</th>
                <th className="px-4 py-3 font-medium">Headcount</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{s.heldAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/attendance/${s.id}`} className="font-medium hover:underline">
                      {s.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.kind}</td>
                  <td className="px-4 py-3">
                    {s.branch.name}
                    {s.cell ? ` · ${s.cell.name}` : ""}
                  </td>
                  <td className="px-4 py-3">{s._count.records}</td>
                  <td className="px-4 py-3">{s.headcount ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
