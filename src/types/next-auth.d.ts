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
    /** Set when the session failed server-side revalidation. */
    revoked?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isImpersonating?: boolean;
    impersonatorId?: string;
    originalRole?: Role;
    /** Account state mirrored from the DB on each token refresh. */
    suspended?: boolean;
    /**
     * Session version stamped at sign-in. A mismatch against the user's
     * current `sessionVersion` invalidates this token — see lib/security/session.
     */
    sessionVersion?: number;
    /** True once revalidation has failed; consumers must reject the session. */
    revoked?: boolean;
    revokedReason?: string;
  }
}
