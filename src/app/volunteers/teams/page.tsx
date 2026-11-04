import Link from "next/link";
import { redirect } from "next/navigation";
import type { VolunteerTeamKind } from "@prisma/client";
import { requireVolunteersAccess } from "@/lib/auth-guards";
import { volunteerTeamKindLabel } from "@/lib/church-labels";
import { canWriteVolunteers } from "@/lib/roles";
import { listVolunteerTeams } from "@/lib/volunteers/service";

const KIND_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All kinds" },
  { value: "Usher", label: "Ushers" },
  { value: "Worship", label: "Worship" },
  { value: "Hospitality", label: "Hospitality" },
  { value: "Kids", label: "Children’s ministry" },
  { value: "Media", label: "Media" },
  { value: "Parking", label: "Parking" },
  { value: "Security", label: "Security" },
  { value: "Other", label: "Other" },
];

export default async function VolunteerTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const session = await requireVolunteersAccess().catch(() => null);
  if (!session) redirect("/login");

  const params = await searchParams;
  const kind = (params.kind || "") as VolunteerTeamKind | "";
  const q = params.q?.trim() || undefined;
  const teams = await listVolunteerTeams({
    kind: kind || undefined,
    q,
  });
  const writeOk = canWriteVolunteers(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Teams & roles
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Ministry teams (ushers, worship, hospitality, …) and the roles each
            service needs.
          </p>
        </div>
        {writeOk ? (
          <Link href="/volunteers/teams/new" className="lt-btn-primary">
            New team
          </Link>
        ) : null}
      </div>

      <form className="lt-panel flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="text-sm">
          Kind
          <select
            name="kind"
            defaultValue={kind}
            className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {KIND_FILTERS.map((k) => (
              <option key={k.value || "all"} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Search
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Team name…"
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="lt-btn-secondary">
          Filter
        </button>
      </form>

      {teams.length === 0 ? (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No teams match.
        </p>
      ) : (
        <div className="lt-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Team</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Roles</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/volunteers/teams/${t.id}`}
                      className="font-medium hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {volunteerTeamKindLabel(t.kind)}
                  </td>
                  <td className="px-4 py-3">{t.branch?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {t.roles.map((r) => r.name).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
