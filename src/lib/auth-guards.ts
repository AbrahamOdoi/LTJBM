import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  canAccessAdmin,
  canAccessAttendance,
  canAccessEvents,
  canAccessFinance,
  canAccessGroups,
  canAccessMedia,
  canAccessMembers,
  canAccessPastoral,
  canAccessReporting,
  canAccessVolunteers,
  canEditReportTemplates,
  canWriteAttendance,
  canWriteEvents,
  canWriteFinance,
  canWriteGroups,
  canWriteMedia,
  canWriteMembers,
  canWriteVolunteers,
  type Role,
} from "@/lib/roles";

export class AuthGuardError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthGuardError";
    this.status = status;
  }
}

/**
 * Require a signed-in user and re-check DB for isActive + current role.
 * JWT alone is not enough after admin deactivates or demotes a user.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthGuardError("Authentication required", 401);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, role: true },
  });
  if (!dbUser || !dbUser.isActive) {
    throw new AuthGuardError("Account deactivated or not found", 401);
  }

  session.user.role = dbUser.role as Role;
  return session;
}

export async function requireFinanceAccess() {
  const session = await requireSession();
  if (!canAccessFinance(session.user.role)) {
    throw new AuthGuardError(
      "Finance access denied. Records Clerks and unauthorised roles cannot open HQ finance.",
      403,
    );
  }
  return session;
}

export async function requireFinanceWrite() {
  const session = await requireFinanceAccess();
  if (!canWriteFinance(session.user.role)) {
    throw new AuthGuardError(
      "Finance write denied. Aggregated Board/Council views are read-only.",
      403,
    );
  }
  return session;
}

export async function requireReportingAccess() {
  const session = await requireSession();
  if (!canAccessReporting(session.user.role)) {
    throw new AuthGuardError(
      "Reporting access denied. Aggregated Board/Council views are role-gated.",
      403,
    );
  }
  return session;
}

export async function requireReportTemplateEdit() {
  const session = await requireSession();
  if (!canEditReportTemplates(session.user.role)) {
    throw new AuthGuardError(
      "Report template edit denied. Admin / Data Centre only.",
      403,
    );
  }
  return session;
}

export async function requireMembersAccess() {
  const session = await requireSession();
  if (!canAccessMembers(session.user.role)) {
    throw new AuthGuardError("Members access denied.", 403);
  }
  return session;
}

export async function requireMembersWrite() {
  const session = await requireMembersAccess();
  if (!canWriteMembers(session.user.role)) {
    throw new AuthGuardError(
      "Members write denied. Board/Council roles are read-only for biodata.",
      403,
    );
  }
  return session;
}

export async function requireRoles(...roles: Role[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) {
    throw new AuthGuardError("Insufficient role", 403);
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!canAccessAdmin(session.user.role)) {
    throw new AuthGuardError(
      "Admin / Data Centre access denied. Only Admin may open the admin console.",
      403,
    );
  }
  return session;
}

export async function requireAttendanceAccess() {
  const session = await requireSession();
  if (!canAccessAttendance(session.user.role)) {
    throw new AuthGuardError("Attendance access denied.", 403);
  }
  return session;
}

export async function requireAttendanceWrite() {
  const session = await requireAttendanceAccess();
  if (!canWriteAttendance(session.user.role)) {
    throw new AuthGuardError("Attendance write denied.", 403);
  }
  return session;
}

export async function requirePastoralAccess() {
  const session = await requireSession();
  if (!canAccessPastoral(session.user.role)) {
    throw new AuthGuardError(
      "Pastoral care access denied. Restricted to Pastoral Board, Branch Leaders, and Admin.",
      403,
    );
  }
  return session;
}

export async function requireEventsAccess() {
  const session = await requireSession();
  if (!canAccessEvents(session.user.role)) {
    throw new AuthGuardError("Events access denied.", 403);
  }
  return session;
}

export async function requireEventsWrite() {
  const session = await requireEventsAccess();
  if (!canWriteEvents(session.user.role)) {
    throw new AuthGuardError("Events write denied.", 403);
  }
  return session;
}

export async function requireGroupsAccess() {
  const session = await requireSession();
  if (!canAccessGroups(session.user.role)) {
    throw new AuthGuardError("Groups access denied.", 403);
  }
  return session;
}

export async function requireGroupsWrite() {
  const session = await requireGroupsAccess();
  if (!canWriteGroups(session.user.role)) {
    throw new AuthGuardError(
      "Groups write denied. Board/Council may view rosters and meeting logs only.",
      403,
    );
  }
  return session;
}

export async function requireMediaAccess() {
  const session = await requireSession();
  if (!canAccessMedia(session.user.role)) {
    throw new AuthGuardError("Sermon library access denied.", 403);
  }
  return session;
}

export async function requireMediaWrite() {
  const session = await requireMediaAccess();
  if (!canWriteMedia(session.user.role)) {
    throw new AuthGuardError(
      "Sermon library write denied for this role.",
      403,
    );
  }
  return session;
}

export async function requireVolunteersAccess() {
  const session = await requireSession();
  if (!canAccessVolunteers(session.user.role)) {
    throw new AuthGuardError("Volunteer scheduling access denied.", 403);
  }
  return session;
}

export async function requireVolunteersWrite() {
  const session = await requireVolunteersAccess();
  if (!canWriteVolunteers(session.user.role)) {
    throw new AuthGuardError(
      "Volunteer write denied. Board/Council may view schedules only.",
      403,
    );
  }
  return session;
}

/**
 * Member portal — requires a linked memberId on the user.
 * Own profile + own giving statement only (never other members' finance).
 */
export async function requirePortalAccess() {
  const session = await requireSession();
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { memberId: true, role: true },
  });
  if (!dbUser?.memberId) {
    throw new AuthGuardError(
      "Member portal requires a linked member record. Contact Data Centre.",
      403,
    );
  }
  session.user.memberId = dbUser.memberId;
  return session;
}
