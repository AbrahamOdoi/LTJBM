# LTJBM CDMS

Church Database Management System for **Living Testimonies for Jesus Bible Ministry (LTJBM)**.

Phase A/B foundation:

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma schema (org, members, finance, auth, audit, reporting config, domains)
- Auth.js (NextAuth v5) credential sessions with roles
- Middleware / route guards: HQ-only finance; Admin-only `/admin`; RecordsClerk denied finance
- Audit log plumbing (`writeAuditLog`)
- Docker Compose for local Postgres (+ optional staging-like `app` profile)
- GitHub Actions CI: lint / typecheck / unit tests / production build
- **Members / Biodata:** register/update, household, cells & fellowships, photo upload, deterministic duplicates, status history, Ghana→international transfer, individual/group print, ≥100 seeded members
- **Admin / Migration:** domains/dropdowns/subdomains, user/role admin, member CSV/JSON export, logical backup snapshot + `docs/backup-restore.md` + `scripts/backup-db.sh` / `restore-db.sh`

Finance Phase A (HQ): obligations, payments, Saturday batch variance, dues
arrears, and Expected/Paid/Outstanding APIs.

Reporting Phase A/B: Board/Council live dashboards, monthly Board email
(demo file output), and Admin/Data Centre live report-template edit.

## Roles

| Role | Notes |
| --- | --- |
| `RecordsClerk` | Biodata only — **no finance / reporting** |
| `BranchLeader` | Scoped to assigned branch(es); no finance/reporting by default |
| `FinancialSecretary` | HQ finance read/write (individual giving); may view reports |
| `PastoralBoard` | Aggregated Board dashboard only (`/reports`) — **no `/finance`** |
| `LeadershipCouncil` | Aggregated Council dashboard (`/reports`) — **no `/finance`** |
| `Admin` | Full access incl. finance + report template edit |

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (for local Postgres)
- npm

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Environment
cp .env.example .env
# Generate AUTH_SECRET:
#   openssl rand -base64 32

# 3. Start Postgres (bound to 127.0.0.1 only)
docker compose up -d postgres

# 4. Migrate + seed demo users / org skeleton
npx prisma migrate deploy
npm run db:seed
```

### Staging-like local (full Compose stack)

```bash
# Set AUTH_SECRET (and preferably POSTGRES_PASSWORD) in .env first
docker compose --profile staging up -d --build
docker compose --profile staging exec app npx prisma migrate deploy
docker compose --profile staging exec app npm run db:seed
```

Open [http://localhost:3000](http://localhost:3000). Staging/deploy assumptions: see Project store `docs/deploy-runbook.md`.

## Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo users (after seed)

**LOCAL DEMO ONLY:** password defaults to `ChangeMe123!` (override with `SEED_PASSWORD`).  
Never reuse the default in staging/production — `npm run db:seed` refuses that default when `NODE_ENV=production`.

| Email | Role |
| --- | --- |
| `admin@ltjbm.local` | Admin |
| `clerk@ltjbm.local` | RecordsClerk |
| `branch@ltjbm.local` | BranchLeader |
| `finance@ltjbm.local` | FinancialSecretary |
| `board@ltjbm.local` | PastoralBoard |
| `council@ltjbm.local` | LeadershipCouncil |

### Quick RBAC checks

1. Sign in as `clerk@ltjbm.local` → open `/finance` → redirected to `/forbidden?reason=finance`; `/reports` → `/forbidden?reason=reporting`
2. Sign in as `finance@ltjbm.local` → `/finance` loads; `GET /api/finance/health` returns `{ ok: true }`
3. Sign in as `board@ltjbm.local` → `/finance` → forbidden; `/reports` loads aggregates only
4. Sign in as `clerk@ltjbm.local` → `/members` full register/update/transfer/print
5. Sign in as `branch@ltjbm.local` → `/members` scoped to East Legon only
6. Finance HQ screens: `/finance/obligations`, `/finance/batches`, `/finance/arrears` (Finance/Admin only)
7. Reporting consume contract: `GET /api/finance/balances` (Expected / Paid / Outstanding by kind) — Finance/Admin; Board uses `/api/reports/dashboard`
8. Sign in as `board@ltjbm.local` → `/reports` shows kind rollups (auto-refresh after payments)
9. Sign in as `council@ltjbm.local` → `/reports` also shows branch + period breakdowns
10. Sign in as `admin@ltjbm.local` → `/reports/templates` add field/chart; `/reports/schedules` run email
11. Sign in as `admin@ltjbm.local` → `/admin` domains/users/export/backup; clerk hitting `/admin` → forbidden
12. Admin: download `/api/admin/export/members?format=csv` and logical backup snapshot
13. Unauthenticated `GET /uploads/members/<photo>` → redirected to login (photos are PII)

### Monthly Board email (demo)

```bash
# Writes HTML under ./tmp/board-reports (or REPORT_EMAIL_DIR)
npm run report:monthly

