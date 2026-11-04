import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import { CreateUserForm } from "@/components/admin/user-forms";
import { DataTable, DataTableFilterBar } from "@/components/data-table";
import { createUserAction } from "@/lib/admin/actions";
import { listBranchesForAdmin, listUsers } from "@/lib/admin/queries";
import { parsePageParams } from "@/lib/data-table";
import { roleLabel } from "@/lib/role-labels";
import { ALL_ROLES, canAccessAdmin } from "@/lib/roles";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
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
  const [listed, branches] = await Promise.all([
    listUsers({
      q: sp.q,
      role: sp.role,
      status: sp.status,
      page,
      pageSize,
    }),
    listBranchesForAdmin(),
  ]);
  const filters = { q: sp.q, role: sp.role, status: sp.status };

  return (
    <AdminAppShell
      title="Users & roles"
      subtitle="Admin / Data Centre user management. Branch Leaders require branch scope; Records Clerks never gain finance through this screen."
      userName={session.user.name}
    >
      <DataTableFilterBar className="sm:grid-cols-[1fr_180px_160px_auto]" submitLabel="Filter">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search name or email…"
          className="lt-input"
        />
        <select name="role" defaultValue={sp.role ?? ""} className="lt-input">
          <option value="">All roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r)}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="lt-input"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </DataTableFilterBar>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "role", header: "Role" },
            { key: "scope", header: "Scope" },
            { key: "status", header: "Status" },
            { key: "edit", header: " " },
          ]}
          rows={listed.items}
          rowKey={(u) => u.id}
          emptyTitle="No users match these filters"
          emptyBody="Try clearing search or role filters."
          pagination={{
            pathname: "/admin/users",
            filters,
            result: listed,
            noun: "users",
          }}
          renderCell={(u, key) => {
            switch (key) {
              case "name":
                return <span className="font-medium">{u.name}</span>;
              case "email":
                return (
                  <span className="text-[var(--lt-muted)]">{u.email}</span>
                );
              case "role":
                return roleLabel(u.role);
              case "scope":
                return (
                  <span className="text-xs text-[var(--lt-muted)]">
                    {u.branchScopes.length === 0
                      ? "—"
                      : u.branchScopes.map((s) => s.branch.code).join(", ")}
                  </span>
                );
              case "status":
                return u.isActive ? "Active" : "Inactive";
              case "edit":
                return (
                  <div className="text-right">
                    <Link href={`/admin/users/${u.id}`} className="lt-link">
                      Edit
                    </Link>
                  </div>
                );
              default:
                return null;
            }
          }}
        />
        <CreateUserForm branches={branches} action={createUserAction} />
      </div>
    </AdminAppShell>
  );
}
