"use client";

import { useCallback } from "react";
import { usePolling } from "./use-polling";

const INTERVAL_30S = 30_000;
const INTERVAL_15S = 15_000;

interface BalanceData {
  balance: number;
  currency: string;
  updatedAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface Deposit {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export function useLiveBalance(enabled: boolean = true) {
  const fetchBalance = useCallback(
    () => fetchJson<BalanceData>("/api/balance"),
    [],
  );

  return usePolling(fetchBalance, INTERVAL_30S, enabled);
}

export function useLiveNotifications(enabled: boolean = true) {
  const fetchNotifications = useCallback(
    () => fetchJson<Notification[]>("/api/notifications?unread=true"),
    [],
  );

  return usePolling(fetchNotifications, INTERVAL_15S, enabled);
}

export function useLiveDeposits(enabled: boolean = true) {
  const fetchDeposits = useCallback(
    () => fetchJson<Deposit[]>("/api/deposits"),
    [],
  );

  return usePolling(fetchDeposits, INTERVAL_30S, enabled);
}
