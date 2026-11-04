# Backup & restore — LTJBM CDMS

Supports the **Section 8 demo** requirement: *data export + describe restore*.  
Admin ships member export + a logical JSON snapshot; **authoritative recovery** is PostgreSQL dump/restore via the scripts below. **Phase F** adds a scheduled backup wrapper with retention and an Admin schedule panel.

## What to show in the demo

1. Sign in as `admin@ltjbm.local`.
2. Open **Admin → Export** and download member CSV/JSON.
3. Open **Admin → Backup** — review the **Automated schedule** panel, then download the **logical snapshot**.
4. Optionally open **Admin → Migrate** to show spreadsheet import (map → dry-run → commit).
5. Verbally (or from this doc): production restore uses `pg_dump` / `pg_restore` on the managed/local Postgres volume — the JSON snapshot proves portability; the dump restores the live system.

## Scripts (preferred)

Assumes `docker compose` service `postgres`, credentials from `.env` / defaults (`cdms` / `cdms` / db `cdms`).

```bash
# Custom-format dump → ./backups/cdms-YYYYMMDD-HHMMSS.dump
npm run backup:db
# or: ./scripts/backup-db.sh

# Also write plain SQL + archive member photos (local disk)
./scripts/backup-db.sh --sql --with-uploads

# Scheduled wrapper (cron): dump + uploads + prune by BACKUP_RETENTION_DAYS
npm run backup:scheduled
# or: ./scripts/backup-scheduled.sh

# Restore (WARNING: replaces objects in the target DB)
npm run restore:db -- backups/cdms-YYYYMMDD-HHMMSS.dump
# or: ./scripts/restore-db.sh backups/cdms-YYYYMMDD-HHMMSS.dump
# with photos:
./scripts/restore-db.sh backups/cdms-....dump --with-uploads backups/uploads-....tgz
```

### Host cron example

```cron
# 02:00 daily — set BACKUP_* in the environment or .env loaded by the job
0 2 * * * cd /path/to/LTJBM && npm run backup:scheduled >> /var/log/ltjbm-backup.log 2>&1
```

Env knobs (also shown on `/admin/backup`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `BACKUP_SCHEDULE_ENABLED` | unset/false | UI “Enabled” flag (cron still works if you schedule it) |
| `BACKUP_CRON` | `0 2 * * *` | Suggested expression for operators |
| `BACKUP_RETENTION_DAYS` | `14` | Prune age for `backup:scheduled` |
| `BACKUP_DIR` | `./backups` | Dump output directory |
| `BACKUP_WITH_UPLOADS` | `true` | Archive local photos |
| `BACKUP_WITH_SQL` | `false` | Also write plain SQL |

## Manual Docker commands (equivalent)

```bash
# Custom-format dump (recommended)
docker compose exec -T postgres pg_dump -U cdms -d cdms -Fc > backups/backup-$(date +%Y%m%d).dump

# Plain SQL (optional)
docker compose exec -T postgres pg_dump -U cdms -d cdms > backups/backup-$(date +%Y%m%d).sql
```

### Local restore

```bash
docker compose exec -T postgres pg_restore -U cdms -d cdms --clean --if-exists < backups/backup-YYYYMMDD.dump
```

After restore:

1. Restart the Next.js app (`npm run dev` / `npm start` / Compose `app` service).
2. Sign in as Admin and Clerk; verify `/admin` stats member count and `/members` list.
3. Optional: `npx prisma migrate status` to confirm migration history matches.

## Photos / uploads

- **Serving:** `/api/members/photos/{key}` with branch-scoped ACL (not world-readable static files).
- **Storage:** S3-compatible when `S3_ENDPOINT` + `S3_BUCKET` + keys are set; otherwise local `storage/uploads/members/` (legacy `public/uploads/members/` still readable for older files).
- A DB-only restore does **not** restore photo files. Use `--with-uploads` when photos are local, or rely on bucket versioning/lifecycle when using S3.

```bash
tar -czf backups/uploads-$(date +%Y%m%d).tgz -C storage/uploads members
```

## Restore drill checklist (staging)

1. Take a timed backup: `time npm run backup:scheduled`
2. Note dump size and duration; store dump off the app host if this is a shared staging box.
3. On a **non-demo** scratch DB (or after demo hours): restore with `scripts/restore-db.sh`.
4. Verify: Admin login, member count ≥ seed, one finance obligation still balances, one photo still loads if uploads restored.
5. Record owner + timestamp; confirm retention prune removed dumps older than `BACKUP_RETENTION_DAYS`.

## Security notes

- Logical snapshots omit password hashes.
- Export, snapshot, and migrate endpoints are Admin-only (`/api/admin/*`) and write audit events.
- Treat dump files as PII; store and transmit accordingly.
- Default Compose passwords (`cdms`/`cdms`) are for laptop/demo only — change `POSTGRES_PASSWORD` + `AUTH_SECRET` on any shared host.
- Login failures are rate-limited; deactivated users have DB sessions revoked.
