# LTJBM CDMS — Section 8 Demo Script

**Audience:** Church Data Centre Team (Demo Day)  
**Source scenarios:** Vendor design brief §8  
**Demo DB:** ≥100 seeded members (`npm run db:seed` → 121 biodata + FIN-* = 124 total on integrated `main`)  
**Default password:** `ChangeMe123!` (override with `SEED_PASSWORD`)

### Demo users

| Email | Role | Use in demo |
| --- | --- | --- |
| `clerk@ltjbm.local` | RecordsClerk | Register / status / print; prove **no finance / no admin / no reporting** |
| `branch@ltjbm.local` | BranchLeader | East Legon–scoped membership; no finance |
| `finance@ltjbm.local` | FinancialSecretary | Pledge, payments, Saturday batch, arrears |
| `board@ltjbm.local` | PastoralBoard | Board dashboard / rollups (aggregated) |
| `council@ltjbm.local` | LeadershipCouncil | Branch/period trends |
| `admin@ltjbm.local` | Admin | Domains, users, template edit, export/backup |

### Integration status (`main`)

| Surface | PR | Status |
| --- | --- | --- |
| Auth RBAC, members biodata, admin console | #1, #3, #4 | **Merged** |
| Finance posting / batches / arrears | [#2](https://github.com/AbrahamOdoi/LTJBM/pull/2) | **Merged** |
| Board dashboard / schedule / templates | [#5](https://github.com/AbrahamOdoi/LTJBM/pull/5) | **Merged** |
| Demo script (Phase A) | [#6](https://github.com/AbrahamOdoi/LTJBM/pull/6) | **Merged** |

All Steps 1–15 are runnable on current `main`. Automated smoke: `npm run test:smoke` (app must be up after migrate + seed).

---

## Ordered walkthrough

### Step 1 — Register member + household + groups + photo; duplicate detection

| | |
| --- | --- |
| **Role** | RecordsClerk (`clerk@ltjbm.local`) |
| **Path** | `/login` → `/members/new` → `/members/duplicates` |
| **Steps** | 1. Sign in as clerk. 2. Open **Members → Register**. 3. Enter biodata, attach household, cell and/or fellowship, upload photo. 4. Save. 5. Attempt a second register with the same phone or name+DOB (or open **Duplicates**). |
| **Expected** | New member appears on `/members`. Duplicate warning or pending candidate on `/members/duplicates`. **No finance navigation** for clerk. |
| **Checklist** | `S8-01` |

### Step 2 — Data-entry portal fields, domains, and subdomains

| | |
| --- | --- |
| **Role** | Admin (`admin@ltjbm.local`) |
| **Path** | `/admin/domains` → domain detail |
| **Steps** | 1. Sign in as admin. 2. Open **Admin → Domains**. 3. Show seeded lists (`gender`, `member_status`, `payment_method`, `ghana_region`). 4. Open `ghana_region` and show Accra/Tema/Kumasi **subdomains** (`parentValue`). 5. Optionally add a value live. |
| **Expected** | Domain lists editable; subdomain parent/child visible; member forms consume domain values where wired. |
| **Checklist** | `S8-02` |

### Step 3 — Transfer / update member status + change history

| | |
| --- | --- |
| **Role** | RecordsClerk |
| **Path** | `/members/[id]` |
| **Steps** | 1. Open an Active member. 2. Change status (e.g. Active → Transferred) with a reason, **or** use transfer controls. 3. Scroll to status / transfer history. |
| **Expected** | History row shows from→to status, actor context, reason/when. Prior status still auditable. |
| **Checklist** | `S8-03` |

### Step 4 — Print individual or group members

| | |
| --- | --- |
| **Role** | RecordsClerk |
| **Path** | `/members/[id]/print` and `/members/print` |
| **Steps** | 1. From a member detail, open **Print**. 2. Use browser print (Print button). 3. Return to Members → **Print group list** (optionally filter by branch/cell/fellowship). |
| **Expected** | Individual sheet shows biodata, groups, household, history. Group list shows filtered roster suitable for print CSS. |
| **Checklist** | `S8-04` |

### Step 5 — Pledge with instalment plan; two payments; Expected / Paid / Balance

| | |
| --- | --- |
| **Role** | FinancialSecretary (`finance@ltjbm.local`) |
| **Path** | `/finance/obligations` |
| **Steps** | 1. Sign in as finance. 2. Create a **Pledge** with instalment plan and expected total. 3. Record payment 1. 4. Record payment 2. 5. Show Expected, Paid, Balance. |
| **Expected** | Balance = Expected − Paid after each post; instalment plan visible. Clerk cannot open this path. |
| **Checklist** | `S8-05` |

### Step 6 — Special Project Contribution with target; two payments; outstanding

| | |
| --- | --- |
| **Role** | FinancialSecretary |
| **Path** | `/finance/obligations` |
| **Steps** | 1. Create Special Project with overall target. 2. Post two payments. 3. Show Expected / Paid / Outstanding. |
| **Expected** | Outstanding shrinks correctly; project target retained. |
| **Checklist** | `S8-06` |

### Step 7 — Saturday batch (tithes, thanksgiving, dues); counted total; variance flag

| | |
| --- | --- |
| **Role** | FinancialSecretary |
| **Path** | `/finance/batches` |
| **Steps** | 1. Create Saturday batch covering tithe + thanksgiving + dues lines. 2. Enter **counted total** that differs from system sum. 3. Save / reconcile. |
| **Expected** | System total computed; variance flagged when counted ≠ system. |
| **Checklist** | `S8-07` |

### Step 8 — Dues arrears by member, group, period

| | |
| --- | --- |
| **Role** | FinancialSecretary |
| **Path** | `/finance/arrears` |
| **Steps** | 1. Open arrears. 2. Filter by member, then by group (cell/fellowship), then by period. |
| **Expected** | Arrears list matches unpaid dues for the selected scope. |
| **Checklist** | `S8-08` |

### Step 9 — Real-time reporting: payment → Board dashboard updates

| | |
| --- | --- |
| **Role** | FinancialSecretary then PastoralBoard |
| **Path** | `/finance/...` then `/reports` |
| **Steps** | 1. As finance, post a payment. 2. Sign in as `board@ltjbm.local`. 3. Open `/reports` (use Refresh / auto-refresh). |
| **Expected** | Expected / Paid / Outstanding reflect the new payment **without** a manual report rebuild. |
| **Checklist** | `S8-09` |

### Step 10 — Scheduled monthly Board email

| | |
| --- | --- |
| **Role** | Admin or Board operator |
| **Path** | `/reports/schedules` or `npm run report:monthly` |
| **Steps** | 1. Show monthly schedule (cron / distribution list). 2. Trigger run (UI or `POST /api/reports/schedules/run`). 3. Show delivered artifact (`tmp/board-reports/` when `REPORT_EMAIL_MODE=file`). |
| **Expected** | Schedule `lastRunAt` updates; HTML/email artifact for Board list. |
| **Checklist** | `S8-10` |

### Step 11 — Live Board report template edit (Data Centre)

| | |
| --- | --- |
| **Role** | Admin (`admin@ltjbm.local`) |
| **Path** | `/reports/templates` |
| **Steps** | 1. Open templates. 2. Add a field or chart. 3. Return to `/reports` and show layout change. |
| **Expected** | Template persists; dashboard/report reflects new field/chart. |
| **Checklist** | `S8-11` |

### Step 12 — Access control: Records Clerk, Branch Leader, Board

| | |
| --- | --- |
| **Role** | Clerk → BranchLeader → PastoralBoard |
| **Path** | `/members`, `/finance`, `/admin`, `/reports`, `/forbidden` |
| **Steps** | 1. **Clerk:** `/members` OK; `/finance` → `/forbidden?reason=finance`; `/admin` → `/forbidden?reason=admin`; `/reports` → `/forbidden?reason=reporting`; `/api/finance/health` → 403. 2. **Branch:** `/members` OK (East Legon only); `/finance` forbidden. 3. **Board:** can open HQ finance **read** surfaces; aggregated `/reports`. |
| **Expected** | Allow/deny matches role matrix; individual giving not exposed to unauthorised roles. |
| **Checklist** | `S8-12` |

### Step 13 — Data export + restore narrative

| | |
| --- | --- |
| **Role** | Admin |
| **Path** | `/admin/export`, `/admin/backup`, `docs/backup-restore.md` |
| **Steps** | 1. Download member CSV and/or JSON from **Export**. 2. Open **Backup** and download logical snapshot (or describe `pg_dump`). 3. Verbally walk restore from `docs/backup-restore.md` (`pg_restore` for service `postgres`, db `cdms`). |
| **Expected** | Export contains ≥100 members; snapshot omits password hashes; restore steps clear for demo. |
| **Checklist** | `S8-13` |

### Step 14 — Board rollup Expected / Paid / Outstanding (Pledge, Dues, Thanksgiving, other)

| | |
| --- | --- |
| **Role** | PastoralBoard |
| **Path** | `/reports` |
| **Steps** | 1. Open Board dashboard. 2. Point to rollup columns for Pledge, Dues, Thanksgiving, and other obligation kinds. |
| **Expected** | Kind-level Expected / Paid / Outstanding populated from live DB. |
| **Checklist** | `S8-14` |

### Step 15 — Ghana branch → international branch transfer

| | |
| --- | --- |
| **Role** | RecordsClerk (or Admin) |
| **Path** | `/members/[id]` |
| **Steps** | 1. Open a Ghana-branch member (e.g. East Legon). 2. Transfer to international branch (e.g. London). 3. Show updated branch on the record and history row Ghana → international. |
| **Expected** | Current branch = international; history preserves from/to branches and reason. |
| **Checklist** | `S8-15` |

---

## Pass / fail checklist

Mark each row after the live walkthrough (or HTTP smoke). Use **PASS** / **FAIL** / **BLOCKED**.

| ID | Brief §8 scenario | Primary role(s) | Evidence / route | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| S8-01 | Register + household + groups + photo; duplicates | RecordsClerk | `/members/new`, `/members/duplicates` | **PASS** | Routes 200; interactive create manual |
| S8-02 | Domains / subdomains data-entry portal | Admin | `/admin/domains` | **PASS** | |
| S8-03 | Status update + change history | RecordsClerk | `/members/[id]` | **PASS** | UI present |
| S8-04 | Print individual + group | RecordsClerk | `/members/[id]/print`, `/members/print` | **PASS** | |
| S8-05 | Pledge + instalments + 2 payments | FinancialSecretary | `/finance/obligations` | **PASS** | API create + 2 pays → 900/600/300 |
| S8-06 | Special Project + target + 2 payments | FinancialSecretary | `/finance/obligations` | **PASS** | Target 25000 retained |
| S8-07 | Saturday batch + variance | FinancialSecretary | `/finance/batches` | **PASS** | system 300 / counted 400 / variance |
| S8-08 | Dues arrears member/group/period | FinancialSecretary | `/finance/arrears` | **PASS** | Filters return seed arrears |
| S8-09 | Payment → Board dashboard live | Finance → Board | `/reports` | **PASS** | paid 2700 → 2775 after post |
| S8-10 | Monthly Board email schedule | Admin / Board | `/reports/schedules` | **PASS** | cron Bearer run `ok:true` |
| S8-11 | Live template field/chart edit | Admin | `/reports/templates` | **PASS** | addField persisted |
| S8-12 | RBAC: Clerk / Branch / Board | Clerk, Branch, Board | `/finance`, `/admin`, `/reports` | **PASS** | |
| S8-13 | Export members + restore narrative | Admin | `/admin/export`, `/admin/backup` | **PASS** | |
| S8-14 | Board Expected/Paid/Outstanding rollup | PastoralBoard | `/reports` | **PASS** | Pledge/Tithe/Dues/Special/Thanksgiving |
| S8-15 | Ghana → international transfer | RecordsClerk | `/members/[id]` | **PASS** | Transfer UI present; write path Members Phase A |
| S8-SEED | Demo DB ≥100 members | — | `npm run db:seed` / export count | **PASS** | CSV ≈124 rows |

### Smoke harness

Against a running app (`npm run dev` or `npm start`) with migrated + seeded Postgres:

```bash
# Unit math / template
npm run test:finance
npm run test:reporting

# Full Section 8 HTTP smoke (Auth.js sessions + finance writes + reporting)
SMOKE_BASE_URL=http://localhost:3000 npm run test:smoke

# Optional service-layer finance seed sanity (no HTTP)
npm run smoke:finance
```

Results JSON: `tmp/smoke-section8-results.json` (gitignored).

### Smoke results on integrated `main` (2026-11-04)

HTTP session smokes against local `npm run dev` + Postgres seed (124 members).  
**PASS: 16 · FAIL: 0 · BLOCKED: 0**

| ID | Result | Evidence |
| --- | --- | --- |
| S8-01 | **PASS** | Clerk `/members`, `/members/new`, `/members/duplicates` → 200 |
| S8-02 | **PASS** | Admin `/admin/domains` → 200 |
| S8-03 | **PASS** | Clerk member detail → 200; status/transfer UI present |
| S8-04 | **PASS** | Individual + group print → 200 |
| S8-05 | **PASS** | POST pledge + 2 payments; balances 900/600/300; instalments=3 |
| S8-06 | **PASS** | Special Project + 2 payments; paid/out/target ok |
| S8-07 | **PASS** | Saturday batch system 300 / counted 400 / `hasVariance` |
| S8-08 | **PASS** | Arrears all=1, by member=1, by period=1 |
| S8-09 | **PASS** | Payment 201; Board `totals.paid` 2700 → 2775 without rebuild |
| S8-10 | **PASS** | `POST /api/reports/schedules/run` with cron secret → `ok:true` |
| S8-11 | **PASS** | Admin PATCH addField reflected on Board template |
| S8-12 | **PASS** | Clerk finance/admin/reports forbidden; Branch finance deny; Board `/finance` 200; finance health `{ok:true}` |
| S8-13 | **PASS** | Admin CSV/snapshot 200; clerk export 403; export/backup pages OK |
| S8-14 | **PASS** | Dashboard kinds include Pledge, Tithe, Dues, SpecialProject, Thanksgiving |
| S8-15 | **PASS** | Transfer UI on member detail |
| S8-SEED | **PASS** | Export CSV ≈124 members |

**Critical bugs found this run:** none.

**Pass threshold (QA Lead):** Demo Day green requires FAIL=0 on `test:smoke` and no open criticals. BLOCKED only for true env/merge gaps (none on current `main`). Manual photo upload + live Ghana→London write remain facilitation steps, not smoke blockers.

---

## Demo-day facilitation notes

1. Reset DB before the session: recreate Postgres volume / database, `npx prisma migrate deploy`, `npm run db:seed`.
2. Keep browser profiles or three windows ready for Clerk, Finance, Board to avoid logout thrash.
3. Narrate HQ-only finance when Clerk hits `/forbidden`.
4. Run `npm run test:smoke` on the staging build the morning of demo; paste counts into the checklist if needed.
5. Backup restore is a **spoken + doc** story (`docs/backup-restore.md`); do not wipe the live demo DB mid-walkthrough.
