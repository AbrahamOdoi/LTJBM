import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import { UpdateUserForm } from "@/components/admin/user-forms";
import { updateUserAction } from "@/lib/admin/actions";
import { getUser, listBranchesForAdmin } from "@/lib/admin/queries";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const { id } = await params;
  const [user, branches] = await Promise.all([
    getUser(id),
    listBranchesForAdmin(),
  ]);
  if (!user) notFound();

  return (
    <AdminAppShell
      title={user.name}
      subtitle={`Role: ${user.role}`}
      userName={session.user.name}
    >
      <p className="text-sm">
        <Link href="/admin/users" className="text-sky-800 hover:underline">
          ← All users
        </Link>
      </p>
      <UpdateUserForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          branchIds: user.branchScopes.map((s) => s.branchId),
        }}
        branches={branches}
        action={updateUserAction}
      />
    </AdminAppShell>
  );
}
