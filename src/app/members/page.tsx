import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
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
      subtitle="Member records across branches, cells, and fellowship ministries. Contributions are Head Office only."
      role={session.user.role}
      userName={session.user.name}
    >
      <form className="lt-panel grid gap-3 p-4 sm:grid-cols-5 print:hidden">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search name, phone, member number…"
          className="lt-input sm:col-span-2"
        />
        <select
          name="branchId"
          defaultValue={sp.branchId ?? ""}
          className="lt-input"
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
          className="lt-input"
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
        <button type="submit" className="lt-btn-primary">
          Filter
        </button>
        <select
          name="cellId"
          defaultValue={sp.cellId ?? ""}
          className="lt-input sm:col-span-2"
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
          className="lt-input sm:col-span-2"
        >
          <option value="">All fellowship ministries</option>
          {fellowships.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </form>

      <div className="flex items-center justify-between gap-3 print:hidden">
        <p className="text-sm text-[var(--lt-muted)]">
          {listed.total} member{listed.total === 1 ? "" : "s"}
        </p>
        <div className="flex gap-2">
          {writeOk ? (
            <Link href="/members/new" className="lt-btn-primary">
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
            className="lt-btn-secondary"
          >
            Print group list
          </Link>
        </div>
      </div>

      {listed.members.length === 0 ? (
        <EmptyState
          title="No members match these filters"
          body={
            writeOk
              ? "Try clearing filters, or register a new member for this branch."
              : "Try clearing filters, or ask a Records Clerk to register the member."
          }
          actionHref={writeOk ? "/members/new" : undefined}
          actionLabel={writeOk ? "Register member" : undefined}
        />
      ) : (
        <div className="lt-table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--lt-line)] bg-[#f3f7f5] text-[var(--lt-muted)]">
              <tr>
                <th className="px-3 py-2.5 font-medium">Photo</th>
                <th className="px-3 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Number</th>
                <th className="px-3 py-2.5 font-medium">Branch</th>
                <th className="px-3 py-2.5 font-medium">Groups</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium print:hidden"> </th>
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
                  <tr
                    key={m.id}
                    className="border-b border-[var(--lt-line)]/70 last:border-0"
                  >
                    <td className="px-3 py-2">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded bg-[#e8efeB] text-xs text-[var(--lt-muted)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium text-[var(--lt-ink)]">
                      {m.lastName}, {m.firstName}
                    </td>
                    <td className="px-3 py-2 text-[var(--lt-muted)]">
                      {m.memberNumber}
                    </td>
                    <td className="px-3 py-2">
                      {m.branch.name}
                      {m.branch.isInternational ? (
                        <span className="ml-1 text-xs text-[var(--lt-muted)]">
                          (intl)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[var(--lt-muted)]">
                      {groups || "—"}
                    </td>
                    <td className="px-3 py-2">{m.status}</td>
                    <td className="px-3 py-2 print:hidden">
                      <Link href={`/members/${m.id}`} className="lt-link">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </MembersAppShell>
  );
}
