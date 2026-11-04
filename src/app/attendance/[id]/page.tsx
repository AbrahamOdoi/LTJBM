import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarkAttendanceForm } from "@/components/attendance/mark-attendance-form";
import { requireAttendanceAccess } from "@/lib/auth-guards";
import { canWriteAttendance } from "@/lib/roles";
import { getAttendanceSession } from "@/lib/attendance/service";

type Params = Promise<{ id: string }>;

export default async function AttendanceDetailPage({
  params,
}: {
  params: Params;
}) {
  const session = await requireAttendanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const row = await getAttendanceSession(id);
  if (!row) notFound();

  const writeOk = canWriteAttendance(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--lt-muted)]">
            <Link href="/attendance" className="lt-link">
              Attendance
            </Link>{" "}
            / session
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            {row.label}
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            {row.kind} · {row.heldAt.toISOString().slice(0, 10)} · {row.branch.name}
            {row.cell ? ` · ${row.cell.name}` : ""}
            {row.headcount != null ? ` · headcount ${row.headcount}` : ""}
            {row.kioskEnabled ? " · QR open" : " · QR closed"}
          </p>
        </div>
        <Link href={`/attendance/${row.id}/kiosk`} className="lt-btn-secondary">
          Kiosk / QR
        </Link>
      </div>

      {writeOk ? (
        <MarkAttendanceForm sessionId={row.id} branchId={row.branchId} />
      ) : null}

      <section className="lt-panel overflow-x-auto">
        <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-medium">
          Marked present ({row.records.length})
        </h3>
        {row.records.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">Nobody marked yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {row.records.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 px-4 py-3">
                <span>
                  {r.member.firstName} {r.member.lastName}
                  <span className="text-[var(--lt-muted)]">
                    {" "}
                    · {r.member.memberNumber ?? "—"}
                  </span>
                </span>
                <span className="shrink-0 text-[var(--lt-muted)]">
                  {r.present ? "Present" : "Absent"}
                  {" · "}
                  {r.source}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
