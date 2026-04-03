import type { Role } from "@/config/constants";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
    isImpersonating?: boolean;
    impersonatorId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isImpersonating?: boolean;
    impersonatorId?: string;
    originalRole?: Role;
  }
}
