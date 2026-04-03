import { z } from "zod";

export const tradingViewSignalSchema = z.object({
  action: z.enum(["BUY", "SELL"]),
  symbol: z.string().min(1).max(50),
  price: z.number().positive(),
  risk_percent: z.number().min(0.1).max(100),
  trader_id: z.string().uuid(),
  secret: z.string().optional(),
});

export type TradingViewSignal = z.infer<typeof tradingViewSignalSchema>;

export const walletConnectSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

export const riskSettingsSchema = z.object({
  allocationPercent: z.number().min(1).max(100).optional(),
  copyEnabled: z.boolean().optional(),
});

export const followTraderSchema = z.object({
  traderId: z.string().uuid(),
  allocationPercent: z.number().min(1).max(100).default(100),
});
