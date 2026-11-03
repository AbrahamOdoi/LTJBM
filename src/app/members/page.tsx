import Link from "next/link";
import { redirect } from "next/navigation";
import { MembersAppShell } from "@/components/members/app-shell";
import { requireMembersAccess } from "@/lib/auth-guards";
import { canWriteMembers } from "@/lib/roles";
import { photoPublicUrl } from "@/lib/members/photos";
import {
  listBranchesForUser,
  listCellsForBranches,
  listFellowships,
  listMembers,
} from "@/lib/members/queries";
import { getScopedBranchIds } from "@/lib/members/access";

type SearchParams = Promise<{
  q?: string;
  branchId?: string;
  cellId?: string;
  fellowshipId?: string;
  status?: string;
}>;

export default async function MembersListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireMembersAccess().catch(() => null);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const scoped = await getScopedBranchIds(session.user);
  const [branches, cells, fellowships, listed] = await Promise.all([
    listBranchesForUser(session.user),
    listCellsForBranches(scoped),
    listFellowships(),
    listMembers({
      user: session.user,
      q: sp.q,
      branchId: sp.branchId,
      cellId: sp.cellId,
      fellowshipId: sp.fellowshipId,
      status: sp.status,
    }),
  ]);

  const writeOk = canWriteMembers(session.user.role);

  return (
    <MembersAppShell
      title="Member register"
      subtitle="Biodata only — no finance. Branch Leaders see their assigned unit."
      role={session.user.role}
      userName={session.user.name}
    >
      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white/90 p-4 sm:grid-cols-5 print:hidden">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search name, phone, number…"
          className="sm:col-span-2 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="branchId"
          defaultValue={sp.branchId ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {["Active", "Inactive", "Transferred", "Deceased", "Suspended"].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ),
          )}
        </select>
        <button
          type="submit"
          className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          Filter
        </button>
        <select
          name="cellId"
          defaultValue={sp.cellId ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        >
          <option value="">All cells</option>
          {cells.map((c) => (
            <option key={c.id} value={c.id}>
              {c.branch.name} · {c.name}
            </option>
          ))}
        </select>
        <select
          name="fellowshipId"
          defaultValue={sp.fellowshipId ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        >
          <option value="">All fellowships</option>
          {fellowships.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </form>

      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-slate-600">{listed.total} members</p>
        <div className="flex gap-2">
          {writeOk ? (
            <Link
              href="/members/new"
              className="rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
            >
              Register member
            </Link>
          ) : null}
          <Link
            href={`/members/print?${new URLSearchParams(
              Object.entries({
                q: sp.q ?? "",
                branchId: sp.branchId ?? "",
                cellId: sp.cellId ?? "",
                fellowshipId: sp.fellowshipId ?? "",
                status: sp.status ?? "",
              }).filter(([, v]) => v),
            ).toString()}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Print group list
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/90">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">Photo</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Number</th>
              <th className="px-3 py-2 font-medium">Branch</th>
              <th className="px-3 py-2 font-medium">Groups</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium print:hidden"> </th>
            </tr>
          </thead>
          <tbody>
            {listed.members.map((m) => {
              const photo = photoPublicUrl(m.photoKey);
              const groups = m.groups
                .map((g) => g.cell?.name ?? g.fellowshipMinistry?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">
                    {m.lastName}, {m.firstName}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{m.memberNumber}</td>
                  <td className="px-3 py-2">
                    {m.branch.name}
                    {m.branch.isInternational ? (
                      <span className="ml-1 text-xs text-slate-500">(intl)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{groups || "—"}</td>
                  <td className="px-3 py-2">{m.status}</td>
                  <td className="px-3 py-2 print:hidden">
                    <Link
                      href={`/members/${m.id}`}
                      className="text-sky-800 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {listed.members.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No members match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </MembersAppShell>
  );
}
