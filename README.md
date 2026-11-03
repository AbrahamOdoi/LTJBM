# LTJBM CDMS

Church Database Management System for **Living Testimonies for Jesus Bible Ministry (LTJBM)**.

Phase A/B foundation:

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma schema (org, members, finance, auth, audit, reporting config, domains)
- Auth.js (NextAuth v5) credential sessions with roles
- Middleware / route guards: HQ-only finance; Admin-only `/admin`; RecordsClerk denied finance
- Audit log plumbing (`writeAuditLog`)
- Docker Compose for local Postgres
- **Members / Biodata:** register/update, household, cells & fellowships, photo upload, deterministic duplicates, status history, Ghana→international transfer, individual/group print, ≥100 seeded members
- **Admin / Migration:** domains/dropdowns/subdomains, user/role admin, member CSV/JSON export, logical backup snapshot + `docs/backup-restore.md`

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
3. Sign in as `clerk@ltjbm.local` → `/members` full register/update/transfer/print
4. Sign in as `branch@ltjbm.local` → `/members` scoped to East Legon only
5. Sign in as `admin@ltjbm.local` → `/admin` domains/users/export/backup; clerk hitting `/admin` → forbidden
6. Admin: download `/api/admin/export/members?format=csv` and logical backup snapshot

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` / `npm start` | Production build & serve |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed roles/org/demo users |
| `npm run db:studio` | Prisma Studio |
| `npx prisma generate` | Regenerate Prisma Client |

## Layout (key paths)

```
prisma/schema.prisma          Domain + auth/audit skeleton
prisma/seed.ts                Demo users, branches, ≥100 members biodata
src/auth.ts                   Auth.js + Credentials provider
src/auth.config.ts            Edge middleware + finance gate
src/middleware.ts             NextAuth middleware entry
src/lib/roles.ts              Role matrix helpers
src/lib/audit.ts              Audit log writer
src/lib/auth-guards.ts        Server/API guards
src/lib/members/              Biodata access, duplicates, photos, actions
src/lib/admin/                Domains, users, export, logical backup helpers
src/app/members/              Clerk/Branch member UI + print
src/app/admin/                Admin / Data Centre console
src/app/api/finance/          HQ finance API gate (+ health smoke)
src/app/api/admin/            Member export + backup snapshot (Admin-only)
docs/backup-restore.md        Section 8 restore narrative (pg_dump/restore)
docker-compose.yml            Local Postgres 16
public/uploads/members/       Local photo storage (demo)
```

## Workstream boundaries

- **Platform / Auth** — bootstrap, RBAC, audit plumbing
- **Members / Biodata** — member CRUD, household, photos, duplicates, transfers, print, seed biodata
- **Finance** — obligations, payments, Saturday batch, arrears
- **Reporting** — Board rollups, schedules, template edit
- **Admin / Migration** — domains, user admin, export/backup narrative (import = Phase C)
- **QA / Demo** — Section 8 script and seeded demo DB
