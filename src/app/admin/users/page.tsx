import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import { CreateUserForm } from "@/components/admin/user-forms";
import { createUserAction } from "@/lib/admin/actions";
import { listBranchesForAdmin, listUsers } from "@/lib/admin/queries";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const [users, branches] = await Promise.all([
    listUsers(),
    listBranchesForAdmin(),
  ]);

  return (
    <AdminAppShell
      title="Users & roles"
      subtitle="Admin / Data Centre user management. Branch Leaders require branch scope; Records Clerks never gain finance through this screen."
      userName={session.user.name}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-slate-200 bg-white/90 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {u.branchScopes.length === 0
                      ? "—"
                      : u.branchScopes
                          .map((s) => s.branch.code)
                          .join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? "Active" : "Inactive"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-sky-800 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <CreateUserForm branches={branches} action={createUserAction} />
      </div>
    </AdminAppShell>
  );
}
