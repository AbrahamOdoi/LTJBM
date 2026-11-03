import { auth } from "@/auth";
import {
  canAccessFinance,
  canAccessMembers,
  canWriteFinance,
  canWriteMembers,
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

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthGuardError("Authentication required", 401);
  }
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