# Or as Admin in the UI: /reports/schedules → "Run monthly Board email now"
# Or cron:
#   curl -X POST -H "Authorization: Bearer $REPORT_CRON_SECRET" \
#     -H "Content-Type: application/json" \
#     http://localhost:3000/api/reports/schedules/run
```

Default schedule cron: `0 8 1 * *` (08:00 on the 1st) to `board@ltjbm.local` + `council@ltjbm.local`.
`REPORT_EMAIL_MODE=file` (default) is demo-friendly; set `console` to print instead of writing a file.

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` / `npm start` | Production build & serve |
| `npm run lint` / `npm run typecheck` | ESLint + `tsc --noEmit` |
| `npm test` | Finance + reporting unit tests |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:deploy` | Apply Prisma migrations (CI/staging) |
| `npm run db:seed` | Seed roles/org/demo users |
| `npm run db:studio` | Prisma Studio |
| `npm run test:finance` | Finance balance / batch variance unit tests |
| `npm run test:reporting` | Report template layout unit tests |
| `npm run test:smoke` | Section 8 HTTP smoke (RBAC + finance + reporting) |
| `npm run smoke:finance` | Service-layer finance seed sanity (no HTTP) |
| `npm run report:monthly` | Generate monthly Board email artifact |
| `npm run backup:db` / `npm run restore:db` | Postgres dump/restore via Compose |
| `npx prisma generate` | Regenerate Prisma Client |

## Layout (key paths)

```
prisma/schema.prisma          Domain + auth/audit skeleton
prisma/seed.ts                Demo users, branches, ≥100 members, obligation types, Board template
src/auth.ts                   Auth.js + Credentials provider
src/auth.config.ts            Edge middleware + finance/reporting gates
src/middleware.ts             NextAuth middleware entry
src/lib/roles.ts              Role matrix helpers
src/lib/audit.ts              Audit log writer
src/lib/auth-guards.ts        Server/API guards
src/lib/members/              Biodata access, duplicates, photos, actions
src/lib/finance/              Balance math, batches, arrears, service
src/lib/reporting/            Dashboard aggregates, templates, Board email
src/lib/admin/                Domains, users, export, logical backup helpers
src/app/members/              Clerk/Branch member UI + print
src/app/finance/              HQ Financial Secretary / Admin UI
src/app/reports/              Board/Council dashboards + template/schedule UI
src/app/admin/                Admin / Data Centre console
src/app/api/finance/          HQ finance APIs (RBAC gated)
src/app/api/reports/          Reporting APIs (aggregates read + template edit)
src/app/api/admin/            Member export + backup snapshot (Admin-only)
src/components/finance/       Finance forms
src/components/reporting/     Dashboard live refresh, template editor
docs/backup-restore.md        Section 8 restore narrative + scripts
docs/demo-script.md           Section 8 ordered demo + pass/fail checklist
docs/user-guides/             Role user guides (Admin, Finance, Branch, Data Centre)
scripts/backup-db.sh          Postgres custom-format dump → ./backups
scripts/restore-db.sh         pg_restore + optional uploads archive
scripts/smoke-section8.ts     Full Section 8 HTTP smoke harness
docker-compose.yml            Postgres 16 (+ staging profile `app`)
Dockerfile                    Standalone Next.js production image
.github/workflows/ci.yml      Lint / typecheck / test / build
public/uploads/members/       Local photo storage (demo)
```

## UI imagery & motion

Liveliness stays inside the flat Planning Center–class system (solid paper, teal accent — **no page gradients**):

- **Member photos** — circular avatars on the register and detail; initials placeholders when no photo is on file. Seed attaches tracked `public/images/avatars/demo-*.svg` placeholders (non-PII) to the first 24 members A–Z; real uploads still go to `public/uploads/members/`.
- **Scene photography** — church / Christian scenes under `public/images/scenes/` (sanctuary, congregation, steeple cross, altar, stained glass, pews) for login, role home cards, Contributions / Board / Data Centre banners, and empty states. Credit table: [`public/images/ATTRIBUTION.md`](public/images/ATTRIBUTION.md).
- **Cross watermark** — subtle repeating Latin cross (`public/images/cross-pattern.svg`) on paper canvas backgrounds system-wide; low-opacity teal, not loud.
- **Subtle motion** — page enter fade (`.lt-enter`), list row hover (`.lt-row-hover`), staggered dashboard card appear (`.lt-card-appear`); all respect `prefers-reduced-motion`.

## Documentation

| Doc | Purpose |
| --- | --- |
| [`docs/user-guides/`](docs/user-guides/) | Short guides: [Admin](docs/user-guides/admin.md), [Finance](docs/user-guides/finance.md), [Branch](docs/user-guides/branch.md), [Data Centre](docs/user-guides/data-centre.md) |
| [`docs/demo-script.md`](docs/demo-script.md) | Section 8 ordered Demo Day walkthrough |
| [`docs/backup-restore.md`](docs/backup-restore.md) | Export + `pg_dump` / `pg_restore` narrative |
| [`public/images/ATTRIBUTION.md`](public/images/ATTRIBUTION.md) | Church scene photo attribution (Unsplash + Wikimedia) |

## Workstream boundaries

- **Platform / Auth** — this bootstrap, RBAC, audit plumbing
- **Members / Biodata** — member CRUD, household, photos, duplicates, transfers, print, seed biodata
- **Finance** — obligations, payments, Saturday batch, arrears (write path)
- **Reporting** — Board rollups, schedules, template edit (reads aggregates only)
- **Admin / Migration** — domains, user admin, export/backup narrative (import = Phase C)
- **QA / Demo** — Section 8 script and seeded demo DB
- **Docs / Training** — role user guides + training outline (Phase B)
