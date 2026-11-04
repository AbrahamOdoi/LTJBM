# LTJBM CDMS

Church Database Management System for **Living Testimonies for Jesus Bible Ministry (LTJBM)**.

Phase A platform foundation (Platform / Auth workstream):

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma schema skeleton (org, members, finance, auth, audit, reporting config)
- Auth.js (NextAuth v5) credential sessions with roles
- Middleware / route guards: HQ-only finance; RecordsClerk denied finance
- Audit log plumbing (`writeAuditLog`)
- Docker Compose for local Postgres

Finance Phase A (HQ): obligations, payments, Saturday batch variance, dues
arrears, and Expected/Paid/Outstanding APIs.

Reporting Phase A/B: Board/Council live dashboards, monthly Board email
(demo file output), and Admin/Data Centre live report-template edit.

## Roles

| Role | Notes |
| --- | --- |
| `RecordsClerk` | Biodata only — **no finance / reporting** |
| `BranchLeader` | Scoped to assigned branch(es); no finance/reporting by default |
| `FinancialSecretary` | HQ finance read/write; may view reports |
| `PastoralBoard` | Aggregated Board dashboard (kind rollups) |
| `LeadershipCouncil` | Aggregated Council dashboard (+ branch/period) |
| `Admin` | Full access incl. report template edit |

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

# 3. Start Postgres
docker compose up -d

# 4. Migrate + seed demo users / org skeleton
npx prisma migrate dev --name init
npm run db:seed
```

## Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo users (after seed)

Password defaults to `ChangeMe123!` (override with `SEED_PASSWORD`).

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
3. Finance HQ screens: `/finance/obligations`, `/finance/batches`, `/finance/arrears`
4. Reporting consume contract: `GET /api/finance/balances` (Expected / Paid / Outstanding by kind)
5. Sign in as `board@ltjbm.local` → `/reports` shows kind rollups (auto-refresh after payments)
6. Sign in as `council@ltjbm.local` → `/reports` also shows branch + period breakdowns
7. Sign in as `admin@ltjbm.local` → `/reports/templates` add field/chart; `/reports/schedules` run email

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
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed roles/org/demo users |
| `npm run db:studio` | Prisma Studio |
| `npm run test:finance` | Finance balance / batch variance unit tests |
| `npm run test:reporting` | Report template layout unit tests |
| `npm run report:monthly` | Generate monthly Board email artifact |
| `npx prisma generate` | Regenerate Prisma Client |

## Layout (key paths)

```
prisma/schema.prisma          Domain + auth/audit skeleton
prisma/seed.ts                Demo users, branches, obligation types, Board template
src/auth.ts                   Auth.js + Credentials provider
src/auth.config.ts            Edge middleware + finance/reporting gates
src/middleware.ts             NextAuth middleware entry
src/lib/roles.ts              Role matrix helpers
src/lib/audit.ts              Audit log writer
src/lib/auth-guards.ts        Server/API guards
src/lib/finance/              Balance math, batches, arrears, service
src/lib/reporting/            Dashboard aggregates, templates, Board email
src/app/finance/              HQ Financial Secretary / Admin UI
src/app/reports/              Board/Council dashboards + template/schedule UI
src/app/api/finance/          HQ finance APIs (RBAC gated)
src/app/api/reports/          Reporting APIs (aggregates read + template edit)
src/components/finance/       Finance forms
src/components/reporting/     Dashboard live refresh, template editor
docker-compose.yml            Local Postgres 16
```

## Workstream boundaries

- **Platform / Auth** — this bootstrap, RBAC, audit plumbing
- **Members / Biodata** — member CRUD, household, photos, duplicates, transfers
- **Finance** — obligations, payments, Saturday batch, arrears (write path)
- **Reporting** — Board rollups, schedules, template edit (reads aggregates only)
- **Admin / Migration** — domains, user admin, export/backup
- **QA / Demo** — Section 8 script and seeded demo DB
