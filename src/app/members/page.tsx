import Link from "next/link";
import { redirect } from "next/navigation";
<<<<<<< HEAD
import { DataTable, DataTableFilterBar } from "@/components/data-table";
=======
import { EmptyState } from "@/components/empty-state";
import { MemberAvatar } from "@/components/member-avatar";
>>>>>>> 99d7cc5 (Add UI liveliness via member photos, scenes, and subtle motion)
import { MembersAppShell } from "@/components/members/app-shell";
import { requireMembersAccess } from "@/lib/auth-guards";
import { buildSearchParams, parsePageParams } from "@/lib/data-table";
import { canWriteMembers } from "@/lib/roles";
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
  page?: string;
  pageSize?: string;
}>;

export default async function MembersListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireMembersAccess().catch(() => null);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const { page, pageSize } = parsePageParams(sp);
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
      page,
      pageSize,
    }),
  ]);

  const writeOk = canWriteMembers(session.user.role);
  const filters = {
    q: sp.q,
    branchId: sp.branchId,
    cellId: sp.cellId,
    fellowshipId: sp.fellowshipId,
    status: sp.status,
  };

  return (
    <MembersAppShell
      title="Member register"
      subtitle="Member records across branches, cells, and fellowship ministries. Contributions are Head Office only."
      role={session.user.role}
      userName={session.user.name}
    >
      <DataTableFilterBar className="sm:grid-cols-5" submitLabel="Filter">
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
      </DataTableFilterBar>

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
            href={`/members/print?${buildSearchParams({
              q: sp.q,
              branchId: sp.branchId,
              cellId: sp.cellId,
              fellowshipId: sp.fellowshipId,
              status: sp.status,
            })}`}
            className="lt-btn-secondary"
          >
            Print group list
          </Link>
        </div>
      </div>

      <DataTable
        columns={[
          { key: "photo", header: "Photo" },
          { key: "name", header: "Name" },
          { key: "number", header: "Number" },
          { key: "branch", header: "Branch" },
          { key: "groups", header: "Groups" },
          { key: "status", header: "Status" },
          { key: "open", header: " ", headerClassName: "print:hidden" },
        ]}
        rows={listed.members}
        rowKey={(m) => m.id}
        emptyTitle="No members match these filters"
        emptyBody={
          writeOk
            ? "Try clearing filters, or register a new member for this branch."
            : "Try clearing filters, or ask a Records Clerk to register the member."
        }
        emptyActionHref={writeOk ? "/members/new" : undefined}
        emptyActionLabel={writeOk ? "Register member" : undefined}
        pagination={{
          pathname: "/members",
          filters,
          result: listed,
          noun: "members",
        }}
        renderCell={(m, key) => {
          const photo = photoPublicUrl(m.photoKey);
          const groups = m.groups
            .map((g) => g.cell?.name ?? g.fellowshipMinistry?.name)
            .filter(Boolean)
            .join(", ");
          switch (key) {
            case "photo":
              return photo ? (
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
              );
            case "name":
              return (
                <span className="font-medium text-[var(--lt-ink)]">
                  {m.lastName}, {m.firstName}
                </span>
              );
            case "number":
              return (
                <span className="text-[var(--lt-muted)]">{m.memberNumber}</span>
              );
            case "branch":
              return (
                <>
                  {m.branch.name}
                  {m.branch.isInternational ? (
                    <span className="ml-1 text-xs text-[var(--lt-muted)]">
                      (intl)
                    </span>
                  ) : null}
                </>
              );
            case "groups":
              return (
                <span className="text-[var(--lt-muted)]">{groups || "—"}</span>
              );
            case "status":
              return m.status;
            case "open":
              return (
                <Link
                  href={`/members/${m.id}`}
                  className="lt-link print:hidden"
                >
                  Open
                </Link>
              );
            default:
              return null;
          }
<<<<<<< HEAD
        }}
      />
=======
          actionHref={writeOk ? "/members/new" : undefined}
          actionLabel={writeOk ? "Register member" : undefined}
        />
      ) : (
        <div className="lt-table-wrap">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--lt-line)] bg-[#f9fafb] text-[var(--lt-muted)]">
              <tr>
                <th className="px-3 py-2.5 font-medium">Member</th>
                <th className="px-3 py-2.5 font-medium">Number</th>
                <th className="px-3 py-2.5 font-medium">Branch</th>
                <th className="px-3 py-2.5 font-medium">Groups</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium print:hidden"> </th>
              </tr>
            </thead>
            <tbody>
              {listed.members.map((m) => {
                const groups = m.groups
                  .map((g) => g.cell?.name ?? g.fellowshipMinistry?.name)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <tr
                    key={m.id}
                    className="lt-row-hover border-b border-[var(--lt-line)]/70 last:border-0"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          photoKey={m.photoKey}
                          firstName={m.firstName}
                          lastName={m.lastName}
                          size="md"
                        />
                        <span className="font-medium text-[var(--lt-ink)]">
                          {m.lastName}, {m.firstName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--lt-muted)]">
                      {m.memberNumber}
                    </td>
                    <td className="px-3 py-2.5">
                      {m.branch.name}
                      {m.branch.isInternational ? (
                        <span className="ml-1 text-xs text-[var(--lt-muted)]">
                          (intl)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--lt-muted)]">
                      {groups || "—"}
                    </td>
                    <td className="px-3 py-2.5">{m.status}</td>
                    <td className="px-3 py-2.5 print:hidden">
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
>>>>>>> 99d7cc5 (Add UI liveliness via member photos, scenes, and subtle motion)
    </MembersAppShell>
  );
}
