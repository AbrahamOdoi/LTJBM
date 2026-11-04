/**
 * App roles — keep as string constants so Edge middleware does not import Prisma.
 * Values must match the Prisma `Role` enum in prisma/schema.prisma.
 */
export const Role = {
  RecordsClerk: "RecordsClerk",
  BranchLeader: "BranchLeader",
  FinancialSecretary: "FinancialSecretary",
  PastoralBoard: "PastoralBoard",
  LeadershipCouncil: "LeadershipCouncil",
  Admin: "Admin",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ALL_ROLES: Role[] = Object.values(Role);

/** Roles that may open HQ finance routes and finance APIs. */
export const FINANCE_ACCESS_ROLES: readonly Role[] = [
  Role.FinancialSecretary,
  Role.PastoralBoard,
  Role.LeadershipCouncil,
  Role.Admin,
] as const;

/** Roles that may post / reconcile financial records (not aggregated-only). */
export const FINANCE_WRITE_ROLES: readonly Role[] = [
  Role.FinancialSecretary,
  Role.Admin,
] as const;

export function canAccessFinance(role: Role | string | undefined | null): boolean {
  if (!role) return false;
  return (FINANCE_ACCESS_ROLES as readonly string[]).includes(role);
}

export function canWriteFinance(role: Role | string | undefined | null): boolean {
  if (!role) return false;
  return (FINANCE_WRITE_ROLES as readonly string[]).includes(role);
}

export function isRecordsClerk(role: Role | string | undefined | null): boolean {
  return role === Role.RecordsClerk;
}

/** Roles that may open biodata / member register surfaces. */
export const MEMBERS_ACCESS_ROLES: readonly Role[] = [
  Role.RecordsClerk,
  Role.BranchLeader,
  Role.Admin,
  Role.FinancialSecretary,
  Role.PastoralBoard,
  Role.LeadershipCouncil,
] as const;

/** Roles that may create/update member biodata (not Board/Council read-only). */
export const MEMBERS_WRITE_ROLES: readonly Role[] = [
  Role.RecordsClerk,
  Role.BranchLeader,
  Role.Admin,
] as const;

export function canAccessMembers(role: Role | string | undefined | null): boolean {
  if (!role) return false;
  return (MEMBERS_ACCESS_ROLES as readonly string[]).includes(role);
}

export function canWriteMembers(role: Role | string | undefined | null): boolean {
  if (!role) return false;
  return (MEMBERS_WRITE_ROLES as readonly string[]).includes(role);
}

/**
 * Admin / Data Centre console (domains, users, export, backup narrative).
 * Brief: Church Administrator / Data Centre — full admin + user management.
 */
export const ADMIN_ACCESS_ROLES: readonly Role[] = [Role.Admin] as const;

export function canAccessAdmin(role: Role | string | undefined | null): boolean {
  if (!role) return false;
  return (ADMIN_ACCESS_ROLES as readonly string[]).includes(role);
}

/** Path prefixes that are HQ finance surfaces (UI + API). */
export const FINANCE_ROUTE_PREFIXES = ["/finance", "/api/finance"] as const;

/** Path prefixes for Admin / Data Centre console (UI + API). */
export const ADMIN_ROUTE_PREFIXES = ["/admin", "/api/admin"] as const;

export function isFinancePath(pathname: string): boolean {
  return FINANCE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isAdminPath(pathname: string): boolean {
  return ADMIN_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Board / Council dashboards and reporting APIs.
 * FinancialSecretary may view (same aggregates as finance overview).
 * RecordsClerk / BranchLeader stay out — no finance aggregates.
 */
export const REPORTING_ACCESS_ROLES: readonly Role[] = [
  Role.FinancialSecretary,
  Role.PastoralBoard,
  Role.LeadershipCouncil,
  Role.Admin,
] as const;

/** Data Centre / Admin may edit Board report templates and schedules. */
export const REPORT_TEMPLATE_EDIT_ROLES: readonly Role[] = [
  Role.Admin,
] as const;

export const REPORTING_ROUTE_PREFIXES = ["/reports", "/api/reports"] as const;

export function canAccessReporting(
  role: Role | string | undefined | null,
): boolean {
  if (!role) return false;
  return (REPORTING_ACCESS_ROLES as readonly string[]).includes(role);
}

export function canEditReportTemplates(
  role: Role | string | undefined | null,
): boolean {
  if (!role) return false;
  return (REPORT_TEMPLATE_EDIT_ROLES as readonly string[]).includes(role);
}

export function isReportingPath(pathname: string): boolean {
  return REPORTING_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Pastoral Board: kind rollups; Council: also branch / period breakdowns. */
export function reportingViewMode(
  role: Role | string | undefined | null,
): "board" | "council" | "admin" | null {
  if (role === Role.PastoralBoard) return "board";
  if (role === Role.LeadershipCouncil) return "council";
  if (role === Role.Admin || role === Role.FinancialSecretary) return "admin";
  return null;
}
