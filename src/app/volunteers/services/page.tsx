import Link from "next/link";
import { redirect } from "next/navigation";
import { requireVolunteersAccess } from "@/lib/auth-guards";
import { canWriteVolunteers } from "@/lib/roles";
import { listVolunteerServices } from "@/lib/volunteers/service";

export default async function VolunteerServicesPage() {
  const session = await requireVolunteersAccess().catch(() => null);
  if (!session) redirect("/login");

  const services = await listVolunteerServices(60);
  const writeOk = canWriteVolunteers(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Service schedules
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Dated gatherings that need ushers, worship, hospitality, and other
            volunteer coverage.
          </p>
        </div>
        {writeOk ? (
          <Link href="/volunteers/services/new" className="lt-btn-primary">
            New service
          </Link>
        ) : null}
      </div>

      {services.length === 0 ? (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No schedules yet.
        </p>
      ) : (
        <div className="lt-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Filled</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const needed = s.needs.reduce((n, x) => n + x.slotsNeeded, 0);
                const filled = s.needs.reduce(
                  (n, x) => n + x._count.assignments,
                  0,
                );
                return (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {s.startsAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/volunteers/services/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{s.branch?.name ?? "—"}</td>
                    <td className="px-4 py-3">{s.location ?? "—"}</td>
                    <td className="px-4 py-3">
                      {filled}/{needed || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
