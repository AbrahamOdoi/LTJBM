import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import { CreateDomainListForm } from "@/components/admin/domain-forms";
import { DataTable, DataTableFilterBar } from "@/components/data-table";
import { createDomainListAction } from "@/lib/admin/actions";
import { listDomainLists } from "@/lib/admin/queries";
import { parsePageParams } from "@/lib/data-table";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminDomainsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const sp = await searchParams;
  const { page, pageSize } = parsePageParams(sp);
  const listed = await listDomainLists({ q: sp.q, page, pageSize });
  const filters = { q: sp.q };

  return (
    <AdminAppShell
      title="Domains & dropdowns"
      subtitle="Admin-managed lists for the data-entry portal. Use parent values to express subdomains (e.g. region under country)."
      userName={session.user.name}
    >
      <DataTableFilterBar className="sm:grid-cols-[1fr_auto]" submitLabel="Search">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search label or key…"
          className="lt-input"
        />
      </DataTableFilterBar>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <DataTable
          columns={[
            { key: "label", header: "Label" },
            { key: "key", header: "Key" },
            { key: "values", header: "Values" },
            { key: "manage", header: " " },
          ]}
          rows={listed.items}
          rowKey={(d) => d.id}
          emptyTitle="No domain lists yet"
          emptyBody="Create one to drive portal dropdowns, or clear the search filter."
          pagination={{
            pathname: "/admin/domains",
            filters,
            result: listed,
            noun: "domains",
          }}
          renderCell={(d, key) => {
            switch (key) {
              case "label":
                return <span className="font-medium">{d.label}</span>;
              case "key":
                return (
                  <span className="font-mono text-xs text-[var(--lt-muted)]">
                    {d.key}
                  </span>
                );
              case "values":
                return (
                  <span className="tabular-nums">{d._count.values}</span>
                );
              case "manage":
                return (
                  <div className="text-right">
                    <Link href={`/admin/domains/${d.id}`} className="lt-link">
                      Manage
                    </Link>
                  </div>
                );
              default:
                return null;
            }
          }}
        />
        <CreateDomainListForm action={createDomainListAction} />
      </div>
    </AdminAppShell>
  );
}
