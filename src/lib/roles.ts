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

/** Path prefixes that are HQ finance surfaces (UI + API). */
export const FINANCE_ROUTE_PREFIXES = ["/finance", "/api/finance"] as const;

export function isFinancePath(pathname: string): boolean {
  return FINANCE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
