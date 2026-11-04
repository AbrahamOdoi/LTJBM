import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAttendanceAccess } from "@/lib/auth-guards";
import { listKidsSessions } from "@/lib/kids/service";
import { canWriteAttendance } from "@/lib/roles";

export default async function KidsCheckInIndexPage() {
  const session = await requireAttendanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const sessions = await listKidsSessions();
  const writeOk = canWriteAttendance(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Children’s check-in
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Kiosk and mobile check-in for kids linked to guardians, with secure
            pickup tags and a staff release desk.
          </p>
        </div>
        {writeOk ? (
          <Link href="/attendance/kids/new" className="lt-btn-primary">
            New children’s session
          </Link>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No children’s sessions yet. Create one for Sunday nursery / kids church
          and open the kiosk or QR link for guardians.
        </p>
      ) : (
        <div className="lt-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Checked in</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    {s.heldAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/attendance/kids/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.branch.name}</td>
                  <td className="px-4 py-3">{s.room?.name ?? "—"}</td>
                  <td className="px-4 py-3">{s._count.checkIns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
