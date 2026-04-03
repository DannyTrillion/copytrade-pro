"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  DollarSign,
  UserPlus,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Info,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  DEPOSIT: DollarSign,
  WITHDRAWAL: DollarSign,
  COPY_REQUEST: UserPlus,
  COPY_APPROVED: CheckCircle2,
  COPY_REJECTED: XCircle,
  TRADE_RESULT: TrendingUp,
  SYSTEM: Info,
};

const TYPE_COLORS: Record<string, string> = {
  DEPOSIT: "text-success bg-success/10",
  WITHDRAWAL: "text-danger bg-danger/10",
  COPY_REQUEST: "text-brand bg-brand/10",
  COPY_APPROVED: "text-success bg-success/10",
  COPY_REJECTED: "text-danger bg-danger/10",
  TRADE_RESULT: "text-info bg-info/10",
  SYSTEM: "text-text-secondary bg-surface-3",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=15");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Silent fail
    }
  }, []);

  // Initial fetch + polling every 15s, pauses when tab hidden
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      if (!document.hidden) fetchNotifications();
    }, 15000);

    const handleVisibility = () => {
      if (!document.hidden) fetchNotifications();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  };

  const handleClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", notificationId: notification.id }),
      }).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    // Navigate if actionUrl
    if (notification.actionUrl) {
      setOpen(false);
      router.push(notification.actionUrl);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        className="p-2 rounded-md hover:bg-surface-3 transition-colors text-text-secondary hover:text-text-primary relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-panel-elevated overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text-primary">Notifications</h4>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-2xs text-brand hover:text-brand-light transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification, i) => {
                  const Icon = TYPE_ICONS[notification.type] || Info;
                  const colorClass = TYPE_COLORS[notification.type] || TYPE_COLORS.SYSTEM;

                  return (
                    <motion.button
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => handleClick(notification)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface-3/50 transition-colors border-b border-border last:border-0 ${
                        !notification.read ? "bg-brand/[0.03]" : ""
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${colorClass}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-medium truncate ${!notification.read ? "text-text-primary" : "text-text-secondary"}`}>
                            {notification.title}
                          </p>
                          <span className="text-2xs text-text-tertiary shrink-0">{timeAgo(notification.createdAt)}</span>
                        </div>
                        <p className="text-2xs text-text-tertiary mt-0.5 line-clamp-2">{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-2" />
                      )}
                    </motion.button>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <Bell className="w-6 h-6 text-text-tertiary mx-auto mb-2" />
                  <p className="text-sm text-text-tertiary">No notifications yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
