import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminBackupPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  return (
    <AdminAppShell
      title="Backup & restore"
      subtitle="Demo narrative for Section 8: export + describe restore. Production path is Postgres dump/restore; a logical JSON snapshot is available for walkthroughs."
      userName={session.user.name}
    >
      <section className="rounded-xl border border-slate-200 bg-white/90 p-5 space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Demo hooks
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/backup/snapshot"
            className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Download logical snapshot (JSON)
          </a>
          <a
            href="/api/admin/export/members?format=csv"
            className="inline-flex rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            Member CSV export
          </a>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          The logical snapshot packs users (no passwords), org structure, domains,
          members, households, and a recent audit sample. It is{" "}
          <strong className="font-medium">not</strong> a byte-for-byte database
          restore — use it to show portability in the demo, then point to the
          Postgres procedure below for real recovery.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/90 p-5 space-y-3 text-sm text-slate-700 leading-relaxed">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Production restore (Postgres)
        </h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Take a backup:{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              docker compose exec -T postgres pg_dump -U cdms -d cdms -Fc &gt; backup.dump
            </code>
          </li>
          <li>
            On a clean database, restore:{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">
              docker compose exec -T postgres pg_restore -U cdms -d cdms --clean --if-exists &lt; backup.dump
            </code>
          </li>
          <li>
            Re-attach the app with the same <code>DATABASE_URL</code>; confirm
            member count and a Clerk/Admin login.
          </li>
          <li>
            Full runbook: <code>docs/backup-restore.md</code> in the repo.
          </li>
        </ol>
        <p className="text-xs text-slate-500">
          Phase C will add scheduled automated backups and a restore drill
          checklist. Spreadsheet import/validation is also Phase C (not this
          console).
        </p>
      </section>
    </AdminAppShell>
  );
}
