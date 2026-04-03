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

export const WEBHOOK_SECRET_HEADER = "x-tradingview-secret";

export const API_RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 100,
} as const;
