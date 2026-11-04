import type { Role } from "@/lib/roles";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    memberId?: string | null;
    /** Transient — used only during Credentials authorize → jwt. */
    ipAddress?: string | null;
    userAgent?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      memberId?: string | null;
    } & DefaultSession["user"];
    /** DB AuthSession token — used by requireSession for revoke checks. */
    sessionToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    memberId?: string;
    isActive?: boolean;
    roleCheckedAt?: number;
    /** DB-backed session token for revoke-before-expiry. */
    sessionToken?: string;
  }
}
