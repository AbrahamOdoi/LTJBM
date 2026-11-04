# LTJBM CDMS — Project status

**Repo:** https://github.com/AbrahamOdoi/LTJBM  
**Updated:** 4 Nov 2026  
**Phase:** A complete on `main` · Phase B (demo harden) in progress  

Authoritative planning lives in the Project LT store (`docs/cdms-build-plan.md`, `docs/project-org.md`, `docs/phase-b-roadmap.md`). This file is the in-repo snapshot for contributors.

---

## Current status — Phase A

**Done.** Feature stack PRs #1–#6 merged to `main` (HEAD `5d06052`).

| Area | PR | On `main` |
| --- | --- | --- |
| Platform / Auth | [#1](https://github.com/AbrahamOdoi/LTJBM/pull/1) | Yes |
| Finance (HQ) | [#2](https://github.com/AbrahamOdoi/LTJBM/pull/2) | Yes |
| Members / Biodata | [#3](https://github.com/AbrahamOdoi/LTJBM/pull/3) | Yes |
| Admin / Migration | [#4](https://github.com/AbrahamOdoi/LTJBM/pull/4) | Yes |
| Reporting (Board) | [#5](https://github.com/AbrahamOdoi/LTJBM/pull/5) | Yes |
| QA / Demo script | [#6](https://github.com/AbrahamOdoi/LTJBM/pull/6) | Yes |

**Shipped vertical slice (summary):**

- Next.js + Postgres + Prisma + Auth.js roles; HQ-only finance gates; Admin gates  
- Members: register/update, household, groups, photo, duplicates, status/transfer, print; ≥100 seed members  
- Finance: pledges/instalments, special projects, tithe/dues/thanksgiving, Saturday batch + variance, arrears, balances API  
- Reporting: live Board/Council dashboards, monthly report job (file mode), live template edit  
- Admin: domains/subdomains, users/roles, member export, backup/restore narrative (`docs/backup-restore.md`)  
- Demo: ordered Section 8 script (`docs/demo-script.md`)

**Known follow-ups from Phase A QA:** Full §8 pass on **merged** `main` still required (pre-merge smoke had Finance/Reporting scenarios blocked until stack land). Staging URL and CI not yet the delivery-org baseline.

---

## Next milestones

| Milestone | Target | Owner track |
| --- | --- | --- |
| Full §8 regression on `main` + gap list | Week of 4 Nov | QA Lead |
| Staging URL + seed/reset runbook + CI smoke | Week of 4 Nov | DevOps |
| Security hardening review + compliance draft | Week of 4 Nov | Security |
| UX polish on demo paths only | Through 13 Nov | UX / Product |
| Operator quick guides / training outline | Through 14 Nov | Docs / Training |
| Demo dry-run + go/no-go | 14 Nov 2026 | QA Lead + PM |
| **Demo Day (brief)** | **15 Nov 2026** | PM facilitates |
| Phase C kick (migration / harden / train) | Post-15 Nov | Per Abraham priority |

**Demo Day posture (pending Abraham):** Treat 15 Nov as a **seeded vertical-slice demo** for the Data Centre Team, not church-wide go-live. Confirm hard external demo vs internal milestone.

---

## Delivery org (summary)

Cross-cutting: **PM**, **Tech Lead**, **Security**, **QA Lead**, **DevOps**, **UX**, **Docs/Training**.  
Feature squads: **Platform**, **Members**, **Finance**, **Reporting**, **Admin**, **QA/Demo**.

RACI and roadmap: Project store `docs/project-org.md`, `docs/phase-b-roadmap.md`.

---

## Open decisions (Abraham)

1. 15 Nov = hard external demo or internal target?  
2. Hosting / data residency preference for staging and production  
3. HQ-only finance absolute?  
4. Member portal deferred?  
5. Compliance baseline (e.g. Ghana Data Protection Act)  
6. Board email: live test inbox vs file-mode narrative for demo  

---

*No application feature scope beyond the vendor brief / build plan.*
