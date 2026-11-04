import type { NextAuthConfig } from "next-auth";
import { canAccessFinance, isFinancePath } from "@/lib/roles";

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

      if (!isLoggedIn) {
        return false;
      }

      if (isFinancePath(pathname) && !canAccessFinance(auth.user.role)) {
        if (pathname.startsWith("/api/")) {
          return Response.json(
            {
              error:
                "Finance access denied. Records Clerks and unauthorised roles cannot open HQ finance.",
            },
            { status: 403 },
          );
        }
        return Response.redirect(
          new URL("/forbidden?reason=finance", request.nextUrl),
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
  },
} satisfies NextAuthConfig;
