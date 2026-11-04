import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PickupTags } from "@/components/kids/pickup-tags";
import { requireAttendanceAccess } from "@/lib/auth-guards";
import { getKidsSession } from "@/lib/kids/service";
import { canWriteAttendance } from "@/lib/roles";

type Params = Promise<{ id: string }>;

export default async function KidsSessionDetailPage({
  params,
}: {
  params: Params;
}) {
  const session = await requireAttendanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const row = await getKidsSession(id);
  if (!row) notFound();

  const writeOk = canWriteAttendance(session.user.role);
  const checkedIn = row.checkIns.filter((c) => c.status === "CheckedIn");
  const released = row.checkIns.filter((c) => c.status === "Released");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--lt-muted)]">
            <Link href="/attendance/kids" className="lt-link">
              Children’s check-in
            </Link>{" "}
            / session
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            {row.label}
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            {row.heldAt.toISOString().slice(0, 10)} · {row.branch.name}
            {row.room ? ` · ${row.room.name}` : ""}
            {" · "}
            {checkedIn.length} in room · {released.length} released
            {row.kioskEnabled ? "" : " · check-in closed"}
          </p>
        </div>
        {writeOk ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/attendance/kids/${id}/kiosk`}
              className="lt-btn-secondary"
            >
              Kiosk / QR
            </Link>
            <Link
              href={`/attendance/kids/${id}/release`}
              className="lt-btn-primary"
            >
              Release desk
            </Link>
          </div>
        ) : null}
      </div>

      {checkedIn.length === 0 && released.length === 0 ? (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No children checked in yet. Open the kiosk or share the guardian QR
          link.
        </p>
      ) : (
        <div className="space-y-8">
          {checkedIn.length > 0 ? (
            <section className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
                Currently checked in
              </h3>
              <div className="lt-panel overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Child</th>
                      <th className="px-4 py-3 font-medium">Pickup code</th>
                      <th className="px-4 py-3 font-medium">Room</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">In at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkedIn.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-4 py-3">
                          {c.child.firstName} {c.child.lastName}
                          <span className="text-[var(--lt-muted)]">
                            {" "}
                            · {c.child.memberNumber ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono tracking-wider">
                          {c.pickupCode}
                        </td>
                        <td className="px-4 py-3">
                          {c.room?.name ?? row.room?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3">{c.source}</td>
                        <td className="px-4 py-3">
                          {c.checkedInAt.toISOString().slice(11, 16)} UTC
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-4 print:block">
                <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
                  Pickup tags (print)
                </h3>
                {checkedIn.map((c) => (
                  <PickupTags
                    key={c.id}
                    childName={`${c.child.firstName} ${c.child.lastName}`}
                    pickupCode={c.pickupCode}
                    roomName={c.room?.name ?? row.room?.name}
                    sessionLabel={row.label}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {released.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
                Released
              </h3>
              <ul className="lt-panel divide-y divide-slate-100 text-sm">
                {released.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap justify-between gap-2 px-4 py-3"
                  >
                    <span>
                      {c.child.firstName} {c.child.lastName}
                      <span className="text-[var(--lt-muted)]">
                        {" "}
                        · code {c.pickupCode}
                      </span>
                    </span>
                    <span className="text-[var(--lt-muted)]">
                      {c.releasedToGuardian
                        ? `to ${c.releasedToGuardian.firstName} ${c.releasedToGuardian.lastName}`
                        : "released"}
                      {c.releasedAt
                        ? ` · ${c.releasedAt.toISOString().slice(11, 16)} UTC`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
