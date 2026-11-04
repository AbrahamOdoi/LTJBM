import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddRoleForm } from "@/components/volunteers/add-role-form";
import { requireVolunteersAccess } from "@/lib/auth-guards";
import { volunteerTeamKindLabel } from "@/lib/church-labels";
import { canWriteVolunteers } from "@/lib/roles";
import { getVolunteerTeam } from "@/lib/volunteers/service";

type Params = Promise<{ id: string }>;

export default async function VolunteerTeamDetailPage({
  params,
}: {
  params: Params;
}) {
  const session = await requireVolunteersAccess().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;
  const team = await getVolunteerTeam(id);
  if (!team) notFound();
  const writeOk = canWriteVolunteers(session.user.role);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[var(--lt-muted)]">
          <Link href="/volunteers/teams" className="lt-link">
            Teams
          </Link>{" "}
          / {team.name}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
          {team.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--lt-muted)]">
          {volunteerTeamKindLabel(team.kind)}
          {team.branch ? ` · ${team.branch.name}` : ""}
        </p>
        {team.description ? (
          <p className="mt-2 text-sm text-[var(--lt-ink-soft)]">
            {team.description}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="lt-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Default slots</th>
                <th className="px-4 py-3 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {team.roles.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-[var(--lt-muted)]"
                  >
                    No roles yet. Add Door greeter, Platform, Communion, etc.
                  </td>
                </tr>
              ) : (
                team.roles.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.defaultSlots}</td>
                    <td className="px-4 py-3 text-[var(--lt-muted)]">
                      {r.description ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {writeOk ? <AddRoleForm teamId={team.id} /> : null}
      </div>
    </div>
  );
}
