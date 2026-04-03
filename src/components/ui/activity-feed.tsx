"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Users, Wallet, Copy, ArrowUpRight } from "lucide-react";
import { LiveIndicator } from "./live-indicator";

interface FeedItem {
  id: string;
  type: "copy" | "deposit" | "trade" | "follow";
  user: string;
  detail: string;
  time: string;
}

const FEED_TEMPLATES: Omit<FeedItem, "id" | "time">[] = [
  { type: "copy", user: "AlexT", detail: "copied BTC Long from CryptoKing" },
  { type: "deposit", user: "Sarah M", detail: "deposited $500" },
  { type: "trade", user: "MarketPro", detail: "closed ETH trade +12.4%" },
  { type: "follow", user: "Mike R", detail: "started following AlphaTrader" },
  { type: "copy", user: "JohnD", detail: "copied SOL Short from TradeMaster" },
  { type: "trade", user: "CryptoKing", detail: "opened LINK Long position" },
  { type: "deposit", user: "Emma W", detail: "deposited $1,200" },
  { type: "follow", user: "DavidK", detail: "started following MarketPro" },
  { type: "copy", user: "LisaB", detail: "copied AVAX trade from AlphaTrader" },
  { type: "trade", user: "AlphaTrader", detail: "closed BNB trade +8.2%" },
  { type: "deposit", user: "Chris P", detail: "deposited $750" },
  { type: "copy", user: "NinaS", detail: "copied DOT Long from CryptoKing" },
];

const ICONS = {
  copy: { icon: Copy, color: "text-brand", bg: "bg-brand/10" },
  deposit: { icon: Wallet, color: "text-success", bg: "bg-success/10" },
  trade: { icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
  follow: { icon: Users, color: "text-info", bg: "bg-info/10" },
};

const TIMES = ["12s ago", "34s ago", "1m ago", "2m ago", "4m ago"];

export function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Initialize on client only to avoid hydration mismatch
  useEffect(() => {
    setItems(
      FEED_TEMPLATES.slice(0, 5).map((t, i) => ({
        ...t,
        id: `init-${i}`,
        time: TIMES[i],
      }))
    );
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      const template = FEED_TEMPLATES[Math.floor(Math.random() * FEED_TEMPLATES.length)];
      const newItem: FeedItem = {
        ...template,
        id: `feed-${Date.now()}`,
        time: "just now",
      };
      setItems((prev) => [newItem, ...prev.slice(0, 4)]);
    }, 6000);

    return () => clearInterval(interval);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="glass-panel p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">Platform Activity</h3>
            <LiveIndicator />
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-text-tertiary" />
        </div>
        <div className="h-[200px] animate-pulse bg-surface-2 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">Platform Activity</h3>
          <LiveIndicator />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-text-tertiary" />
      </div>
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item) => {
            const cfg = ICONS[item.type];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
              >
                <div className={`p-1.5 rounded-lg ${cfg.bg} flex-shrink-0`}>
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary truncate">
                    <span className="font-semibold text-text-primary">{item.user}</span>{" "}
                    {item.detail}
                  </p>
                </div>
                <span className="text-2xs text-text-tertiary whitespace-nowrap flex-shrink-0">
                  {item.time}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
