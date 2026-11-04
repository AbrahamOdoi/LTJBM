import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig, SESSION_MAX_AGE_SECONDS } from "@/auth.config";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import {
  checkLoginRateLimit,
  recordLoginAttempt,
} from "@/lib/auth/rate-limit";
import {
  createAuthSession,
  isAuthSessionActive,
  revokeAuthSession,
  revokeAllUserSessions,
} from "@/lib/auth/sessions";
import type { Role } from "@/lib/roles";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Re-check isActive + role + DB session at most once per minute per JWT. */
const ROLE_REFRESH_MS = 60_000;

function clientIp(request: Request | undefined): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 60 * 60,
  },
  events: {
    async signOut(message) {
      const token =
        "token" in message
          ? (message.token as { sessionToken?: string } | null)
          : null;
      if (token?.sessionToken) {
        await revokeAuthSession(token.sessionToken);
      }
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.memberId =
          "memberId" in user && typeof user.memberId === "string"
            ? user.memberId
            : undefined;
        token.isActive = true;
        token.roleCheckedAt = Date.now();

        if (user.id) {
          const created = await createAuthSession({
            userId: user.id,
            ipAddress:
              "ipAddress" in user && typeof user.ipAddress === "string"
                ? user.ipAddress
                : null,
            userAgent:
              "userAgent" in user && typeof user.userAgent === "string"
                ? user.userAgent
                : null,
          });
          token.sessionToken = created.sessionToken;
        }
      }

      if (token.id && typeof token.id === "string") {
        const checkedAt =
          typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0;
        const shouldRefresh =
          !checkedAt || Date.now() - checkedAt > ROLE_REFRESH_MS;
        if (user || shouldRefresh) {
          const sessionOk = await isAuthSessionActive(
            typeof token.sessionToken === "string"
              ? token.sessionToken
              : null,
          );
          if (!sessionOk && !user) {
            token.isActive = false;
            token.role = undefined;
            token.memberId = undefined;
            token.roleCheckedAt = Date.now();
            return token;
          }

          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true, isActive: true, memberId: true },
          });
          if (!dbUser || !dbUser.isActive) {
            if (typeof token.sessionToken === "string") {
              await revokeAuthSession(token.sessionToken);
            }
            await revokeAllUserSessions(token.id);
            token.isActive = false;
            token.role = undefined;
            token.memberId = undefined;
            token.roleCheckedAt = Date.now();
            return token;
          }
          token.role = dbUser.role as Role;
          token.memberId = dbUser.memberId ?? undefined;
          token.isActive = true;
          token.roleCheckedAt = Date.now();
        }
      }

      return token;
    },
    session({ session, token }) {
      if (token.isActive === false) {
        // Force callers to treat this as signed out until cookie expires.
        return { ...session, user: undefined as unknown as typeof session.user };
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.memberId =
          typeof token.memberId === "string" ? token.memberId : null;
      }
      if (typeof token.sessionToken === "string") {
        session.sessionToken = token.sessionToken;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase().trim();
        const ip = clientIp(request);

        const limit = await checkLoginRateLimit({ email, ipAddress: ip });
        if (!limit.allowed) {
          await writeAuditLog({
            actorId: null,
            action: "auth.login_rate_limited",
            entityType: "User",
            metadata: { email, ip, reason: limit.reason },
          });
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          await recordLoginAttempt({ email, ipAddress: ip, success: false });
          return null;
        }

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          await recordLoginAttempt({ email, ipAddress: ip, success: false });
          await writeAuditLog({
            actorId: user.id,
            action: "auth.login_failed",
            entityType: "User",
            entityId: user.id,
            metadata: { email },
          });
          return null;
        }

        await recordLoginAttempt({ email, ipAddress: ip, success: true });
        await writeAuditLog({
          actorId: user.id,
          action: "auth.login",
          entityType: "User",
          entityId: user.id,
          metadata: { email, role: user.role },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          memberId: user.memberId,
          ipAddress: ip,
          userAgent: request?.headers.get("user-agent") ?? null,
        };
      },
    }),
  ],
});
