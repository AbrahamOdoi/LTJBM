import {
  Role,
  canAccessAdmin,
  canAccessAttendance,
  canAccessEvents,
  canAccessFinance,
  canAccessFinanceAggregateReports,
  canAccessGroups,
  canAccessMedia,
  canAccessMembers,
  canAccessPastoral,
  canAccessReporting,
  canWriteFinance,
  canWriteGroups,
  canWriteMedia,
  canWriteMembers,
  canEditReportTemplates,
  dashboardProfileForRole,
  isMemberPortalRole,
} from "@/lib/roles";

/** Human-facing role names for demo and day-to-day UI (not Prisma enum strings). */
export const ROLE_LABELS: Record<Role, string> = {
  RecordsClerk: "Records Clerk",
  BranchLeader: "Branch Leader",
  FinancialSecretary: "Financial Secretary",
  PastoralBoard: "Pastoral Board",
  LeadershipCouncil: "Leadership Council",
  Admin: "Data Centre Admin",
  Member: "Member (portal)",
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
  | "admin"
  | "attendance"
  | "pastoral"
  | "events"
  | "groups"
  | "media"
  | "portal";

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

  if (isMemberPortalRole(role)) {
    items.push({
      href: "/portal",
      label: "My portal",
      surface: "portal",
      description: "Your profile, statement, and sermon library",
    });
    return items;
  }

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

  if (canAccessAttendance(role)) {
    items.push({
      href: "/attendance",
      label: "Attendance",
      surface: "attendance",
      description: "Service and cell check-in (manual, kiosk, QR)",
    });
  }

  if (canAccessGroups(role)) {
    items.push({
      href: "/groups",
      label: "Groups",
      surface: "groups",
      description: canWriteGroups(role)
        ? "Departments, cells, choirs, rosters, and meeting logs"
        : "Browse groups, rosters, and meeting logs",
    });
  }

  if (canAccessEvents(role)) {
    items.push({
      href: "/events",
      label: "Events",
      surface: "events",
      description: "Church calendar and light registration",
    });
  }

  if (canAccessMedia(role)) {
    items.push({
      href: "/media",
      label: "Sermons",
      surface: "media",
      description: canWriteMedia(role)
        ? "Sermon library — catalogue messages and series"
        : "Browse the sermon and media library",
    });
  }

  if (canAccessPastoral(role)) {
    items.push({
      href: "/pastoral",
      label: "Pastoral care",
      surface: "pastoral",
      description: "Prayer and visitation notes (restricted)",
    });
  }

  if (canAccessFinance(role)) {
    items.push({
      href: "/finance",
      label: "Contributions",
      surface: "finance",
      description: canWriteFinance(role)
        ? "Record pledges, tithes, dues, ledger, budgets, and Saturday batches"
        : "View Head Office contribution totals (read-only)",
    });
  }

  if (canAccessReporting(role)) {
    const profile = dashboardProfileForRole(role);
    items.push({
      href: "/reports",
      label: "Reports",
      surface: "reports",
      description: canEditReportTemplates(role)
        ? "Dashboards, standard reports, templates, and schedules"
        : profile === "membership"
          ? "Membership dashboard and printable reports"
          : canAccessFinanceAggregateReports(role)
            ? "Dashboards, Expected / Paid / Outstanding, and reports"
            : "Reports for your ministry role",
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
    case Role.Member:
      return "/portal";
    case Role.RecordsClerk:
    case Role.BranchLeader:
    case Role.FinancialSecretary:
    case Role.PastoralBoard:
    case Role.LeadershipCouncil:
    case Role.Admin:
      return "/reports";
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
    if (!canAccessReporting(role)) return "No Reports access";
    const profile = dashboardProfileForRole(role);
    if (canEditReportTemplates(role)) return "May edit templates & schedules";
    if (profile === "membership") return "Membership reports — your branch scope";
    if (profile === "board" || profile === "council") {
      return "Board dashboards — aggregates only";
    }
    return "Reports — read only";
  }
  return canAccessAdmin(role) ? "Full Data Centre access" : "No Data Centre access";
}
