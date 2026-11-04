# User guide — Finance

**Role:** `FinancialSecretary` (`finance@ltjbm.local` after seed)  
**Home surfaces:** `/finance`, `/finance/obligations`, `/finance/batches`, `/finance/arrears`  
**Also:** may view `/reports` aggregates

## You can

- Create and manage obligations: Pledge, Tithe, Dues, Special Project, Thanksgiving
- Post payments; read Expected / Paid / Balance (Outstanding)
- Create Saturday collection batches; enter counted total; see variance vs system total
- Filter dues arrears by member, group, period
- Confirm Board dashboards pick up payments live (no manual rebuild)

## You cannot

- Change domains/users (Admin / Data Centre)
- Expose individual giving to unauthorised roles — keep HQ discipline
- Expect branch Clerks to enter finance — **HQ-only**; Clerks are denied `/finance`

## Common tasks

### Pledge with instalments
1. `/finance/obligations` → create **Pledge** with expected total and instalment plan.
2. Open the obligation → add **payment 1**, then **payment 2**.
3. Confirm Expected, Paid, Balance after each post.

### Special Project
1. Create **Special Project** with overall target.
2. Post two payments; Outstanding should shrink; target remains.

### Saturday batch
1. `/finance/batches` → create batch (tithes / thanksgiving / dues lines as needed).
2. Enter a **counted total** different from the system sum to demo variance.
3. Save — variance should be flagged when counted ≠ system.

### Arrears
1. `/finance/arrears`.
2. Filter by member, then group (cell/fellowship), then period.
3. List should match unpaid dues for that scope.

### Live Board check
1. Post a payment.
2. Sign in as `board@ltjbm.local` → `/reports` (refresh if needed).
3. Kind rollups (Expected / Paid / Outstanding) should reflect the new payment.

## Quick checks

- `GET /api/finance/health` → `{ ok: true }` when signed in as finance
- Clerk → `/finance` → `/forbidden?reason=finance`
