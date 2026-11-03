import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import {
  AddDomainValueForm,
  UpdateDomainValueForm,
} from "@/components/admin/domain-forms";
import {
  addDomainValueAction,
  updateDomainValueAction,
} from "@/lib/admin/actions";
import { getDomainList } from "@/lib/admin/queries";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminDomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const { id } = await params;
  const domain = await getDomainList(id);
  if (!domain) notFound();

  const parentOptions = domain.values
    .filter((v) => !v.parentValue)
    .map((v) => ({ value: v.value, label: v.label }));

  return (
    <AdminAppShell
      title={domain.label}
      subtitle={`${domain.key}${domain.description ? ` — ${domain.description}` : ""}`}
      userName={session.user.name}
    >
      <p className="text-sm">
        <Link href="/admin/domains" className="text-sky-800 hover:underline">
          ← All domains
        </Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-xl border border-slate-200 bg-white/90 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Label / edit</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {domain.values.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-slate-500">
                    No values yet. Add top-level options or subdomains.
                  </td>
                </tr>
              ) : (
                domain.values.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-3 font-mono text-xs">{v.value}</td>
                    <td className="px-4 py-3">
                      <UpdateDomainValueForm
                        value={v}
                        parentOptions={parentOptions.filter(
                          (o) => o.value !== v.value,
                        )}
                        action={updateDomainValueAction}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {v.parentValue ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {v.isActive ? "Yes" : "No"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
        <AddDomainValueForm
          domainListId={domain.id}
          parentOptions={parentOptions}
          action={addDomainValueAction}
        />
      </div>
    </AdminAppShell>
  );
}
