# Backup & restore — LTJBM CDMS

Supports the **Section 8 demo** requirement: *data export + describe restore*.  
Admin Phase A/B ships member export + a logical JSON snapshot; **authoritative recovery** is PostgreSQL dump/restore via the scripts below.

## What to show in the demo

1. Sign in as `admin@ltjbm.local`.
2. Open **Admin → Export** and download member CSV/JSON.
3. Open **Admin → Backup** and download the **logical snapshot** (users without passwords, org, domains, members, households, recent audit).
4. Verbally (or from this doc): production restore uses `pg_dump` / `pg_restore` on the managed/local Postgres volume — the JSON snapshot proves portability; the dump restores the live system.

## Scripts (preferred)

Assumes `docker compose` service `postgres`, credentials from `.env` / defaults (`cdms` / `cdms` / db `cdms`).

```bash
# Custom-format dump → ./backups/cdms-YYYYMMDD-HHMMSS.dump
npm run backup:db
# or: ./scripts/backup-db.sh

# Also write plain SQL + archive member photos
./scripts/backup-db.sh --sql --with-uploads

# Restore (WARNING: replaces objects in the target DB)
npm run restore:db -- backups/cdms-YYYYMMDD-HHMMSS.dump
# or: ./scripts/restore-db.sh backups/cdms-YYYYMMDD-HHMMSS.dump
# with photos:
./scripts/restore-db.sh backups/cdms-....dump --with-uploads backups/uploads-....tgz
```

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

Member photos for the demo live under `public/uploads/members/` (Compose volume `cdms_uploads` when using the staging profile). A DB-only restore does **not** restore photo files. Use `--with-uploads` on the backup/restore scripts, or:

```bash
tar -czf backups/uploads-$(date +%Y%m%d).tgz -C public/uploads members
```

## Restore drill checklist (staging)

1. Take a timed backup: `time npm run backup:db -- --with-uploads`
2. Note dump size and duration; store dump off the app host if this is a shared staging box.
3. On a **non-demo** scratch DB (or after demo hours): restore with `scripts/restore-db.sh`.
4. Verify: Admin login, member count ≥ seed, one finance obligation still balances, one photo still loads if uploads restored.
5. Record owner + timestamp (Phase C automates schedule/retention).

## Phase C (not fully automated here)

- Cron/scheduled automated backups + retention
- Off-host backup copy (object storage / second VPS)
- Formal ownership + RTO targets

## Security notes

- Logical snapshots omit password hashes.
- Export and snapshot endpoints are Admin-only (`/api/admin/*`) and write audit events.
- Treat dump files as PII; store and transmit accordingly.
- Default Compose passwords (`cdms`/`cdms`) are for laptop/demo only — change `POSTGRES_PASSWORD` + `AUTH_SECRET` on any shared host.
