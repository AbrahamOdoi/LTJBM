import Link from "next/link";
import { redirect } from "next/navigation";
import { requireVolunteersAccess } from "@/lib/auth-guards";
import { volunteerTeamKindLabel } from "@/lib/church-labels";
import { canWriteVolunteers } from "@/lib/roles";
import {
  listVolunteerServices,
  listVolunteerTeams,
} from "@/lib/volunteers/service";

export default async function VolunteersHubPage() {
  const session = await requireVolunteersAccess().catch(() => null);
  if (!session) redirect("/login");

  const [teams, services] = await Promise.all([
    listVolunteerTeams(),
    listVolunteerServices(8),
  ]);
  const writeOk = canWriteVolunteers(session.user.role);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Volunteer scheduling
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Plan ushers, worship, hospitality, and children’s helpers for each
            service — with conflict awareness when someone is already scheduled.
          </p>
        </div>
        {writeOk ? (
          <div className="flex flex-wrap gap-2">
            <Link href="/volunteers/teams/new" className="lt-btn-secondary">
              New team
            </Link>
            <Link href="/volunteers/services/new" className="lt-btn-primary">
              Schedule a service
            </Link>
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
            Teams
          </h3>
          <Link href="/volunteers/teams" className="lt-link text-sm">
            All teams
          </Link>
        </div>
        {teams.length === 0 ? (
          <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
            No volunteer teams yet. Create Ushers, Worship, Hospitality, and more.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.slice(0, 6).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/volunteers/teams/${t.id}`}
                  className="lt-panel block p-4 hover:border-[var(--lt-accent)]"
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--lt-muted)]">
                    {volunteerTeamKindLabel(t.kind)}
                  </span>
                  <span className="mt-1 block font-medium text-[var(--lt-ink)]">
                    {t.name}
                  </span>
                  <span className="mt-1 block text-sm text-[var(--lt-muted)]">
                    {t.roles.length} role{t.roles.length === 1 ? "" : "s"}
                    {t.branch ? ` · ${t.branch.name}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
            Upcoming & recent services
          </h3>
          <Link href="/volunteers/services" className="lt-link text-sm">
            All schedules
          </Link>
        </div>
        {services.length === 0 ? (
          <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
            No service schedules yet.
          </p>
        ) : (
          <div className="lt-panel overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Branch</th>
                  <th className="px-4 py-3 font-medium">Coverage</th>
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
      </section>
    </div>
  );
}
