# LTJBM CDMS

Church Database Management System for **Living Testimonies for Jesus Bible Ministry (LTJBM)**.

Phase A platform foundation (Platform / Auth workstream):

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma schema skeleton (org, members, finance, auth, audit, reporting config)
- Auth.js (NextAuth v5) credential sessions with roles
- Middleware / route guards: HQ-only finance; RecordsClerk denied finance
- Audit log plumbing (`writeAuditLog`)
- Docker Compose for local Postgres

Finance Phase A (HQ) is implemented on this codebase: obligations, payments,
Saturday batch variance, dues arrears, and Expected/Paid/Outstanding APIs.
Board dashboards/templates remain Reporting-owned.

## Roles

| Role | Notes |
| --- | --- |
| `RecordsClerk` | Biodata only — **no finance** routes or APIs |
| `BranchLeader` | Scoped to assigned branch(es); no finance by default |
| `FinancialSecretary` | HQ finance read/write |
| `PastoralBoard` | Aggregated finance read |
| `LeadershipCouncil` | Aggregated finance read |
| `Admin` | Full access |

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

1. Sign in as `clerk@ltjbm.local` → open `/finance` → redirected to `/forbidden?reason=finance`
2. Sign in as `finance@ltjbm.local` → `/finance` loads; `GET /api/finance/health` returns `{ ok: true }`
3. Finance HQ screens: `/finance/obligations`, `/finance/batches`, `/finance/arrears`
4. Reporting consume contract: `GET /api/finance/balances` (Expected / Paid / Outstanding by kind)

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` / `npm start` | Production build & serve |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed roles/org/demo users |
| `npm run db:studio` | Prisma Studio |
| `npm run test:finance` | Finance balance / batch variance unit tests |
| `npx prisma generate` | Regenerate Prisma Client |

## Layout (key paths)

```
prisma/schema.prisma          Domain + auth/audit skeleton
prisma/seed.ts                Demo users, branches, obligation types
src/auth.ts                   Auth.js + Credentials provider
src/auth.config.ts            Edge middleware + finance gate
src/middleware.ts             NextAuth middleware entry
src/lib/roles.ts              Role matrix helpers
src/lib/audit.ts              Audit log writer
src/lib/auth-guards.ts        Server/API guards
src/lib/finance/              Balance math, batches, arrears, service
src/app/finance/              HQ Financial Secretary / Admin UI
src/app/api/finance/          HQ finance APIs (RBAC gated)
src/components/finance/       Finance forms
docker-compose.yml            Local Postgres 16
```

## Workstream boundaries

- **Platform / Auth** — this bootstrap, RBAC, audit plumbing
- **Members / Biodata** — member CRUD, household, photos, duplicates, transfers
- **Finance** — obligations, payments, Saturday batch, arrears
- **Reporting** — Board rollups, schedules, template edit
- **Admin / Migration** — domains, user admin, export/backup
- **QA / Demo** — Section 8 script and seeded demo DB
