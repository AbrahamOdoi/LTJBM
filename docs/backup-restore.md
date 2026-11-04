# Backup & restore — LTJBM CDMS

Supports the **Section 8 demo** requirement: *data export + describe restore*.  
Admin Phase A/B ships member export + a logical JSON snapshot; **authoritative recovery** is PostgreSQL dump/restore.

## What to show in the demo

1. Sign in as `admin@ltjbm.local`.
2. Open **Admin → Export** and download member CSV/JSON.
3. Open **Admin → Backup** and download the **logical snapshot** (users without passwords, org, domains, members, households, recent audit).
4. Verbally (or from this doc): production restore uses `pg_dump` / `pg_restore` on the managed/local Postgres volume — the JSON snapshot proves portability; the dump restores the live system.

## Local Docker backup

Assumes `docker compose` service `postgres`, user/db `cdms` (see `.env.example` / `docker-compose.yml`).

```bash
# Custom-format dump (recommended)
docker compose exec -T postgres pg_dump -U cdms -d cdms -Fc > backup-$(date +%Y%m%d).dump

# Plain SQL (optional)
docker compose exec -T postgres pg_dump -U cdms -d cdms > backup-$(date +%Y%m%d).sql
```

## Local restore

```bash
# Recreate empty DB if needed, then:
docker compose exec -T postgres pg_restore -U cdms -d cdms --clean --if-exists < backup-YYYYMMDD.dump
```

After restore:

1. Restart the Next.js app (`npm run dev` / `npm start`).
2. Sign in as Admin and Clerk; verify `/admin` stats member count and `/members` list.
3. Optional: `npx prisma migrate status` to confirm migration history matches.

## Photos / uploads

Member photos for the demo live under `public/uploads/members/`. A DB-only restore does **not** restore photo files. For a full drill, archive that folder with the dump:

```bash
tar -czf uploads-$(date +%Y%m%d).tgz public/uploads/members
```

## Phase C (not in this release)

- Scheduled automated backups + retention
- Documented restore drill with timing/ownership
- Spreadsheet import pipeline with validation error reporting

## Security notes

- Logical snapshots omit password hashes.
- Export and snapshot endpoints are Admin-only (`/api/admin/*`) and write audit events.
- Treat dump files as PII; store and transmit accordingly.
