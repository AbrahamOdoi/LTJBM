import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import { CreateDomainListForm } from "@/components/admin/domain-forms";
import { createDomainListAction } from "@/lib/admin/actions";
import { listDomainLists } from "@/lib/admin/queries";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminDomainsPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const domains = await listDomainLists();

  return (
    <AdminAppShell
      title="Domains & dropdowns"
      subtitle="Admin-managed lists for the data-entry portal. Use parent values to express subdomains (e.g. region under country)."
      userName={session.user.name}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-slate-200 bg-white/90 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Values</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-slate-500">
                    No domain lists yet. Create one to drive portal dropdowns.
                  </td>
                </tr>
              ) : (
                domains.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{d.label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {d.key}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{d._count.values}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/domains/${d.id}`}
                        className="text-sky-800 hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
        <CreateDomainListForm action={createDomainListAction} />
      </div>
    </AdminAppShell>
  );
}
