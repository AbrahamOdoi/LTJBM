import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAppShell } from "@/components/admin/app-shell";
import { auth } from "@/auth";
import { browseAuditLogs } from "@/lib/audit";
import { canAccessAdmin } from "@/lib/roles";

type SearchParams = Promise<{
  q?: string;
  entityType?: string;
  page?: string;
}>;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const sp = await searchParams;
  const page = Number(sp.page || "1") || 1;
  const result = await browseAuditLogs({
    q: sp.q ?? null,
    entityType: sp.entityType || null,
    page,
    pageSize: 40,
  });

  function hrefFor(next: { q?: string; entityType?: string; page?: number }) {
    const params = new URLSearchParams();
    const q = next.q ?? sp.q ?? "";
    const entityType = next.entityType ?? sp.entityType ?? "";
    const p = next.page ?? page;
    if (q) params.set("q", q);
    if (entityType) params.set("entityType", entityType);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  }

  return (
    <AdminAppShell
      title="Audit log"
      subtitle="Browse append-only system activity (who changed what). Writes already happen across domains — this is the Admin browser."
      userName={session.user.name}
    >
      <form className="lt-panel flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="text-sm">
          <span className="text-[var(--lt-muted)]">Search</span>
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Action, actor, entity…"
            className="mt-1 block w-56 rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--lt-muted)]">Entity type</span>
          <select
            name="entityType"
            defaultValue={sp.entityType ?? ""}
            className="mt-1 block w-48 rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">All</option>
            {result.entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="lt-btn-primary">
          Filter
        </button>
      </form>

      <section className="lt-panel overflow-x-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 text-sm">
          <span className="font-medium text-[var(--lt-ink)]">
            {result.total} entries
          </span>
          <span className="text-[var(--lt-muted)]">
            Page {result.page} of {result.pageCount}
          </span>
        </div>
        {result.items.length === 0 ? (
          <p className="p-4 text-sm text-[var(--lt-muted)]">No matching audit rows.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[var(--lt-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--lt-muted)]">
                    {row.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-4 py-3">
                    {row.actor ? (
                      <>
                        <div>{row.actor.name}</div>
                        <div className="text-xs text-[var(--lt-muted)]">
                          {row.actor.email}
                        </div>
                      </>
                    ) : (
                      <span className="text-[var(--lt-muted)]">System / public</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.action}</td>
                  <td className="px-4 py-3">
                    <div>{row.entityType}</div>
                    {row.entityId ? (
                      <div className="font-mono text-xs text-[var(--lt-muted)]">
                        {row.entityId}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex justify-between border-t border-slate-200 px-4 py-3 text-sm">
          {result.page > 1 ? (
            <Link href={hrefFor({ page: result.page - 1 })} className="lt-link">
              Previous
            </Link>
          ) : (
            <span />
          )}
          {result.page < result.pageCount ? (
            <Link href={hrefFor({ page: result.page + 1 })} className="lt-link">
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      </section>
    </AdminAppShell>
  );
}
