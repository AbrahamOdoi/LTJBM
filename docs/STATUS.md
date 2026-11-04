# LTJBM CDMS — Project status

**Repo:** https://github.com/AbrahamOdoi/LTJBM  
**Updated:** 4 Nov 2026  
**Phase:** A + demo-harden (B tracks) complete on `main` · Phase C (migration / train / production ops) next  

Authoritative planning lives in the Project LT store (`docs/cdms-build-plan.md`, `docs/project-org.md`, `docs/phase-b-roadmap.md`, `docs/project-finalisation.md`). This file is the in-repo snapshot for contributors.

---

## Current status — demo-ready vertical slice

**Done on `main`.** Feature stack PRs #1–#6, delivery-org Phase B PRs #7–#12, and smoke alignment [#13](https://github.com/AbrahamOdoi/LTJBM/pull/13) are merged.

| Area | PR | On `main` |
| --- | --- | --- |
| Platform / Auth | [#1](https://github.com/AbrahamOdoi/LTJBM/pull/1) | Yes |
| Finance (HQ) | [#2](https://github.com/AbrahamOdoi/LTJBM/pull/2) | Yes |
| Members / Biodata | [#3](https://github.com/AbrahamOdoi/LTJBM/pull/3) | Yes |
| Admin / Migration | [#4](https://github.com/AbrahamOdoi/LTJBM/pull/4) | Yes |
| Reporting (Board) | [#5](https://github.com/AbrahamOdoi/LTJBM/pull/5) | Yes |
| QA / Demo script | [#6](https://github.com/AbrahamOdoi/LTJBM/pull/6) | Yes |
| PM / status docs | [#7](https://github.com/AbrahamOdoi/LTJBM/pull/7) | Yes |
| Docs / training guides | [#8](https://github.com/AbrahamOdoi/LTJBM/pull/8) | Yes |
| DevOps / CI / Compose | [#9](https://github.com/AbrahamOdoi/LTJBM/pull/9) | Yes |
| UX demo polish | [#10](https://github.com/AbrahamOdoi/LTJBM/pull/10) | Yes |
| QA Section 8 HTTP smoke | [#11](https://github.com/AbrahamOdoi/LTJBM/pull/11) | Yes |
| Security hardening | [#12](https://github.com/AbrahamOdoi/LTJBM/pull/12) | Yes |
| S8-12 Board finance deny smoke | [#13](https://github.com/AbrahamOdoi/LTJBM/pull/13) | Yes |

**HEAD at finalisation verify:** `a39f096` (merge of #13; includes security #12 at `817f1c7`).

**Shipped vertical slice (summary):**

- Next.js + Postgres + Prisma + Auth.js roles; HQ finance = FinancialSecretary + Admin only; Board/Council aggregates via `/reports`
- Members: register/update, household, groups, photo, duplicates, status/transfer, print; ≥100 seed members (124 total after seed)
- Finance: pledges/instalments, special projects, tithe/dues/thanksgiving, Saturday batch + variance, arrears, balances API
- Reporting: live Board/Council dashboards, monthly report job (file mode), live template edit
- Admin: domains/subdomains, users/roles, member export, backup/restore narrative (`docs/backup-restore.md`) + dump scripts
- Demo: ordered Section 8 script (`docs/demo-script.md`) + `npm run test:smoke` (**16 PASS / 0 FAIL / 0 BLOCKED** on verify)
- Ops: GitHub Actions CI, Docker Compose staging profile, Project store deploy runbook
- Security: session timeout, photo auth, cron secret strength, same-origin mutation checks, production seed refusal

---

## Section 8 readiness

Automated HTTP smoke on seeded local `main` covers S8-01…S8-15 + S8-SEED. Manual UI steps (photo upload, spoken restore) remain for Demo Day facilitation per `docs/demo-script.md`.

---

## Next milestones (Phase C / ops)

| Milestone | Owner track |
| --- | --- |
| Staging VPS or managed host + seed/reset drill | DevOps (Project store `docs/deploy-runbook.md`) |
| Demo Day walkthrough (15 Nov target) | QA Lead + PM |
| Deferred security (photo ACL proxy, DB sessions, login rate limit, CSP tighten) | Security |
| Real data migration tooling + object storage for photos | Phase C / Admin |
| Training pack completion + monitoring | Docs / DevOps |

**Demo Day posture:** Seeded vertical-slice demo for the Data Centre Team — **not** church-wide go-live.

---

## Delivery org (summary)

Cross-cutting: **PM**, **Tech Lead**, **Security**, **QA Lead**, **DevOps**, **UX**, **Docs/Training**.  
Feature squads: **Platform**, **Members**, **Finance**, **Reporting**, **Admin**, **QA/Demo**.

RACI and roadmap: Project store `docs/project-org.md`, `docs/phase-b-roadmap.md`.

---

## Open decisions (Abraham — non-blocking for demo)

1. 15 Nov = hard external demo or internal target?  
2. Hosting / data residency preference for staging and production  
3. HQ-only finance absolute? (code currently enforces Finance + Admin only)  
4. Member portal deferred?  
5. Compliance baseline (e.g. Ghana Data Protection Act)  
6. Board email: live test inbox vs file-mode narrative for demo  

Project LT continues autonomously through finalisation; these affect Phase C / hosting choice, not local demo readiness.

---

*No application feature scope beyond the vendor brief / build plan.*
