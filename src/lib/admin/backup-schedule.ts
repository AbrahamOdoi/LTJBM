/**
 * Automated backup schedule config (env-driven) for Admin UI + docs.
 * Actual dumps still run via scripts/backup-db.sh (cron / systemd / Compose).
 */

export type BackupScheduleConfig = {
  enabled: boolean;
  cron: string;
  retentionDays: number;
  backupDir: string;
  withUploads: boolean;
  withSql: boolean;
  cronSecretConfigured: boolean;
  storageMode: "local-disk" | "s3-photos-only";
  notes: string[];
};

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function getBackupScheduleConfig(): BackupScheduleConfig {
  const enabled = truthy(process.env.BACKUP_SCHEDULE_ENABLED);
  const cron = process.env.BACKUP_CRON?.trim() || "0 2 * * *";
  const retentionRaw = Number(process.env.BACKUP_RETENTION_DAYS ?? "14");
  const retentionDays =
    Number.isFinite(retentionRaw) && retentionRaw > 0 ? retentionRaw : 14;
  const backupDir = process.env.BACKUP_DIR?.trim() || "./backups";
  const withUploads =
    process.env.BACKUP_WITH_UPLOADS === undefined
      ? true
      : truthy(process.env.BACKUP_WITH_UPLOADS);
  const withSql = truthy(process.env.BACKUP_WITH_SQL);
  const cronSecretConfigured = Boolean(
    process.env.REPORT_CRON_SECRET &&
      process.env.REPORT_CRON_SECRET.length >= 16 &&
      process.env.REPORT_CRON_SECRET !== "replace-with-cron-secret",
  );
  const s3 =
    Boolean(process.env.S3_ENDPOINT?.trim()) &&
    Boolean(process.env.S3_BUCKET?.trim());

  const notes: string[] = [];
  if (!enabled) {
    notes.push(
      "Schedule flag is off (BACKUP_SCHEDULE_ENABLED). Host cron can still call npm run backup:db.",
    );
  }
  notes.push(
    `Suggested cron: ${cron} → npm run backup:scheduled (retention ${retentionDays} days).`,
  );
  if (s3) {
    notes.push(
      "Member photos use S3-compatible storage — DB dumps do not include photo bytes; rely on bucket versioning/lifecycle.",
    );
  } else {
    notes.push(
      "Photos are local — prefer backup:scheduled with --with-uploads (default).",
    );
  }

  return {
    enabled,
    cron,
    retentionDays,
    backupDir,
    withUploads,
    withSql,
    cronSecretConfigured,
    storageMode: s3 ? "s3-photos-only" : "local-disk",
    notes,
  };
}

/** Human labels for the Admin backup console. */
export function backupScheduleSummary(cfg: BackupScheduleConfig = getBackupScheduleConfig()) {
  return {
    statusLabel: cfg.enabled ? "Enabled (env)" : "Manual / host cron",
    cronLabel: cfg.cron,
    retentionLabel: `${cfg.retentionDays} days`,
    dirLabel: cfg.backupDir,
    uploadsLabel: cfg.withUploads ? "Include local photo archive" : "DB dump only",
    photoStorageLabel:
      cfg.storageMode === "s3-photos-only"
        ? "S3-compatible object storage"
        : "Local disk (storage/uploads)",
  };
}
