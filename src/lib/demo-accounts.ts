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
    blurb: "Member register · no contributions",
  },
  {
    email: "branch@ltjbm.local",
    role: "BranchLeader",
    label: ROLE_LABELS.BranchLeader,
    blurb: "Your branch members only",
  },
  {
    email: "finance@ltjbm.local",
    role: "FinancialSecretary",
    label: ROLE_LABELS.FinancialSecretary,
    blurb: "Pledges, tithes, collection batches",
  },
  {
    email: "board@ltjbm.local",
    role: "PastoralBoard",
    label: ROLE_LABELS.PastoralBoard,
    blurb: "Expected / Paid / Outstanding",
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
    blurb: "Dropdown lists, users, export",
  },
  {
    email: "member@ltjbm.local",
    role: "Member",
    label: ROLE_LABELS.Member,
    blurb: "Own profile + own statement only",
  },
];
