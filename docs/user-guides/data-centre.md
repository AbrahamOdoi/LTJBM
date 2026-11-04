# User guide — Data Centre

**Role:** `Admin` (ops hat)  
**Refs:** [README](../../README.md), [demo-script](../demo-script.md), [backup-restore](../backup-restore.md), [admin guide](admin.md)

## You own

- Environment setup, demo DB reset, and RBAC smoke before Demo Day
- Domains, users, export/backup story, Board templates & schedules
- Facilitating the ordered Section 8 walkthrough
- Narrating restore; archiving photo uploads with DB dumps

## Setup & reset (local / staging)

```bash
npm install && cp .env.example .env   # set AUTH_SECRET
docker compose up -d
npx prisma migrate deploy            # or migrate dev on first local
npm run db:seed
npm run dev
```

**Clean demo:** recreate Postgres volume/DB → migrate → seed. Keep three browser sessions for Clerk, Finance, Board.

## RBAC smoke (must pass)

1. Clerk → `/members` OK; `/finance` & `/admin` & `/reports` forbidden  
2. Branch → members scoped; finance forbidden  
3. Finance → `/finance/*` OK; health API `{ ok: true }`  
4. Board → `/reports` kind rollups  
5. Council → `/reports` + branch/period breakdowns  
6. Admin → `/admin`, templates, schedules, export, backup  

## Demo Day facilitation

Follow [`docs/demo-script.md`](../demo-script.md) in order (S8-01…S8-15).  
Narrate HQ-only finance when Clerk hits forbidden. Do **not** wipe the live demo DB mid-walkthrough for restore — speak from the backup doc.

## Export & restore drill

1. UI: `/admin/export` (CSV/JSON) + `/admin/backup` (logical snapshot).  
2. Authoritative: `pg_dump` / `pg_restore` on service `postgres`, db `cdms` — see [backup-restore](../backup-restore.md).  
3. Archive `public/uploads/members/` with the dump (photos are not in Postgres).  
4. After restore: restart app; verify Admin stats + `/members`.

## Reporting ops

- Templates: `/reports/templates` — live field/chart edit  
- Schedules: `/reports/schedules` or `npm run report:monthly`  
- Default file mode → `./tmp/board-reports` (`REPORT_EMAIL_MODE=file`)

## Phase C (not this release)

Scheduled automated backups, timed restore drills, spreadsheet import + validation errors, full compliance pack.
