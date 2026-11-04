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
  Admin: "Admin / Data Centre",
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
 */
export function roleNavItems(
  role: Role | string | undefined | null,
): RoleNavItem[] {
  const items: RoleNavItem[] = [
    {
      href: "/",
      label: "Home",
      surface: "home",
      description: "Your workspace and quick links",
    },
  ];

  if (canAccessMembers(role)) {
    items.push({
      href: "/members",
      label: "Members",
      surface: "members",
      description: canWriteMembers(role)
        ? "Register and update biodata"
        : "Browse member biodata",
    });
  }

  if (canAccessFinance(role)) {
    items.push({
      href: "/finance",
      label: "Finance",
      surface: "finance",
      description: canWriteFinance(role)
        ? "Post obligations, payments, and batches"
        : "View HQ financial totals (read-only)",
    });
  }

  if (canAccessReporting(role)) {
    items.push({
      href: "/reports",
      label: "Reports",
      surface: "reports",
      description: canEditReportTemplates(role)
        ? "Board dashboards, templates, and schedules"
        : "Expected / Paid / Outstanding dashboards",
    });
  }

  if (canAccessAdmin(role)) {
    items.push({
      href: "/admin",
      label: "Admin",
      surface: "admin",
      description: "Domains, users, export, and backup",
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
    return canWriteMembers(role) ? "Can edit biodata" : "Read-only biodata";
  }
  if (surface === "finance") {
    if (!canAccessFinance(role)) return "No finance access";
    return canWriteFinance(role) ? "Can post & reconcile" : "Aggregates read-only";
  }
  if (surface === "reports") {
    if (!canAccessReporting(role)) return "No reporting access";
    return canEditReportTemplates(role)
      ? "Can edit templates & schedules"
      : "Dashboards read-only";
  }
  return canAccessAdmin(role) ? "Full admin" : "No admin access";
}
