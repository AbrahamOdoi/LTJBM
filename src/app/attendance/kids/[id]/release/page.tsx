import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PickupReleaseForm } from "@/components/kids/pickup-release-form";
import { requireAttendanceAccess } from "@/lib/auth-guards";
import { getKidsSession } from "@/lib/kids/service";
import { canWriteAttendance } from "@/lib/roles";

type Params = Promise<{ id: string }>;

export default async function KidsReleasePage({ params }: { params: Params }) {
  const session = await requireAttendanceAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const row = await getKidsSession(id);
  if (!row) notFound();

  const writeOk = canWriteAttendance(session.user.role);
  const checkedIn = row.checkIns.filter((c) => c.status === "CheckedIn");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--lt-muted)]">
          <Link href={`/attendance/kids/${id}`} className="lt-link">
            Session
          </Link>{" "}
          / release desk
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          Pickup release — {row.label}
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          {checkedIn.length} child{checkedIn.length === 1 ? "" : "ren"} waiting
          for guardian pickup.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {writeOk ? (
          <PickupReleaseForm sessionId={id} />
        ) : (
          <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
            Release requires attendance write access.
          </p>
        )}

        <div className="lt-panel p-5">
          <h3 className="text-sm font-medium text-[var(--lt-ink)]">
            In room now
          </h3>
          {checkedIn.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--lt-muted)]">
              No children currently checked in.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {checkedIn.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between gap-2 py-2"
                >
                  <span>
                    {c.child.firstName} {c.child.lastName}
                  </span>
                  <span className="font-mono tracking-wider text-[var(--lt-accent)]">
                    {c.pickupCode}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
