import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminAppShell } from "@/components/admin/app-shell";
import {
  backupScheduleSummary,
  getBackupScheduleConfig,
} from "@/lib/admin/backup-schedule";
import { getPhotoStorageMode } from "@/lib/members/photos";
import { canAccessAdmin } from "@/lib/roles";

export default async function AdminBackupPage() {
  const session = await auth();
  if (!session?.user || !canAccessAdmin(session.user.role)) {
    redirect("/forbidden?reason=admin");
  }

  const schedule = getBackupScheduleConfig();
  const summary = backupScheduleSummary(schedule);
  const photoMode = getPhotoStorageMode();

  return (
    <AdminAppShell
      title="Backup & restore"
      subtitle="Logical snapshot for demos, Postgres dump/restore for production, and automated schedule guidance for the host."
      userName={session.user.name}
    >
      <section className="lt-panel space-y-4 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Automated schedule
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {[
            { label: "Status", value: summary.statusLabel },
            { label: "Cron expression", value: summary.cronLabel },
            { label: "Retention", value: summary.retentionLabel },
            { label: "Backup directory", value: summary.dirLabel },
            { label: "Uploads archive", value: summary.uploadsLabel },
            { label: "Photo storage", value: summary.photoStorageLabel },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded border border-[var(--lt-line)] px-3 py-3"
            >
              <dt className="text-[0.7rem] uppercase tracking-[0.12em] text-[var(--lt-muted)]">
                {row.label}
              </dt>
              <dd className="mt-1 font-medium text-[var(--lt-ink)] break-all">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="space-y-2 text-sm text-[var(--lt-muted)] leading-relaxed">
          <p>
            Host cron (recommended nightly):
          </p>
          <pre className="overflow-x-auto rounded border border-[var(--lt-line)] bg-[var(--lt-paper)] p-3 text-xs text-[var(--lt-ink)]">
{`# Example crontab — 02:00 daily
${schedule.cron} cd /path/to/LTJBM && npm run backup:scheduled >> /var/log/ltjbm-backup.log 2>&1`}
          </pre>
          <ul className="list-disc pl-5 space-y-1">
            {schedule.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="text-xs">
            Toggle with <code className="text-xs bg-[var(--lt-paper)] px-1 rounded">BACKUP_SCHEDULE_ENABLED</code>,{" "}
            <code className="text-xs bg-[var(--lt-paper)] px-1 rounded">BACKUP_CRON</code>,{" "}
            <code className="text-xs bg-[var(--lt-paper)] px-1 rounded">BACKUP_RETENTION_DAYS</code> in{" "}
            <code className="text-xs bg-[var(--lt-paper)] px-1 rounded">.env</code>. Full procedure:{" "}
            <code className="text-xs bg-[var(--lt-paper)] px-1 rounded">docs/backup-restore.md</code>.
          </p>
        </div>
      </section>

      <section className="lt-panel space-y-4 p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Demo hooks
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/backup/snapshot"
            className="lt-btn-primary px-4 py-2 text-sm"
          >
            Download logical snapshot (JSON)
          </a>
          <a
            href="/api/admin/export/members?format=csv"
            className="inline-flex rounded-md border border-[var(--lt-line)] bg-white px-4 py-2 text-sm hover:bg-[var(--lt-paper)]"
          >
            Member CSV export
          </a>
          <a
            href="/admin/migrate"
            className="inline-flex rounded-md border border-[var(--lt-line)] bg-white px-4 py-2 text-sm hover:bg-[var(--lt-paper)]"
          >
            Register migration wizard
          </a>
        </div>
        <p className="text-sm text-[var(--lt-muted)] leading-relaxed">
          The logical snapshot packs users (no passwords), org structure, domains,
          members, households, and a recent audit sample. It is{" "}
          <strong className="font-medium text-[var(--lt-ink)]">not</strong> a
          byte-for-byte database restore — use Postgres dump/restore for real
          recovery. Photo bytes today:{" "}
          <strong className="font-medium text-[var(--lt-ink)]">
            {photoMode === "s3" ? "S3-compatible bucket" : "local disk fallback"}
          </strong>
          .
        </p>
      </section>

      <section className="lt-panel space-y-3 p-5 text-sm text-[var(--lt-muted)] leading-relaxed">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--lt-muted)]">
          Production restore (Postgres)
        </h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Take a backup:{" "}
            <code className="text-xs bg-[var(--lt-paper)] px-1 rounded">
              npm run backup:db
            </code>{" "}
            or scheduled{" "}
            <code className="text-xs bg-[var(--lt-paper)] px-1 rounded">
              npm run backup:scheduled
            </code>
            .
          </li>
          <li>
            On a clean database, restore:{" "}
            <code className="text-xs bg-[var(--lt-paper)] px-1 rounded">
              npm run restore:db -- backups/cdms-….dump
            </code>
            .
          </li>
          <li>
            Re-attach the app with the same <code>DATABASE_URL</code>; confirm
            member count and a Clerk/Admin login.
          </li>
          <li>
            Restore drill checklist and retention notes live in{" "}
            <code className="text-xs bg-[var(--lt-paper)] px-1 rounded">
              docs/backup-restore.md
            </code>
            .
          </li>
        </ol>
      </section>
    </AdminAppShell>
  );
}
