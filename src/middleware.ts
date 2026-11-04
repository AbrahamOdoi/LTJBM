import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Member photos under /uploads must stay behind auth (PII).
     * Matched explicitly because the general rule skips image extensions.
     */
    "/uploads/:path*",
    /*
     * Protect app routes; skip Next internals and non-upload static assets.
     * Auth + finance/admin/reporting gates live in auth.config authorized.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
