import type { NextAuthConfig } from "next-auth";
import {
  canAccessAdmin,
  canAccessFinance,
  canAccessReporting,
  isAdminPath,
  isFinancePath,
  isReportingPath,
} from "@/lib/roles";
import { getConfiguredCronSecret } from "@/lib/security";

/** Office-day session lifetime (seconds). Shorter than Auth.js default (~30d). */
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/**
 * Edge-safe Auth.js config (no Node-only providers / Prisma).
 * Used by middleware for session + route guards.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      const publicPaths = ["/login"];
      if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        if (isLoggedIn && pathname.startsWith("/login")) {
          return Response.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      if (pathname.startsWith("/api/auth")) {
        return true;
      }

      // Cron helper: allow only when Bearer matches a configured non-weak secret.
      if (pathname === "/api/reports/schedules/run" && request.method === "POST") {
        const cronSecret = getConfiguredCronSecret();
        const header = request.headers.get("authorization");
        if (
          cronSecret &&
          header === `Bearer ${cronSecret}`
        ) {
          return true;
        }
      }

      if (!isLoggedIn) {
        return false;
      }

      if (isFinancePath(pathname) && !canAccessFinance(auth.user.role)) {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            {
              error:
                "Finance access denied. Individual giving is HQ Finance/Admin only; Board/Council use /reports for aggregates. Records Clerks cannot open HQ finance.",
            },
            { status: 403 },
          );
        }
        return Response.redirect(
          new URL("/forbidden?reason=finance", request.nextUrl),
        );
      }

      if (isReportingPath(pathname) && !canAccessReporting(auth.user.role)) {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            {
              error:
                "Reporting access denied. Aggregated Board/Council views are role-gated.",
            },
            { status: 403 },
          );
        }
        return Response.redirect(
          new URL("/forbidden?reason=reporting", request.nextUrl),
        );
      }

      if (isAdminPath(pathname) && !canAccessAdmin(auth.user.role)) {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            {
              error:
                "Admin / Data Centre access denied. Only Admin may open admin routes or APIs.",
            },
            { status: 403 },
          );
        }
        return Response.redirect(
          new URL("/forbidden?reason=admin", request.nextUrl),
        );
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: 60 * 60,
  },
} satisfies NextAuthConfig;
