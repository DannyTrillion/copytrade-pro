"use client";

import { signOut } from "next-auth/react";
import {
  LogOut,
  Activity,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { LazyWalletButton } from "@/components/wallet/wallet-connect-lazy";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { sidebarOpen, toggleMobileSidebar } = useDashboardStore();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-14 bg-surface-1/80 backdrop-blur-xl border-b border-border z-30 flex items-center justify-between px-4 md:px-6 transition-all duration-200",
        "left-0 md:left-[64px]",
        sidebarOpen && "md:left-[240px]"
      )}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={toggleMobileSidebar}
          className="icon-btn md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm font-semibold text-text-primary hidden xs:block">{title}</h1>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 transition-all duration-200 hover:bg-success/15 hover:shadow-[0_0_12px_rgba(38,166,154,0.12)]">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse live-pulse text-success" />
          <span className="text-2xs font-medium text-success">LIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 md:gap-1">
        <button className="icon-btn hidden md:flex">
          <Activity className="w-4 h-4" />
        </button>
        <NotificationDropdown />
        <LazyWalletButton compact />
        <div className="w-px h-5 bg-border mx-0.5 md:mx-1" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="icon-btn-danger"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
