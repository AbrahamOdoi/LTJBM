import type { Role } from "@/lib/roles";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    memberId?: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      memberId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    memberId?: string;
    isActive?: boolean;
    roleCheckedAt?: number;
  }
}
