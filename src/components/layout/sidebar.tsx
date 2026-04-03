"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Signal,
  BarChart3,
  TrendingUp,
  Copy,
  ChevronLeft,
  X,
  Settings,
  PieChart,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Activity,
  UserPlus,
  Wallet,
  FileText,
  MessageSquare,
  Upload,
  Gift,
  CreditCard,
  Shield,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

// ─── Admin-only sidebar ───
const ADMIN_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Users", href: "/dashboard/admin/users", icon: Users },
      { label: "Master Traders", href: "/dashboard/admin/manage-traders", icon: UserPlus },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Deposits", href: "/dashboard/admin/deposits", icon: Wallet },
      { label: "Card Payments", href: "/dashboard/admin/card-payments", icon: CreditCard },
      { label: "Withdrawals", href: "/dashboard/admin/withdrawals", icon: ArrowUpRight },
      { label: "Next of Kin", href: "/dashboard/admin/next-of-kin", icon: Heart },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", href: "/dashboard/admin/analytics", icon: PieChart },
      { label: "Audit Log", href: "/dashboard/admin/audit-log", icon: FileText },
    ],
  },
  {
    items: [
      { label: "Support Chat", href: "/dashboard/admin/support", icon: MessageSquare },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

// ─── Master Trader sidebar ───
const TRADER_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard/trader", icon: LayoutDashboard },
    ],
  },
  {
    title: "Trading",
    items: [
      { label: "Upload Trades", href: "/dashboard/trader/upload", icon: Upload },
      { label: "Trade History", href: "/dashboard/trader/trades", icon: BarChart3 },
      { label: "Followers", href: "/dashboard/trader/followers", icon: Users },
      { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", href: "/dashboard/analytics", icon: Activity },
    ],
  },
  {
    items: [
      { label: "Profile", href: "/dashboard/trader/profile", icon: Signal },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

// ─── Regular user sidebar ───
const USER_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Trading",
    items: [
      { label: "Trades", href: "/dashboard/trades", icon: BarChart3 },
      { label: "Analytics", href: "/dashboard/analytics", icon: Activity },
      { label: "Copy Trading", href: "/dashboard/follower", icon: Copy },
      { label: "Messages", href: "/dashboard/messages", icon: MessageSquare },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Deposit", href: "/dashboard/deposit", icon: ArrowDownLeft },
      { label: "Withdraw", href: "/dashboard/withdraw", icon: ArrowUpRight },
      { label: "Payment Methods", href: "/dashboard/payment-methods", icon: CreditCard },
      { label: "History", href: "/dashboard/history", icon: Clock },
    ],
  },
  {
    title: "Rewards",
    items: [
      { label: "Referrals", href: "/dashboard/referrals", icon: Gift },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Next of Kin", href: "/dashboard/next-of-kin", icon: Shield },
    ],
  },
  {
    items: [
      { label: "Support", href: "/dashboard/support", icon: MessageSquare },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, mobileSidebarOpen, setMobileSidebar } = useDashboardStore();

  // Each role gets its own dedicated nav
  const baseSections =
    userRole === "ADMIN" ? ADMIN_SECTIONS :
    userRole === "MASTER_TRADER" ? TRADER_SECTIONS :
    USER_SECTIONS;
  const filteredSections = baseSections.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(userRole)
    ),
  })).filter((section) => section.items.length > 0);

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center flex-shrink-0 shadow-glow transition-all duration-300 hover:scale-110 hover:shadow-[0_0_16px_rgba(41,98,255,0.4)] hover:rotate-[-4deg]">
            <TrendingUp className="w-4 h-4 text-white transition-transform duration-300" />
          </div>
          {(sidebarOpen || isMobile) && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-semibold text-text-primary whitespace-nowrap text-sm"
            >
              CopyTrade Pro
            </motion.span>
          )}
        </div>
        {isMobile && (
          <button
            onClick={() => setMobileSidebar(false)}
            className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto">
        {filteredSections.map((section, sIdx) => {
          // Compute base index for stagger delay
          const baseIdx = filteredSections
            .slice(0, sIdx)
            .reduce((sum, s) => sum + s.items.length, 0);

          return (
          <div key={sIdx}>
            {/* Section title */}
            {section.title && (sidebarOpen || isMobile) && (
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary px-3 pt-3 pb-1 font-semibold">
                {section.title}
              </p>
            )}
            {section.title && !sidebarOpen && !isMobile && (
              <div className="mx-auto my-1.5 w-6 h-px bg-border" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item, iIdx) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                const idx = baseIdx + iIdx;

                return (
                  <motion.div
                    key={item.href}
                    initial={isMobile ? { opacity: 0, x: -12 } : false}
                    animate={isMobile ? { opacity: 1, x: 0 } : undefined}
                    transition={isMobile ? { delay: 0.05 + idx * 0.03, duration: 0.2 } : undefined}
                  >
                    <Link
                      href={item.href}
                      onClick={() => isMobile && setMobileSidebar(false)}
                      className={cn(
                        isActive ? "sidebar-link-active" : "sidebar-link",
                        !sidebarOpen && !isMobile && "justify-center px-2"
                      )}
                      title={!sidebarOpen && !isMobile ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0 sidebar-icon" />
                      <AnimatePresence>
                        {(sidebarOpen || isMobile) && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-sm whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* User / collapse */}
      <div className="border-t border-border p-2 space-y-1">
        {(sidebarOpen || isMobile) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{userName}</p>
              <p className="text-xs text-text-tertiary capitalize">{userRole.replace("_", " ").toLowerCase()}</p>
            </div>
            <ThemeToggle />
          </motion.div>
        )}
        {!sidebarOpen && !isMobile && (
          <div className="flex justify-center py-1">
            <ThemeToggle />
          </div>
        )}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="sidebar-link w-full justify-center group/collapse"
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            <ChevronLeft
              className={cn(
                "w-4 h-4 transition-all duration-300 group-hover/collapse:scale-110",
                !sidebarOpen && "rotate-180"
              )}
            />
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 top-0 h-screen bg-surface-1 border-r border-border z-40 hidden md:flex flex-col shadow-sm"
      >
        {sidebarContent(false)}
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mobile-overlay md:hidden"
              onClick={() => setMobileSidebar(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 h-screen w-[280px] bg-surface-1 border-r border-border z-50 flex flex-col md:hidden shadow-xl"
            >
              {sidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
