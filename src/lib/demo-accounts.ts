import type { Role } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/role-labels";

/**
 * Seeded demo accounts (prisma/seed.ts). Password matches SEED_PASSWORD default.
 * Shown on the login screen only as a demo affordance — not for production.
 */
export const DEMO_PASSWORD_HINT = "ChangeMe123!";

export type DemoAccount = {
  email: string;
  role: Role;
  label: string;
  blurb: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "clerk@ltjbm.local",
    role: "RecordsClerk",
    label: ROLE_LABELS.RecordsClerk,
    blurb: "Register members · no finance",
  },
  {
    email: "branch@ltjbm.local",
    role: "BranchLeader",
    label: ROLE_LABELS.BranchLeader,
    blurb: "Own-branch members only",
  },
  {
    email: "finance@ltjbm.local",
    role: "FinancialSecretary",
    label: ROLE_LABELS.FinancialSecretary,
    blurb: "Pledges, batches, arrears",
  },
  {
    email: "board@ltjbm.local",
    role: "PastoralBoard",
    label: ROLE_LABELS.PastoralBoard,
    blurb: "Board rollups (aggregated)",
  },
  {
    email: "council@ltjbm.local",
    role: "LeadershipCouncil",
    label: ROLE_LABELS.LeadershipCouncil,
    blurb: "Branch & period trends",
  },
  {
    email: "admin@ltjbm.local",
    role: "Admin",
    label: ROLE_LABELS.Admin,
    blurb: "Domains, users, export",
  },
];
