"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  if (!session?.isImpersonating) return null;

  const handleExit = async () => {
    setExiting(true);
    try {
      // Notify backend (for audit logging)
      await fetch("/api/admin/impersonate", { method: "DELETE" });

      // Restore admin session via NextAuth update
      await update({ stopImpersonation: true });

      // Redirect back to admin dashboard
      router.push("/dashboard/admin/users");
      router.refresh();
    } catch (err) {
      console.error("Failed to exit impersonation:", err);
    } finally {
      setExiting(false);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-600/95 via-amber-500/95 to-amber-600/95 backdrop-blur-sm border-b border-amber-400/30 shadow-lg shadow-amber-900/20">
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-sm font-semibold text-white">
              Admin Override Mode Active
            </span>
            <span className="text-xs text-amber-100/80">
              Viewing as {session.user.name} ({session.user.email})
            </span>
          </div>
        </div>

        <button
          onClick={handleExit}
          disabled={exiting}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium transition-all disabled:opacity-50"
        >
          {exiting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <LogOut className="w-3.5 h-3.5" />
          )}
          Exit Override
        </button>
      </div>
    </div>
  );
}
