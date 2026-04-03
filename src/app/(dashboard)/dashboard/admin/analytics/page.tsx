"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  DollarSign,
  BarChart3,
  UserPlus,
  Signal,
  Copy,
  Activity,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PnlChart } from "@/components/charts/pnl-chart";
import { formatCurrency } from "@/lib/utils";

interface AnalyticsData {
  overview: {
    totalUsers: number;
    newUsers: number;
    totalTraders: number;
    totalFollowers: number;
    activeFollowers: number;
    totalTrades: number;
    recentTrades: number;
    depositVolume: number;
    withdrawalVolume: number;
    commissionRevenue: number;
  };
  timeSeries: {
    users: { date: string; count: number }[];
    trades: { date: string; count: number; pnl: number }[];
    revenue: { date: string; total: number }[];
  };
  period: { days: number; since: string };
}

const PERIOD_OPTIONS = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
  { label: "1Y", value: 365 },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Transform time-series data for PnlChart (uses `pnl` as dataKey)
  const userGrowthData = data?.timeSeries.users.map((d) => ({
    date: d.date,
    pnl: d.count,
  })) || [];

  const tradeVolumeData = data?.timeSeries.trades.map((d) => ({
    date: d.date,
    pnl: d.count,
  })) || [];

  const tradePnlData = data?.timeSeries.trades.map((d) => ({
    date: d.date,
    pnl: d.pnl,
  })) || [];

  const revenueData = data?.timeSeries.revenue.map((d) => ({
    date: d.date,
    pnl: d.total,
  })) || [];

  if (loading && !data) {
    return (
      <>
        <div className="dashboard-section">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
          </div>
        </div>
      </>
    );
  }

  const o = data?.overview;

  return (
    <>
      <div className="dashboard-section">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Platform Analytics</h2>
            <p className="text-sm text-text-tertiary mt-0.5">
              {loading ? "Updating..." : `Last ${days} days overview`}
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  days === opt.value
                    ? "bg-brand text-white shadow-glow"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* KPI Stats */}
        <div className="stat-grid">
          <StatCard
            title="Total Users"
            value={o?.totalUsers?.toLocaleString() || "0"}
            change={`+${o?.newUsers || 0} this period`}
            changeType="positive"
            icon={Users}
            delay={0}
          />
          <StatCard
            title="Active Traders"
            value={o?.totalTraders?.toLocaleString() || "0"}
            change={`${o?.activeFollowers || 0} active followers`}
            changeType="neutral"
            icon={Signal}
            delay={0.05}
          />
          <StatCard
            title="Total Trades"
            value={o?.totalTrades?.toLocaleString() || "0"}
            change={`${o?.recentTrades || 0} this period`}
            changeType="neutral"
            icon={BarChart3}
            delay={0.1}
          />
          <StatCard
            title="Commission Revenue"
            value={formatCurrency(o?.commissionRevenue || 0)}
            change="Platform earnings"
            changeType="positive"
            icon={DollarSign}
            delay={0.15}
          />
        </div>

        {/* Volume Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-text-tertiary">Deposit Volume</span>
            </div>
            <p className="text-lg font-semibold text-text-primary number-value">
              {formatCurrency(o?.depositVolume || 0)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-danger" />
              <span className="text-xs text-text-tertiary">Withdrawal Volume</span>
            </div>
            <p className="text-lg font-semibold text-text-primary number-value">
              {formatCurrency(o?.withdrawalVolume || 0)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Copy className="w-4 h-4 text-brand" />
              <span className="text-xs text-text-tertiary">Copy Followers</span>
            </div>
            <p className="text-lg font-semibold text-text-primary number-value">
              {o?.totalFollowers || 0}
              <span className="text-sm text-text-tertiary font-normal ml-1">
                ({o?.activeFollowers || 0} active)
              </span>
            </p>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* User Growth */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-4 md:p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-semibold text-text-primary">User Growth</h3>
            </div>
            {userGrowthData.length > 0 ? (
              <PnlChart data={userGrowthData} height={200} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-text-tertiary">
                No data for this period
              </div>
            )}
          </motion.div>

          {/* Trade Volume */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-4 md:p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-info" />
              <h3 className="text-sm font-semibold text-text-primary">Trade Volume</h3>
            </div>
            {tradeVolumeData.length > 0 ? (
              <PnlChart data={tradeVolumeData} height={200} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-text-tertiary">
                No data for this period
              </div>
            )}
          </motion.div>

          {/* Trade P&L */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-4 md:p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-success" />
              <h3 className="text-sm font-semibold text-text-primary">Trade P&L</h3>
            </div>
            {tradePnlData.length > 0 ? (
              <PnlChart data={tradePnlData} height={200} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-text-tertiary">
                No data for this period
              </div>
            )}
          </motion.div>

          {/* Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-4 md:p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-success" />
              <h3 className="text-sm font-semibold text-text-primary">Commission Revenue</h3>
            </div>
            {revenueData.length > 0 ? (
              <PnlChart data={revenueData} height={200} />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-text-tertiary">
                No data for this period
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
