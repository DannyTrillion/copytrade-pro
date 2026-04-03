"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const queryKeys = {
  balance: ["balance"] as const,
  withdrawals: ["withdrawals"] as const,
  traders: ["traders"] as const,
  trades: ["trades"] as const,
  notifications: ["notifications"] as const,
};

// ---------------------------------------------------------------------------
// Generic fetcher with typed error handling
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
}

async function apiPost<T>(url: string, data: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Operation failed" }));
    throw new Error(error.error || "Operation failed");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Response types — derived from actual API route return shapes
// ---------------------------------------------------------------------------

export interface BalanceRecord {
  id: string;
  userId: string;
  totalBalance: number;
  availableBalance: number;
  allocatedBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceTransaction {
  id: string;
  userId: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "ALLOCATION" | "DEALLOCATION";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  txHash: string | null;
  createdAt: string;
}

export interface BalanceResponse {
  balance: BalanceRecord;
  transactions: BalanceTransaction[];
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  walletAddress: string;
  network: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalsResponse {
  withdrawals: WithdrawalRequest[];
  availableBalance: number;
}

// ---------------------------------------------------------------------------
// Mutation payloads
// ---------------------------------------------------------------------------

export interface DepositPayload {
  operation: "deposit";
  amount: number;
  txHash?: string;
  signature?: string;
  message?: string;
  walletAddress?: string;
}

export interface WithdrawPayload {
  operation: "withdraw";
  amount: number;
}

export interface AllocatePayload {
  operation: "allocate";
  amount: number;
  action: "allocate" | "deallocate";
}

export type BalanceMutationPayload =
  | DepositPayload
  | WithdrawPayload
  | AllocatePayload;

export interface WithdrawalMutationPayload {
  amount: number;
  walletAddress: string;
  network: string;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Fetch current user balance and recent transactions. */
export function useBalance() {
  return useQuery({
    queryKey: queryKeys.balance,
    queryFn: () => apiFetch<BalanceResponse>("/api/balance"),
  });
}

/** Fetch withdrawal history and available balance. */
export function useWithdrawals() {
  return useQuery({
    queryKey: queryKeys.withdrawals,
    queryFn: () => apiFetch<WithdrawalsResponse>("/api/withdrawals"),
  });
}

/** Fetch available traders for copy trading. */
export function useTraders() {
  return useQuery({
    queryKey: queryKeys.traders,
    queryFn: () => apiFetch<{ traders: unknown[] }>("/api/traders"),
  });
}

/** Poll notifications every 30 seconds. */
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => apiFetch<{ notifications: unknown[] }>("/api/notifications"),
    refetchInterval: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Deposit, withdraw, or allocate/deallocate funds. */
export function useBalanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BalanceMutationPayload) =>
      apiPost<{ balance: BalanceRecord }>("/api/balance", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
      queryClient.invalidateQueries({ queryKey: queryKeys.withdrawals });
    },
  });
}

/** Create a new withdrawal request. */
export function useWithdrawalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: WithdrawalMutationPayload) =>
      apiPost<{ withdrawal: WithdrawalRequest }>("/api/withdrawals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.withdrawals });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance });
    },
  });
}
