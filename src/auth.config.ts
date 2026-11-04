import type { NextAuthConfig } from "next-auth";
import {
  Role,
  canAccessAdmin,
  canAccessAttendance,
  canAccessEvents,
  canAccessFinance,
  canAccessGroups,
  canAccessPastoral,
  canAccessReporting,
  isAdminPath,
  isAttendancePath,
  isEventsPath,
  isFinancePath,
  isGroupsPath,
  isPastoralPath,
  isPortalPath,
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

      const role = auth.user.role;

      // Member portal role: only /portal (+ home/login handled above).
      if (role === Role.Member) {
        if (
          isPortalPath(pathname) ||
          pathname === "/" ||
          pathname === "/forbidden"
        ) {
          return true;
        }
        if (pathname.startsWith("/api/")) {
          return Response.json(
            { error: "Member portal accounts may only use /portal." },
            { status: 403 },
          );
        }
        return Response.redirect(new URL("/portal", request.nextUrl));
      }

      if (isPortalPath(pathname)) {
        // Staff may open portal only when linked — page guards enforce memberId.
        return true;
      }

      if (isFinancePath(pathname) && !canAccessFinance(role)) {
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

      if (isReportingPath(pathname) && !canAccessReporting(role)) {
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

      if (isAdminPath(pathname) && !canAccessAdmin(role)) {
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

      if (isAttendancePath(pathname) && !canAccessAttendance(role)) {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            { error: "Attendance access denied." },
            { status: 403 },
          );
        }
        return Response.redirect(
          new URL("/forbidden?reason=attendance", request.nextUrl),
        );
      }

      if (isPastoralPath(pathname) && !canAccessPastoral(role)) {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            { error: "Pastoral care access denied (restricted)." },
            { status: 403 },
          );
        }
        return Response.redirect(
          new URL("/forbidden?reason=pastoral", request.nextUrl),
        );
      }

      if (isEventsPath(pathname) && !canAccessEvents(role)) {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            { error: "Events access denied." },
            { status: 403 },
          );
        }
        return Response.redirect(
          new URL("/forbidden?reason=events", request.nextUrl),
        );
      }

      if (isGroupsPath(pathname) && !canAccessGroups(role)) {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            { error: "Groups access denied." },
            { status: 403 },
          );
        }
        return Response.redirect(
          new URL("/forbidden?reason=groups", request.nextUrl),
        );
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        if ("memberId" in user && typeof user.memberId === "string") {
          token.memberId = user.memberId;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.memberId =
          typeof token.memberId === "string" ? token.memberId : null;
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
