import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig, SESSION_MAX_AGE_SECONDS } from "@/auth.config";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import type { Role } from "@/lib/roles";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Re-check isActive + role from DB at most once per minute per JWT. */
const ROLE_REFRESH_MS = 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 60 * 60,
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
      }

      if (token.id && typeof token.id === "string") {
        const checkedAt =
          typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0;
        const shouldRefresh = !checkedAt || Date.now() - checkedAt > ROLE_REFRESH_MS;
        if (user || shouldRefresh) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true, isActive: true, memberId: true },
          });
          if (!dbUser || !dbUser.isActive) {
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
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          return null;
        }

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          await writeAuditLog({
            actorId: user.id,
            action: "auth.login_failed",
            entityType: "User",
            entityId: user.id,
            metadata: { email },
          });
          return null;
        }

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
        };
      },
    }),
  ],
});
