import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import { MigrateWizard } from "@/components/admin/migrate-wizard";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminMigratePage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  return (
    <AdminAppShell
      title="Register migration"
      subtitle="Import members from a spreadsheet or legacy register — map columns, dry-run validation, then commit. Does not import finance."
      userName={session.user.name}
    >
      <MigrateWizard />
    </AdminAppShell>
  );
}
