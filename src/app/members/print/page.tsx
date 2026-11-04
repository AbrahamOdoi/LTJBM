import Link from "next/link";
import { redirect } from "next/navigation";
import { requireMembersAccess } from "@/lib/auth-guards";
import { listMembers } from "@/lib/members/queries";

type SearchParams = Promise<{
  q?: string;
  branchId?: string;
  cellId?: string;
  fellowshipId?: string;
  status?: string;
}>;

export default async function GroupPrintPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireMembersAccess().catch(() => null);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const { members, total } = await listMembers({
    user: session.user,
    q: sp.q,
    branchId: sp.branchId,
    cellId: sp.cellId,
    fellowshipId: sp.fellowshipId,
    status: sp.status || "Active",
    take: 500,
  });

  return (
    <div className="mx-auto max-w-5xl bg-white px-8 py-10 text-slate-900">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/members" className="text-sm text-sky-800 hover:underline">
          ← Back to members
        </Link>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          id="print-btn"
        >
          Print
        </button>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('print-btn')?.addEventListener('click',()=>window.print());`,
        }}
      />

      <header className="mb-6 border-b border-slate-300 pb-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          LTJBM CDMS
        </p>
        <h1 className="text-2xl font-semibold">Group member list</h1>
        <p className="text-sm text-slate-600 mt-1">
          {total} members
          {sp.branchId || sp.cellId || sp.fellowshipId || sp.q
            ? " (filtered)"
            : ""}
          {" · "}
          printed {new Date().toISOString().slice(0, 10)}
        </p>
      </header>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Name</th>
            <th className="py-2 pr-2">Number</th>
            <th className="py-2 pr-2">Branch</th>
            <th className="py-2 pr-2">Phone</th>
            <th className="py-2">Groups</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, idx) => (
            <tr key={m.id} className="border-b border-slate-100">
              <td className="py-2 pr-2 text-slate-500">{idx + 1}</td>
              <td className="py-2 pr-2 font-medium">
                {m.lastName}, {m.firstName}
              </td>
              <td className="py-2 pr-2">{m.memberNumber}</td>
              <td className="py-2 pr-2">{m.branch.name}</td>
              <td className="py-2 pr-2">{m.phone || "—"}</td>
              <td className="py-2">
                {m.groups
                  .map((g) => g.cell?.name ?? g.fellowshipMinistry?.name)
                  .filter(Boolean)
                  .join(", ") || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
