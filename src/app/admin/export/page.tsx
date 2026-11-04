import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import { adminConsoleStats } from "@/lib/admin/queries";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminExportPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const stats = await adminConsoleStats();

  return (
    <AdminAppShell
      title="Member data export"
      subtitle="Section 8 portability: download the current member register for offline review or migration handoff. Does not include finance ledgers."
      userName={session.user.name}
    >
      <section className="rounded-xl border border-slate-200 bg-white/90 p-5 space-y-4">
        <p className="text-sm text-slate-600">
          Ready to export <strong className="font-medium text-slate-900">{stats.memberCount}</strong>{" "}
          member records (biodata, branch, cell/fellowship, household name).
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/export/members?format=csv"
            className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Download CSV
          </a>
          <a
            href="/api/admin/export/members?format=json"
            className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            Download JSON
          </a>
        </div>
        <p className="text-xs text-slate-500">
          Each download is audited as <code>admin.members.export</code>. Photos
          stay in object storage / uploads; export includes <code>photoKey</code> only.
        </p>
      </section>
    </AdminAppShell>
  );
}
