import type { Role, TradeAction, SignalStatus, TradeStatus } from "@/config/constants";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface TraderProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  isActive: boolean;
  followersCount: number;
}

export interface SignalData {
  id: string;
  traderId: string;
  action: TradeAction;
  symbol: string;
  price: number;
  riskPercent: number;
  status: SignalStatus;
  createdAt: string;
  traderName?: string;
}

export interface TradeData {
  id: string;
  userId: string;
  signalId: string;
  action: TradeAction;
  symbol: string;
  amount: number;
  price: number;
  status: TradeStatus;
  txHash: string | null;
  pnl: number | null;
  createdAt: string;
}

export interface RiskSettings {
  riskPercent: number;
  maxTradeSize: number;
  maxDailyLoss: number;
  copyEnabled: boolean;
}

export interface WalletData {
  address: string;
  isConnected: boolean;
}

export interface DashboardStats {
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  activeCopiers: number;
  todayVolume: number;
  totalCommissions: number;
}

export interface AdminStats extends DashboardStats {
  totalUsers: number;
  totalTraders: number;
  totalFollowers: number;
  platformRevenue: number;
}

export interface CommissionData {
  id: string;
  tradeId: string;
  amount: number;
  rate: number;
  status: string;
  createdAt: string;
}
