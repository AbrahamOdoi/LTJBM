import Link from "next/link";
import { redirect } from "next/navigation";
import type { MinistryGroupKind } from "@prisma/client";
import { requireGroupsAccess } from "@/lib/auth-guards";
import { ministryGroupKindLabel } from "@/lib/church-labels";
import { ensureHubSyncedAction } from "@/lib/groups/actions";
import { listMinistryGroups, syncLegacyGroupsToHub } from "@/lib/groups/service";
import { canWriteGroups } from "@/lib/roles";

const KIND_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All kinds" },
  { value: "Cell", label: "Cells" },
  { value: "Fellowship", label: "Fellowships" },
  { value: "Choir", label: "Choirs" },
  { value: "Usher", label: "Ushers" },
  { value: "Youth", label: "Youth" },
  { value: "Department", label: "Departments" },
  { value: "Other", label: "Other" },
];

export default async function GroupsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string }>;
}) {
  const session = await requireGroupsAccess().catch(() => null);
  if (!session) redirect("/login");

  await syncLegacyGroupsToHub();

  const params = await searchParams;
  const kind = (params.kind || "") as MinistryGroupKind | "";
  const q = params.q?.trim() || undefined;

  const groups = await listMinistryGroups({
    kind: kind || undefined,
    q,
  });
  const writeOk = canWriteGroups(session.user.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--lt-ink)]">
            Groups & ministries
          </h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            Hub for cells, fellowships, choirs, ushers, and departments — leaders,
            rosters, meeting logs, and stub group communication.
          </p>
        </div>
        {writeOk ? (
          <div className="flex flex-wrap gap-2">
            <form action={ensureHubSyncedAction}>
              <button type="submit" className="lt-btn-secondary">
                Sync from cells / fellowships
              </button>
            </form>
            <Link href="/groups/new" className="lt-btn-primary">
              New group
            </Link>
          </div>
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
        <label className="min-w-[12rem] flex-1 text-sm">
          Search
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Group name"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <button type="submit" className="lt-btn-secondary">
          Filter
        </button>
      </form>

      {groups.length === 0 ? (
        <p className="lt-panel p-5 text-sm text-[var(--lt-muted)]">
          No groups yet. Create a choir, usher team, or cell — existing cells and
          fellowships sync into this hub automatically.
        </p>
      ) : (
        <div className="lt-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Branch</th>
                <th className="px-4 py-3 font-medium">Leaders</th>
                <th className="px-4 py-3 font-medium">Roster</th>
                <th className="px-4 py-3 font-medium">Meetings</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/groups/${g.id}`}
                      className="font-medium hover:underline"
                    >
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {ministryGroupKindLabel(g.kind)}
                  </td>
                  <td className="px-4 py-3 text-[var(--lt-muted)]">
                    {g.branch?.name ?? "HQ / all"}
                  </td>
                  <td className="px-4 py-3">{g._count.leaders}</td>
                  <td className="px-4 py-3">{g._count.roster}</td>
                  <td className="px-4 py-3">{g._count.meetings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
