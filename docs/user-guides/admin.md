# User guide — Admin

**Role:** `Admin` (`admin@ltjbm.local` after seed)  
**Home surfaces:** `/admin`, `/reports/templates`, `/reports/schedules`

## You can

- Manage users, roles, Branch Leader branch scopes; deactivate; reset passwords
- Maintain domains / dropdowns / subdomains for data-entry
- Export members (CSV/JSON) and download a logical backup snapshot
- Edit Board report templates and run the monthly Board email
- Access members, finance, and reports (full access)

## You cannot / must not

- Strip your own Admin role or deactivate yourself in the UI
- Treat the logical JSON snapshot as a full production restore — use Postgres dump/restore ([backup-restore](../backup-restore.md))

## Common tasks

### Users
1. Open **Admin → Users** (`/admin/users`).
2. Create user → pick role. For `BranchLeader`, assign branch scope(s).
3. Edit to deactivate or reset password when needed.

### Domains
1. **Admin → Domains** (`/admin/domains`).
2. Open a list (e.g. `ghana_region`) and add values; use `parentValue` for subdomains (Accra under a region).
3. Member/finance forms consume these lists where wired.

### Export, migrate & backup
1. **Admin → Export** → download CSV or JSON (audited).
2. **Admin → Migrate** → upload a register CSV, map columns, dry-run, then commit (biodata only — never finance).
3. **Admin → Backup** → review automated schedule env, download logical snapshot (no password hashes).
4. For real recovery / nightly cron, follow [`docs/backup-restore.md`](../backup-restore.md) (`npm run backup:scheduled`, `pg_dump` / `pg_restore`).

### Board reporting (Data Centre overlap)
1. `/reports/templates` — add a field or chart; confirm `/reports` updates.
2. `/reports/schedules` — review cron/distribution; **Run monthly Board email now** (file mode writes under `tmp/board-reports` by default).

## Quick checks

- Clerk hitting `/admin` → forbidden
- Export row count matches seed (≥100 members on demo DB)
