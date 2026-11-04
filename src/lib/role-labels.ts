import {
  Role,
  canAccessAdmin,
  canAccessFinance,
  canAccessMembers,
  canAccessReporting,
  canWriteFinance,
  canWriteMembers,
  canEditReportTemplates,
} from "@/lib/roles";

/** Human-facing role names for demo and day-to-day UI (not Prisma enum strings). */
export const ROLE_LABELS: Record<Role, string> = {
  RecordsClerk: "Records Clerk",
  BranchLeader: "Branch Leader",
  FinancialSecretary: "Financial Secretary",
  PastoralBoard: "Pastoral Board",
  LeadershipCouncil: "Leadership Council",
  Admin: "Data Centre Admin",
};

export function roleLabel(role: Role | string | undefined | null): string {
  if (!role) return "Unknown role";
  if (role in ROLE_LABELS) return ROLE_LABELS[role as Role];
  return role;
}

export type NavSurface =
  | "home"
  | "members"
  | "finance"
  | "reports"
  | "admin";

export type RoleNavItem = {
  href: string;
  label: string;
  surface: NavSurface;
  description: string;
};

/**
 * Primary surfaces a signed-in role may open.
 * Home is always available; other links respect RBAC helpers.
 * Labels use church-native language (Congregation, Tithes & Offerings, …).
 */
export function roleNavItems(
  role: Role | string | undefined | null,
): RoleNavItem[] {
  const items: RoleNavItem[] = [
    {
      href: "/",
      label: "Home",
      surface: "home",
      description: "Your ministry workspace",
    },
  ];

  if (canAccessMembers(role)) {
    items.push({
      href: "/members",
      label: "Members",
      surface: "members",
      description: canWriteMembers(role)
        ? "Register and update member records"
        : "Browse the member register",
    });
  }

  if (canAccessFinance(role)) {
    items.push({
      href: "/finance",
      label: "Contributions",
      surface: "finance",
      description: canWriteFinance(role)
        ? "Record pledges, tithes, dues, and Saturday collection batches"
        : "View Head Office contribution totals (read-only)",
    });
  }

  if (canAccessReporting(role)) {
    items.push({
      href: "/reports",
      label: "Board reports",
      surface: "reports",
      description: canEditReportTemplates(role)
        ? "Board dashboards, templates, and schedules"
        : "Expected / Paid / Outstanding",
    });
  }

  if (canAccessAdmin(role)) {
    items.push({
      href: "/admin",
      label: "Data Centre",
      surface: "admin",
      description: "Dropdown lists, users, export, and backup",
    });
  }

  return items;
}

/** Post-login landing path for each role (speeds demo role switches). */
export function defaultPathForRole(
  role: Role | string | undefined | null,
): string {
  switch (role) {
    case Role.RecordsClerk:
    case Role.BranchLeader:
      return "/members";
    case Role.FinancialSecretary:
      return "/finance";
    case Role.PastoralBoard:
    case Role.LeadershipCouncil:
      return "/reports";
    case Role.Admin:
      return "/admin";
    default:
      return "/";
  }
}

export function accessModeLabel(
  role: Role | string | undefined | null,
  surface: "members" | "finance" | "reports" | "admin",
): string {
  if (surface === "members") {
    return canWriteMembers(role)
      ? "May update member records"
      : "Member register — read only";
  }
  if (surface === "finance") {
    if (!canAccessFinance(role)) return "No Contributions access";
    return canWriteFinance(role)
      ? "May post & reconcile contributions"
      : "Contribution totals — read only";
  }
  if (surface === "reports") {
    if (!canAccessReporting(role)) return "No Board reports access";
    return canEditReportTemplates(role)
      ? "May edit templates & schedules"
      : "Board dashboards — read only";
  }
  return canAccessAdmin(role) ? "Full Data Centre access" : "No Data Centre access";
}
