export const APP_NAME = "CopyTrade Pro";
export const APP_DESCRIPTION = "Professional Copy Trading Platform";

export const ROLES = {
  ADMIN: "ADMIN",
  MASTER_TRADER: "MASTER_TRADER",
  FOLLOWER: "FOLLOWER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const TRADE_ACTIONS = {
  BUY: "BUY",
  SELL: "SELL",
} as const;

export type TradeAction = (typeof TRADE_ACTIONS)[keyof typeof TRADE_ACTIONS];

export const SIGNAL_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type SignalStatus = (typeof SIGNAL_STATUS)[keyof typeof SIGNAL_STATUS];

export const TRADE_STATUS = {
  PENDING: "PENDING",
  EXECUTING: "EXECUTING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type TradeStatus = (typeof TRADE_STATUS)[keyof typeof TRADE_STATUS];

export const DEFAULT_RISK_SETTINGS = {
  riskPercent: 2,
  maxTradeSize: 1000,
  maxDailyLoss: 5000,
  copyEnabled: true,
} as const;

export const COMMISSION_RATE = 0.02; // 2% platform commission

// ─── Tier System ───
export const TIERS = {
  TIER_1: "TIER_1",
  TIER_2: "TIER_2",
  TIER_3: "TIER_3",
} as const;

export type TierLevel = (typeof TIERS)[keyof typeof TIERS];

export interface TierConfig {
  level: TierLevel;
  name: string;
  label: string;
  minDeposit: number;
  maxDailyTrades: number; // -1 = unlimited
  commissionRate: number;
  color: string; // tailwind-compatible color token
  benefits: string[];
}

export const TIER_CONFIGS: Record<TierLevel, TierConfig> = {
  TIER_1: {
    level: "TIER_1",
    name: "Starter",
    label: "Tier 1",
    minDeposit: 0,
    maxDailyTrades: 1,
    commissionRate: 0.10, // 10%
    color: "zinc",
    benefits: [
      "1 copy trade per day",
      "Basic analytics",
      "Standard support",
    ],
  },
  TIER_2: {
    level: "TIER_2",
    name: "Growth",
    label: "Tier 2",
    minDeposit: 3000,
    maxDailyTrades: 5,
    commissionRate: 0.05, // 5%
    color: "blue",
    benefits: [
      "5 copy trades per day",
      "Advanced analytics",
      "Priority support",
      "Reduced commission (5%)",
    ],
  },
  TIER_3: {
    level: "TIER_3",
    name: "VIP",
    label: "Tier 3",
    minDeposit: 10000,
    maxDailyTrades: -1, // unlimited
    commissionRate: 0.02, // 2%
    color: "amber",
    benefits: [
      "Unlimited copy trades",
      "Full analytics suite",
      "Dedicated support",
      "Lowest commission (2%)",
      "Early access to new features",
    ],
  },
} as const;

export const WEBHOOK_SECRET_HEADER = "x-tradingview-secret";

export const API_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 100,
} as const;
