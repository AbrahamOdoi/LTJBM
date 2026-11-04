import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { SESSION_MAX_AGE_SECONDS } from "@/auth.config";

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createAuthSession(opts: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ sessionToken: string; expiresAt: Date }> {
  const sessionToken = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await prisma.authSession.create({
    data: {
      sessionToken,
      userId: opts.userId,
      expiresAt,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
    },
  });
  return { sessionToken, expiresAt };
}

export async function isAuthSessionActive(
  sessionToken: string | undefined | null,
): Promise<boolean> {
  if (!sessionToken) return false;
  const row = await prisma.authSession.findUnique({
    where: { sessionToken },
    select: { revokedAt: true, expiresAt: true },
  });
  if (!row) return false;
  if (row.revokedAt) return false;
  if (row.expiresAt.getTime() <= Date.now()) return false;
  return true;
}

export async function revokeAuthSession(
  sessionToken: string | undefined | null,
): Promise<void> {
  if (!sessionToken) return;
  await prisma.authSession.updateMany({
    where: { sessionToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await prisma.authSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function touchAuthSession(
  sessionToken: string | undefined | null,
): Promise<void> {
  if (!sessionToken) return;
  await prisma.authSession.updateMany({
    where: {
      sessionToken,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { updatedAt: new Date() },
  });
}
