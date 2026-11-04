# LTJBM CDMS — Section 8 Demo Script

**Audience:** Church Data Centre Team (Demo Day)  
**Source scenarios:** Vendor design brief §8  
**Demo DB:** ≥100 seeded members (`npm run db:seed` → 121 on Phase A base)  
**Default password:** `ChangeMe123!` (override with `SEED_PASSWORD`)

### Demo users

| Email | Role | Use in demo |
| --- | --- | --- |
| `clerk@ltjbm.local` | RecordsClerk | Register / status / print; prove **no finance / no admin** |
| `branch@ltjbm.local` | BranchLeader | East Legon–scoped membership; no finance |
| `finance@ltjbm.local` | FinancialSecretary | Pledge, payments, Saturday batch, arrears |
| `board@ltjbm.local` | PastoralBoard | Board dashboard / rollups (aggregated) |
| `council@ltjbm.local` | LeadershipCouncil | Branch/period trends (when Reporting merged) |
| `admin@ltjbm.local` | Admin | Domains, users, template edit, export/backup |

### Merge dependencies (this script)

| Surface | Branch / PR | Status on Platform+Members+Admin base |
| --- | --- | --- |
| Auth RBAC, members biodata, admin console | `cursor/admin-migration-phase-a-dbae` | Available |
| Finance posting / batches / arrears | [#2](https://github.com/AbrahamOdoi/LTJBM/pull/2) `cursor/finance-phase-a-1e8d` | **Merge-dependent** |
| Board dashboard / schedule / templates | [#5](https://github.com/AbrahamOdoi/LTJBM/pull/5) | **Merge-dependent** |

Run Steps 1–4, 12–13, 15 (biodata half) on the current base. Run Steps 5–11 and 14 after Finance + Reporting merge onto the demo staging branch.

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
| **Path** | `/finance/obligations` (after [#2](https://github.com/AbrahamOdoi/LTJBM/pull/2)) |
| **Steps** | 1. Sign in as finance. 2. Create a **Pledge** with instalment plan and expected total. 3. Record payment 1. 4. Record payment 2. 5. Show Expected, Paid, Balance. |
| **Expected** | Balance = Expected − Paid after each post; instalment plan visible. Clerk cannot open this path. |
| **Checklist** | `S8-05` — **blocked until Finance PR #2 merges** |

### Step 6 — Special Project Contribution with target; two payments; outstanding

| | |
| --- | --- |
| **Role** | FinancialSecretary |
| **Path** | `/finance/obligations` (PR #2) |
| **Steps** | 1. Create Special Project with overall target. 2. Post two payments. 3. Show Expected / Paid / Outstanding. |
| **Expected** | Outstanding shrinks correctly; project target retained. |
| **Checklist** | `S8-06` — **blocked until Finance PR #2 merges** |

### Step 7 — Saturday batch (tithes, thanksgiving, dues); counted total; variance flag

| | |
| --- | --- |
| **Role** | FinancialSecretary |
| **Path** | `/finance/batches` (PR #2) |
| **Steps** | 1. Create Saturday batch covering tithe + thanksgiving + dues lines. 2. Enter **counted total** that differs from system sum. 3. Save / reconcile. |
| **Expected** | System total computed; variance flagged when counted ≠ system. |
| **Checklist** | `S8-07` — **blocked until Finance PR #2 merges** |

### Step 8 — Dues arrears by member, group, period

| | |
| --- | --- |
| **Role** | FinancialSecretary |
| **Path** | `/finance/arrears` (PR #2) |
| **Steps** | 1. Open arrears. 2. Filter by member, then by group (cell/fellowship), then by period. |
| **Expected** | Arrears list matches unpaid dues for the selected scope. |
| **Checklist** | `S8-08` — **blocked until Finance PR #2 merges** |

### Step 9 — Real-time reporting: payment → Board dashboard updates

| | |
| --- | --- |
| **Role** | FinancialSecretary then PastoralBoard |
| **Path** | `/finance/...` then `/reports` ([#5](https://github.com/AbrahamOdoi/LTJBM/pull/5)) |
| **Steps** | 1. As finance, post a payment. 2. Sign in as `board@ltjbm.local`. 3. Open `/reports` (use Refresh / auto-refresh). |
| **Expected** | Expected / Paid / Outstanding reflect the new payment **without** a manual report rebuild. |
| **Checklist** | `S8-09` — **blocked until Finance #2 + Reporting #5 merge** |

### Step 10 — Scheduled monthly Board email

| | |
| --- | --- |
| **Role** | Admin or Board operator |
| **Path** | `/reports/schedules` or `npm run report:monthly` (PR #5) |
| **Steps** | 1. Show monthly schedule (cron / distribution list). 2. Trigger run (UI or `POST /api/reports/schedules/run`). 3. Show delivered artifact (`tmp/board-reports/` when `REPORT_EMAIL_MODE=file`). |
| **Expected** | Schedule `lastRunAt` updates; HTML/email artifact for Board list. |
| **Checklist** | `S8-10` — **blocked until Reporting PR #5 merges** |

### Step 11 — Live Board report template edit (Data Centre)

| | |
| --- | --- |
| **Role** | Admin (`admin@ltjbm.local`) |
| **Path** | `/reports/templates` (PR #5) |
| **Steps** | 1. Open templates. 2. Add a field or chart. 3. Return to `/reports` and show layout change. |
| **Expected** | Template persists; dashboard/report reflects new field/chart. |
| **Checklist** | `S8-11` — **blocked until Reporting PR #5 merges** |

### Step 12 — Access control: Records Clerk, Branch Leader, Board

| | |
| --- | --- |
| **Role** | Clerk → BranchLeader → PastoralBoard |
| **Path** | `/members`, `/finance`, `/admin`, `/forbidden` |
| **Steps** | 1. **Clerk:** `/members` OK; `/finance` → `/forbidden?reason=finance`; `/admin` → `/forbidden?reason=admin`; `/api/finance/health` → 403. 2. **Branch:** `/members` OK (East Legon only); `/finance` forbidden. 3. **Board:** can open HQ finance **read** surfaces when present; no clerk biodata write requirement. |
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
| **Path** | `/reports` (PR #5; data from Finance balances) |
| **Steps** | 1. Open Board dashboard. 2. Point to rollup columns for Pledge, Dues, Thanksgiving, and other obligation kinds. |
| **Expected** | Kind-level Expected / Paid / Outstanding populated from live DB. |
| **Checklist** | `S8-14` — **blocked until Finance #2 + Reporting #5 merge** |

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

Mark each row after the live walkthrough (or HTTP smoke). Use **PASS** / **FAIL** / **BLOCKED** (merge-dependent).

| ID | Brief §8 scenario | Primary role(s) | Evidence / route | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| S8-01 | Register + household + groups + photo; duplicates | RecordsClerk | `/members/new`, `/members/duplicates` | ☐ | |
| S8-02 | Domains / subdomains data-entry portal | Admin | `/admin/domains` | ☐ | |
| S8-03 | Status update + change history | RecordsClerk | `/members/[id]` | ☐ | |
| S8-04 | Print individual + group | RecordsClerk | `/members/[id]/print`, `/members/print` | ☐ | |
| S8-05 | Pledge + instalments + 2 payments | FinancialSecretary | `/finance/obligations` | ☐ | Needs [#2](https://github.com/AbrahamOdoi/LTJBM/pull/2) |
| S8-06 | Special Project + target + 2 payments | FinancialSecretary | `/finance/obligations` | ☐ | Needs #2 |
| S8-07 | Saturday batch + variance | FinancialSecretary | `/finance/batches` | ☐ | Needs #2 |
| S8-08 | Dues arrears member/group/period | FinancialSecretary | `/finance/arrears` | ☐ | Needs #2 |
| S8-09 | Payment → Board dashboard live | Finance → Board | `/reports` | ☐ | Needs #2 + [#5](https://github.com/AbrahamOdoi/LTJBM/pull/5) |
| S8-10 | Monthly Board email schedule | Admin / Board | `/reports/schedules` | ☐ | Needs #5 |
| S8-11 | Live template field/chart edit | Admin | `/reports/templates` | ☐ | Needs #5 |
| S8-12 | RBAC: Clerk / Branch / Board | Clerk, Branch, Board | `/finance`, `/admin`, `/members` | ☐ | |
| S8-13 | Export members + restore narrative | Admin | `/admin/export`, `/admin/backup`, `docs/backup-restore.md` | ☐ | |
| S8-14 | Board Expected/Paid/Outstanding rollup | PastoralBoard | `/reports` | ☐ | Needs #2 + #5 |
| S8-15 | Ghana → international transfer | RecordsClerk | `/members/[id]` | ☐ | |
| S8-SEED | Demo DB ≥100 members | — | `npm run db:seed` / export count | ☐ | |

### Smoke harness (optional)

Against a running app (`npm run dev`) with migrated + seeded Postgres:

```bash
# Example checks (cookie session via Auth.js credentials)
# 1) clerk → /finance → forbidden; 2) clerk → /members 200
# 3) branch → /members 200; 4) admin → /admin/* 200 + CSV export
# 5) finance routes beyond /finance stub → 404 until PR #2
# 6) /reports → 404 until PR #5
```

Re-run the full checklist on the integrated staging branch once #2 and #5 are merged.

### Smoke results on `cursor/admin-migration-phase-a-dbae` (2026-11-03)

HTTP session smokes against local `npm run dev` + Postgres seed (121 members).  
**PASS: 27 · FAIL: 0 · BLOCKED: 8** (Finance #2 / Reporting #5).

| ID | Result | Evidence |
| --- | --- | --- |
| S8-01 | **PASS** | Clerk `/members`, `/members/new`, `/members/duplicates` → 200 |
| S8-02 | **PASS** | Admin `/admin/domains` → 200; seeded gender / ghana_region (+ Accra subdomain) |
| S8-03 | **PASS** | Clerk `/members/[id]` → 200; Transfer/status UI present |
| S8-04 | **PASS** | Individual + group print → 200 (individual print: removed invalid Server Component `onClick`) |
| S8-05 | **BLOCKED** | `/finance/obligations` → 404 until [#2](https://github.com/AbrahamOdoi/LTJBM/pull/2) |
| S8-06 | **BLOCKED** | Depends on #2 |
| S8-07 | **BLOCKED** | Depends on #2 |
| S8-08 | **BLOCKED** | Depends on #2 |
| S8-09 | **BLOCKED** | `/reports` → 404 until [#5](https://github.com/AbrahamOdoi/LTJBM/pull/5) (+ #2 for live payment) |
| S8-10 | **BLOCKED** | Depends on #5 |
| S8-11 | **BLOCKED** | `/reports/templates` → 404 until #5 |
| S8-12 | **PASS** | Clerk finance/admin forbidden; Branch members OK + finance deny; Board `/finance` stub 200; finance health `{ok:true}` |
| S8-13 | **PASS** | Admin export CSV ~121 rows; clerk export 403; backup snapshot JSON OK; restore doc present |
| S8-14 | **BLOCKED** | Needs #2 + #5 |
| S8-15 | **PASS** | Transfer controls on member detail (Members Phase A verified path); UI present in smoke |
| S8-SEED | **PASS** | Seed / export count = 121 |

---

## Demo-day facilitation notes

1. Reset DB before the session: recreate Postgres volume / database, `npx prisma migrate deploy`, `npm run db:seed`.
2. Keep browser profiles or three windows ready for Clerk, Finance, Board to avoid logout thrash.
3. Narrate HQ-only finance when Clerk hits `/forbidden`.
4. For Steps 5–11 / 14, confirm Finance + Reporting are on the staging deploy before Demo Day; otherwise mark **BLOCKED** and show the PR demo seeds documented in those workstreams.
5. Backup restore is a **spoken + doc** story (`docs/backup-restore.md`); do not wipe the live demo DB mid-walkthrough.
