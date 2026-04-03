"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useAccount, useSignMessage } from "wagmi";
import {
  Copy,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  Lock,
  ArrowRightLeft,
  BarChart3,
  Plus,
  Minus,
  ShieldCheck,
  Settings,
  ToggleLeft,
  ToggleRight,
  Wallet,
  Zap,
  ChevronRight,
  MessageSquare,
  LayoutDashboard,
  Users,
  ClipboardList,
  History,
  Trophy,
  Target,
  Activity,
  Star,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { PnlChart } from "@/components/charts/pnl-chart";
import { Modal } from "@/components/ui/modal";
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button";
import { TraderProfilePanel } from "@/components/trader/trader-profile-panel";
import { formatCurrency } from "@/lib/utils";
import { pageTransition } from "@/lib/animations";
import Link from "next/link";
import Image from "next/image";

interface Balance {
  totalBalance: number;
  availableBalance: number;
  allocatedBalance: number;
  totalProfit: number;
}

interface BalanceTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

interface TraderItem {
  id: string;
  name: string;
  avatar?: string | null;
  pnl: number;
  winRate: number;
  followers: number;
  isFollowing: boolean;
  totalTrades: number;
}

interface CopyResultRow {
  id: string;
  profitLoss: number;
  resultPercent: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
  traderTrade: {
    tradeName: string;
    market: string;
    tradeDate: string;
    trader: { displayName: string };
  };
}

interface CopyRequest {
  id: string;
  traderId: string;
  traderName: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  trader: { id: string; displayName: string; userId: string };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function txTypeLabel(type: string): string {
  const map: Record<string, string> = {
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    COPY_PROFIT: "Copy Profit",
    COPY_LOSS: "Copy Loss",
    ALLOCATION: "Allocated",
    DEALLOCATION: "Deallocated",
  };
  return map[type] || type;
}

function txTypeColor(type: string): string {
  if (type === "DEPOSIT" || type === "COPY_PROFIT") return "text-success";
  if (type === "WITHDRAWAL" || type === "COPY_LOSS") return "text-danger";
  return "text-text-secondary";
}

export function FollowerDashboard() {
  // Wagmi hooks for deposit signing
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();



  // Balance state
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [copyResults, setCopyResults] = useState<CopyResultRow[]>([]);

  // Modals
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [showCopyRequestModal, setShowCopyRequestModal] = useState(false);
  const [modalAmount, setModalAmount] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Copy request state
  const [copyTraderName, setCopyTraderName] = useState("");
  const [copyTraderId, setCopyTraderId] = useState("");
  const [copyRiskPercent, setCopyRiskPercent] = useState(2);
  const [copyMessage, setCopyMessage] = useState("");
  const [copyRequesting, setCopyRequesting] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [copyRequests, setCopyRequests] = useState<CopyRequest[]>([]);
  const [cancellingRequest, setCancellingRequest] = useState<string | null>(null);

  // Edit allocation state
  const [showEditAllocationModal, setShowEditAllocationModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<CopyRequest | null>(null);
  const [editAllocation, setEditAllocation] = useState(100);
  const [editCopyEnabled, setEditCopyEnabled] = useState(true);
  const [editingSaving, setEditingSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Data state
  const [traders, setTraders] = useState<TraderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [allocateAction, setAllocateAction] = useState<"allocate" | "deallocate">("allocate");

  // Dashboard tabs
  type DashboardTab = "overview" | "copied-trader" | "top-traders" | "requests" | "transactions";
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // Trader profile panel
  const [selectedTraderId, setSelectedTraderId] = useState<string | null>(null);

  // Stats from API
  const [stats, setStats] = useState<{
    totalCopyPnl: number;
    winRate: number;
    totalCopiedTrades: number;
    following: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, statsRes, tradersRes, requestsRes] = await Promise.all([
        fetch("/api/balance"),
        fetch("/api/stats?include=copyResults"),
        fetch("/api/traders"),
        fetch("/api/copy-requests"),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data.balance);
        setTransactions(data.transactions || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.stats) setStats(data.stats);
        // Use actual copy results from the database — real follower PnL
        if (data.copyResults) {
          const results: CopyResultRow[] = data.copyResults.map((r: Record<string, unknown>) => ({
            id: r.id,
            profitLoss: r.profitLoss,
            resultPercent: r.resultPercent,
            balanceBefore: r.balanceBefore,
            balanceAfter: r.balanceAfter,
            createdAt: r.createdAt,
            traderTrade: r.traderTrade,
          }));
          setCopyResults(results);
        }
      }
      if (tradersRes.ok) {
        const data = await tradersRes.json();
        setTraders(data.traders || []);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setCopyRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch follower data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (!document.hidden) fetchData();
    }, 30000);
    const handleVisibility = () => { if (!document.hidden) fetchData(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchData]);

  // ─── Wallet connection callback ───
  const handleWalletChange = useCallback((_connected: boolean) => {
    // Wallet connection state tracked by WalletConnectButton internally
  }, []);

  // ─── Balance operations ───
  const handleBalanceOperation = async (operation: string, action?: string) => {
    setModalError("");
    const amount = parseFloat(modalAmount);
    if (!amount || amount <= 0) {
      setModalError("Enter a valid positive amount");
      return;
    }

    // Deposits require wallet signature
    if (operation === "deposit") {
      if (!wagmiConnected || !wagmiAddress) {
        setModalError("Connect your wallet to deposit funds");
        return;
      }

      setModalLoading(true);
      try {
        const message = `CopyTrade Pro — Authorize Deposit\n\nAmount: $${amount.toFixed(2)}\nAddress: ${wagmiAddress}\nTimestamp: ${Date.now()}`;
        const signature = await signMessageAsync({ message });

        const res = await fetch("/api/balance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation,
            amount,
            signature,
            message,
            walletAddress: wagmiAddress,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setModalError(data.error || "Deposit failed");
          return;
        }
        setBalance(data.balance);
        setModalAmount("");
        setShowDepositModal(false);
        fetchData();
      } catch (err) {
        if (err instanceof Error && err.message.includes("User rejected")) {
          setModalError("Signature rejected — deposit cancelled");
        } else {
          setModalError("Signing failed. Please try again.");
        }
      } finally {
        setModalLoading(false);
      }
      return;
    }

    // Non-deposit operations (withdraw, allocate)
    setModalLoading(true);
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, amount, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Operation failed");
        return;
      }
      setBalance(data.balance);
      setModalAmount("");
      setShowDepositModal(false);
      setShowWithdrawModal(false);
      setShowAllocateModal(false);
      fetchData();
    } catch {
      setModalError("Network error. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Copy request handler ───
  const handleSendCopyRequest = async () => {
    setCopyError("");
    if (!copyTraderName.trim() || !copyTraderId.trim()) {
      setCopyError("Both trader name and trader ID are required");
      return;
    }
    setCopyRequesting(true);

    // Check if user already has an active (APPROVED or PENDING) copy relationship
    const activeRequest = copyRequests.find(r => r.status === "APPROVED" || r.status === "PENDING");
    if (activeRequest && activeRequest.traderId !== copyTraderId) {
      setCopyError(`You can only copy one trader at a time. You are currently ${activeRequest.status === "APPROVED" ? "copying" : "pending with"} ${activeRequest.trader.displayName}. Disconnect first to copy a different trader.`);
      setCopyRequesting(false);
      return;
    }
    try {
      const res = await fetch("/api/copy-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traderName: copyTraderName.trim(),
          traderId: copyTraderId.trim(),
          riskPercent: copyRiskPercent,
          message: copyMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCopyError(data.error || "Failed to send request");
        return;
      }
      setCopyTraderName("");
      setCopyTraderId("");
      setCopyMessage("");
      setShowCopyRequestModal(false);
      fetchData();
    } catch {
      setCopyError("Network error. Please try again.");
    } finally {
      setCopyRequesting(false);
    }
  };

  // ─── Cancel copy request ───
  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequest(requestId);
    try {
      const res = await fetch("/api/copy-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "CANCELLED" }),
      });
      if (res.ok) {
        setCopyRequests((prev) =>
          prev.map((r) => r.id === requestId ? { ...r, status: "CANCELLED" } : r)
        );
      }
    } catch {
      // silent
    } finally {
      setCancellingRequest(null);
    }
  };

  // ─── Edit allocation for a trader ───
  const handleOpenEditAllocation = async (req: CopyRequest) => {
    setEditingRequest(req);
    setEditAllocation(100);
    setEditCopyEnabled(true);
    setEditError("");
    setShowEditAllocationModal(true);

    // Fetch actual current follower settings
    try {
      const res = await fetch("/api/followers");
      if (res.ok) {
        const data = await res.json();
        const record = data.following?.find(
          (f: { traderId: string; allocationPercent: number; copyEnabled: boolean }) =>
            f.traderId === req.traderId
        );
        if (record) {
          setEditAllocation(record.allocationPercent);
          setEditCopyEnabled(record.copyEnabled);
        }
      }
    } catch {
      // Fallback to defaults if fetch fails
    }
  };

  const handleSaveAllocation = async () => {
    if (!editingRequest) return;
    setEditingSaving(true);
    setEditError("");
    try {
      const res = await fetch("/api/followers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traderId: editingRequest.traderId,
          allocationPercent: editAllocation,
          copyEnabled: editCopyEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update allocation");
        return;
      }
      setShowEditAllocationModal(false);
      setEditingRequest(null);
      // Refresh dashboard data so the UI reflects the change
      fetchData();
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditingSaving(false);
    }
  };

  // ─── Derived data ───
  const getRequestStatus = (traderId: string) => {
    return copyRequests.find((r) => r.traderId === traderId);
  };

  const pnlChartData =
    transactions.length > 0
      ? transactions
          .filter((t) => t.type === "COPY_PROFIT" || t.type === "COPY_LOSS")
          .reverse()
          .reduce(
            (acc, t) => {
              const cumPnl = (acc.length > 0 ? acc[acc.length - 1].pnl : 0) + t.amount;
              acc.push({
                date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                pnl: cumPnl,
              });
              return acc;
            },
            [] as { date: string; pnl: number }[]
          )
      : Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          pnl: 0,
        }));

  const filteredTraders = traders.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derive connected trader from approved copy request
  const approvedRequest = useMemo(
    () => copyRequests.find((r) => r.status === "APPROVED"),
    [copyRequests]
  );
  const connectedTrader = useMemo(
    () => (approvedRequest ? traders.find((t) => t.id === approvedRequest.traderId) : undefined),
    [approvedRequest, traders]
  );

  const tabs: { id: DashboardTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "copied-trader", label: "Copied Trader", icon: Copy },
    { id: "top-traders", label: "Top Traders", icon: Users },
    { id: "requests", label: "Requests", icon: ClipboardList },
    { id: "transactions", label: "Transactions", icon: History },
  ];

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="h-8 w-48 md:w-64 bg-surface-2 rounded animate-pulse" />
        <div className="stat-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-surface-2 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      {/* ═══ Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-text-primary">Copy Trading</h2>
          <p className="text-xs md:text-sm text-text-tertiary mt-0.5">Manage your balance and copy top traders</p>
        </div>
        <WalletConnectButton onConnectionChange={handleWalletChange} />
      </motion.div>

      {/* ═══ Hero Balance Card ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...pageTransition, delay: 0.08 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-brand-dark p-5 md:p-7 text-white shadow-2xl ring-1 ring-white/[0.08]"
      >
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-white/70 text-xs font-medium tracking-wide uppercase mb-1">Total Balance</p>
              <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">
                {formatCurrency(balance?.totalBalance ?? 0)}
              </p>
              {(balance?.totalProfit ?? 0) !== 0 && (
                <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${(balance?.totalProfit ?? 0) >= 0 ? "bg-white/20 text-white" : "bg-red-500/30 text-red-100"}`}>
                  {(balance?.totalProfit ?? 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {(balance?.totalProfit ?? 0) >= 0 ? "+" : ""}{formatCurrency(balance?.totalProfit ?? 0)} profit
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/deposit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-brand text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Deposit
              </Link>
              <button onClick={() => { setModalAmount(""); setModalError(""); setShowWithdrawModal(true); }} disabled={(balance?.availableBalance ?? 0) <= 0} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-colors backdrop-blur-sm disabled:opacity-40">
                <Minus className="w-3.5 h-3.5" /> Withdraw
              </button>
              <button onClick={() => { setModalAmount(""); setModalError(""); setAllocateAction("allocate"); setShowAllocateModal(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/15 text-white text-sm font-semibold hover:bg-white/25 transition-colors backdrop-blur-sm">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Allocate
              </button>
            </div>
          </div>

          {/* Balance breakdown strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/15">
            <div>
              <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Available</p>
              <p className="text-base md:text-lg font-bold tabular-nums mt-0.5">{formatCurrency(balance?.availableBalance ?? 0)}</p>
            </div>
            <div>
              <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Allocated</p>
              <p className="text-base md:text-lg font-bold tabular-nums mt-0.5">{formatCurrency(balance?.allocatedBalance ?? 0)}</p>
            </div>
            <div>
              <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Win Rate</p>
              <p className="text-base md:text-lg font-bold tabular-nums mt-0.5">{stats?.winRate ?? 0}%</p>
            </div>
            <div>
              <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Following</p>
              <p className="text-base md:text-lg font-bold tabular-nums mt-0.5">{stats?.following ?? 0} traders</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ Persistent Connected Trader Card (visible on all tabs) ═══ */}
      {connectedTrader && approvedRequest && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...pageTransition, delay: 0.1 }}
          className="glass-panel overflow-hidden"
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {connectedTrader.avatar ? (
                  <Image
                    src={connectedTrader.avatar}
                    alt={connectedTrader.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-surface-3"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {connectedTrader.name[0]}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-success border-2 border-surface-1" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text-primary">{connectedTrader.name}</h3>
                  <span className="flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-success/10 text-success font-medium border border-success/20">
                    <Zap className="w-2.5 h-2.5" />
                    Live
                  </span>
                </div>
                <p className="text-2xs text-text-tertiary mt-0.5">Connected trader portfolio</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Compact portfolio stats */}
              <div className="hidden md:flex items-center gap-5">
                <div className="text-right">
                  <p className="text-2xs text-text-tertiary">P&L</p>
                  <p className={`text-sm font-bold tabular-nums ${connectedTrader.pnl >= 0 ? "text-success" : "text-danger"}`}>
                    {connectedTrader.pnl >= 0 ? "+" : ""}{formatCurrency(connectedTrader.pnl)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-text-tertiary">Win Rate</p>
                  <p className="text-sm font-bold tabular-nums text-text-primary">{connectedTrader.winRate}%</p>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-text-tertiary">Trades</p>
                  <p className="text-sm font-bold tabular-nums text-text-primary">{connectedTrader.totalTrades}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-text-tertiary">Followers</p>
                  <p className="text-sm font-bold tabular-nums text-text-primary">{connectedTrader.followers}</p>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/dashboard/messages?userId=${approvedRequest.trader.userId}&name=${encodeURIComponent(connectedTrader.name)}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-secondary transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span className="hidden sm:inline">Message</span>
                </Link>
                <button
                  onClick={() => handleOpenEditAllocation(approvedRequest)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-xs font-medium text-text-secondary transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
                <button
                  onClick={() => setSelectedTraderId(connectedTrader.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/20 text-xs font-medium text-brand transition-colors"
                >
                  View Profile
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ Tab Navigation ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...pageTransition, delay: 0.12 }}
        className="flex items-center gap-1 p-1 rounded-xl bg-surface-1 border border-border overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-surface-2"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === "requests" && copyRequests.filter((r) => r.status === "PENDING").length > 0 && (
                <span className={`ml-1 w-4.5 h-4.5 text-2xs rounded-full flex items-center justify-center ${isActive ? "bg-white/20 text-white" : "bg-warning/10 text-warning"}`}>
                  {copyRequests.filter((r) => r.status === "PENDING").length}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* ═══ TAB: Overview ═══ */}
      {activeTab === "overview" && (
        <>
          {/* Copy Stats Row */}
          <div className="stat-grid-3">
            <StatCard
              title="Copied Trades"
              value={String(stats?.totalCopiedTrades ?? 0)}
              icon={Copy}
              iconColor="text-brand"
              delay={0.12}
            />
            <StatCard
              title="Copy Win Rate"
              value={`${stats?.winRate ?? 0}%`}
              icon={BarChart3}
              iconColor="text-info"
              delay={0.15}
            />
            <StatCard
              title="Total Copy P&L"
              value={formatCurrency(stats?.totalCopyPnl ?? 0)}
              changeType={(stats?.totalCopyPnl ?? 0) >= 0 ? "positive" : "negative"}
              icon={TrendingUp}
              iconColor={(stats?.totalCopyPnl ?? 0) >= 0 ? "text-success" : "text-danger"}
              delay={0.18}
            />
          </div>

          {/* PnL Chart */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...pageTransition, delay: 0.2 }}
            className="glass-panel overflow-hidden"
          >
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand/10">
                  <BarChart3 className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Copy Trading Performance</h3>
                  <p className="text-2xs text-text-tertiary mt-0.5">Cumulative P&L from copied trades</p>
                </div>
              </div>
              {pnlChartData.length > 0 && (
                <span className={`text-sm font-bold tabular-nums ${(pnlChartData[pnlChartData.length - 1]?.pnl ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                  {(pnlChartData[pnlChartData.length - 1]?.pnl ?? 0) >= 0 ? "+" : ""}{formatCurrency(pnlChartData[pnlChartData.length - 1]?.pnl ?? 0)}
                </span>
              )}
            </div>
            <div className="px-4 pb-4">
              <PnlChart data={pnlChartData} height={260} showGrid />
            </div>
          </motion.div>

          {/* Recent Copied Trades (compact) */}
          {copyResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...pageTransition, delay: 0.25 }}
              className="glass-panel overflow-hidden"
            >
              <div className="px-5 py-3 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-brand/10">
                    <Copy className="w-3.5 h-3.5 text-brand" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">Recent Copied Trades</h3>
                </div>
                <button
                  onClick={() => setActiveTab("copied-trader")}
                  className="text-2xs text-brand hover:text-brand-dark transition-colors font-medium flex items-center gap-0.5"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {copyResults.slice(0, 5).map((result) => (
                  <div key={result.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface-2/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${result.profitLoss >= 0 ? "bg-success/10" : "bg-danger/10"}`}>
                        {result.profitLoss >= 0 ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-danger" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{result.traderTrade.tradeName}</p>
                        <p className="text-2xs text-text-tertiary">{result.traderTrade.market} · {timeAgo(result.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold tabular-nums ${result.profitLoss >= 0 ? "text-success" : "text-danger"}`}>
                        {result.profitLoss >= 0 ? "+" : ""}{formatCurrency(result.profitLoss)}
                      </p>
                      <p className={`text-2xs tabular-nums ${result.resultPercent >= 0 ? "text-success/70" : "text-danger/70"}`}>
                        {result.resultPercent >= 0 ? "+" : ""}{result.resultPercent}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ═══ TAB: Copied Trader ═══ */}
      {activeTab === "copied-trader" && (
        <>
          {connectedTrader && approvedRequest ? (
            <>
              {/* Trader Hero Card */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...pageTransition, delay: 0.12 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/90 via-brand/80 to-purple-700/90 p-6 md:p-8 text-white shadow-2xl ring-1 ring-white/[0.08]"
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {connectedTrader.avatar ? (
                      <Image
                        src={connectedTrader.avatar}
                        alt={connectedTrader.name}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-2xl object-cover ring-3 ring-white/20 shadow-xl"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold ring-3 ring-white/20 shadow-xl">
                        {connectedTrader.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-success border-3 border-indigo-600 flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Trader info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl md:text-2xl font-bold truncate">{connectedTrader.name}</h2>
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-success/20 text-emerald-200 font-medium border border-success/30">
                        <Activity className="w-3 h-3" />
                        Live Trading
                      </span>
                    </div>
                    <p className="text-white/60 text-sm mt-1">Master Trader · {connectedTrader.followers} followers · {connectedTrader.totalTrades} trades</p>

                    {/* Quick stats inline */}
                    <div className="flex items-center gap-6 mt-3">
                      <div>
                        <p className="text-white/50 text-2xs font-medium uppercase tracking-wider">P&L</p>
                        <p className={`text-lg font-bold tabular-nums ${connectedTrader.pnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                          {connectedTrader.pnl >= 0 ? "+" : ""}{formatCurrency(connectedTrader.pnl)}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-white/15" />
                      <div>
                        <p className="text-white/50 text-2xs font-medium uppercase tracking-wider">Win Rate</p>
                        <p className="text-lg font-bold tabular-nums text-white">{connectedTrader.winRate}%</p>
                      </div>
                      <div className="w-px h-8 bg-white/15" />
                      <div>
                        <p className="text-white/50 text-2xs font-medium uppercase tracking-wider">Trades</p>
                        <p className="text-lg font-bold tabular-nums text-white">{connectedTrader.totalTrades}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row md:flex-col gap-2">
                    <button
                      onClick={() => setSelectedTraderId(connectedTrader.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-brand text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm"
                    >
                      View Full Profile
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/dashboard/messages?userId=${approvedRequest.trader.userId}&name=${encodeURIComponent(connectedTrader.name)}`}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors backdrop-blur-sm"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </Link>
                  </div>
                </div>
              </motion.div>

              {/* Performance Comparison Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Trader's Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...pageTransition, delay: 0.18 }}
                  className="glass-panel overflow-hidden"
                >
                  <div className="px-5 py-3.5 border-b border-border flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-brand/10">
                      <Trophy className="w-4 h-4 text-brand" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{connectedTrader.name}&apos;s Portfolio</h3>
                      <p className="text-2xs text-text-tertiary">Trader&apos;s overall performance</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-1 border border-border">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${connectedTrader.pnl >= 0 ? "bg-success/10" : "bg-danger/10"}`}>
                          {connectedTrader.pnl >= 0 ? <TrendingUp className="w-4.5 h-4.5 text-success" /> : <TrendingDown className="w-4.5 h-4.5 text-danger" />}
                        </div>
                        <div>
                          <p className="text-xs text-text-tertiary">Total P&L</p>
                          <p className={`text-base font-bold tabular-nums ${connectedTrader.pnl >= 0 ? "text-success" : "text-danger"}`}>
                            {connectedTrader.pnl >= 0 ? "+" : ""}{formatCurrency(connectedTrader.pnl)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-surface-1 border border-border text-center">
                        <Target className="w-4 h-4 text-info mx-auto mb-1.5" />
                        <p className="text-lg font-bold tabular-nums text-text-primary">{connectedTrader.winRate}%</p>
                        <p className="text-2xs text-text-tertiary mt-0.5">Win Rate</p>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-1 border border-border text-center">
                        <BarChart3 className="w-4 h-4 text-brand mx-auto mb-1.5" />
                        <p className="text-lg font-bold tabular-nums text-text-primary">{connectedTrader.totalTrades}</p>
                        <p className="text-2xs text-text-tertiary mt-0.5">Total Trades</p>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-1 border border-border text-center">
                        <Users className="w-4 h-4 text-warning mx-auto mb-1.5" />
                        <p className="text-lg font-bold tabular-nums text-text-primary">{connectedTrader.followers}</p>
                        <p className="text-2xs text-text-tertiary mt-0.5">Followers</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Your Copy Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...pageTransition, delay: 0.22 }}
                  className="glass-panel overflow-hidden"
                >
                  <div className="px-5 py-3.5 border-b border-border flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-success/10">
                      <Star className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Your Copy Performance</h3>
                      <p className="text-2xs text-text-tertiary">Your results from copying {connectedTrader.name}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-1 border border-border">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${(stats?.totalCopyPnl ?? 0) >= 0 ? "bg-success/10" : "bg-danger/10"}`}>
                          {(stats?.totalCopyPnl ?? 0) >= 0 ? <TrendingUp className="w-4.5 h-4.5 text-success" /> : <TrendingDown className="w-4.5 h-4.5 text-danger" />}
                        </div>
                        <div>
                          <p className="text-xs text-text-tertiary">Your Total P&L</p>
                          <p className={`text-base font-bold tabular-nums ${(stats?.totalCopyPnl ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                            {(stats?.totalCopyPnl ?? 0) >= 0 ? "+" : ""}{formatCurrency(stats?.totalCopyPnl ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-surface-1 border border-border text-center">
                        <Copy className="w-4 h-4 text-brand mx-auto mb-1.5" />
                        <p className="text-lg font-bold tabular-nums text-text-primary">{stats?.totalCopiedTrades ?? 0}</p>
                        <p className="text-2xs text-text-tertiary mt-0.5">Copied</p>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-1 border border-border text-center">
                        <Target className="w-4 h-4 text-info mx-auto mb-1.5" />
                        <p className="text-lg font-bold tabular-nums text-text-primary">{stats?.winRate ?? 0}%</p>
                        <p className="text-2xs text-text-tertiary mt-0.5">Win Rate</p>
                      </div>
                      <div className="p-3 rounded-xl bg-surface-1 border border-border text-center">
                        <Wallet className="w-4 h-4 text-warning mx-auto mb-1.5" />
                        <p className="text-lg font-bold tabular-nums text-text-primary">{formatCurrency(balance?.allocatedBalance ?? 0)}</p>
                        <p className="text-2xs text-text-tertiary mt-0.5">Allocated</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* PnL Chart — Full Width */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...pageTransition, delay: 0.26 }}
                className="glass-panel overflow-hidden"
              >
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-brand/10">
                      <BarChart3 className="w-4 h-4 text-brand" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">Copy P&L History</h3>
                      <p className="text-2xs text-text-tertiary mt-0.5">Your cumulative returns from copying {connectedTrader.name}</p>
                    </div>
                  </div>
                  {pnlChartData.length > 1 && (
                    <span className={`text-sm font-bold tabular-nums ${(pnlChartData[pnlChartData.length - 1]?.pnl ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                      {(pnlChartData[pnlChartData.length - 1]?.pnl ?? 0) >= 0 ? "+" : ""}{formatCurrency(pnlChartData[pnlChartData.length - 1]?.pnl ?? 0)}
                    </span>
                  )}
                </div>
                <div className="px-4 pb-4">
                  <PnlChart data={pnlChartData} height={300} showGrid />
                </div>
              </motion.div>

              {/* All Copied Trades */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...pageTransition, delay: 0.3 }}
                className="glass-panel overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-brand/10">
                      <Copy className="w-3.5 h-3.5 text-brand" />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary">All Copied Trades</h3>
                  </div>
                  <span className="text-2xs text-text-tertiary">{copyResults.length} total</span>
                </div>
                {copyResults.length > 0 ? (
                  <div className="divide-y divide-border">
                    {copyResults.map((result) => (
                      <div key={result.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-surface-2/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${result.profitLoss >= 0 ? "bg-success/10" : "bg-danger/10"}`}>
                            {result.profitLoss >= 0 ? <ArrowUpRight className="w-4 h-4 text-success" /> : <ArrowDownRight className="w-4 h-4 text-danger" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-text-primary">{result.traderTrade.tradeName}</p>
                              <span className="text-2xs px-1.5 py-0.5 rounded bg-surface-2 text-text-tertiary font-medium">{result.traderTrade.market}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {connectedTrader.avatar ? (
                                <Image src={connectedTrader.avatar} alt="" width={14} height={14} className="w-3.5 h-3.5 rounded-full object-cover" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full bg-brand/20 flex items-center justify-center text-brand text-[8px] font-bold">{connectedTrader.name[0]}</div>
                              )}
                              <p className="text-2xs text-text-tertiary">{connectedTrader.name} · {timeAgo(result.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold tabular-nums ${result.profitLoss >= 0 ? "text-success" : "text-danger"}`}>
                            {result.profitLoss >= 0 ? "+" : ""}{formatCurrency(result.profitLoss)}
                          </p>
                          <p className={`text-2xs tabular-nums ${result.resultPercent >= 0 ? "text-success/70" : "text-danger/70"}`}>
                            {result.resultPercent >= 0 ? "+" : ""}{result.resultPercent}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-2 to-surface-3 border border-border shadow-sm">
                      <Copy className="w-10 h-10 text-text-tertiary/40" />
                    </div>
                    <p className="text-sm text-text-tertiary">No copied trades yet</p>
                    <p className="text-xs text-text-tertiary/70">Trades will appear here once {connectedTrader.name} executes trades</p>
                  </div>
                )}
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...pageTransition, delay: 0.15 }}
              className="glass-panel p-10 flex flex-col items-center text-center"
            >
              <div className="p-6 rounded-3xl bg-gradient-to-br from-brand/5 to-purple-500/5 border border-brand/10 shadow-sm mb-5">
                <Copy className="w-14 h-14 text-brand/30" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Copied Trader</h3>
              <p className="text-sm text-text-tertiary max-w-md">
                You haven&apos;t connected with a trader yet. Browse top traders, review their performance, and send a copy request to get started.
              </p>
              <button
                onClick={() => setActiveTab("top-traders")}
                className="btn-primary mt-5 gap-2 px-6 py-2.5"
              >
                <Users className="w-4 h-4" />
                Browse Top Traders
              </button>
            </motion.div>
          )}
        </>
      )}

      {/* ═══ TAB: Top Traders ═══ */}
      {activeTab === "top-traders" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...pageTransition, delay: 0.15 }}
          className="glass-panel overflow-hidden"
        >
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand/10">
                <Zap className="w-3.5 h-3.5 text-brand" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Top Traders</h3>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search traders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field text-xs py-1.5 pl-8 pr-3 w-48"
              />
            </div>
          </div>
          <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTraders.length > 0 ? (
              filteredTraders.map((trader) => {
                const request = getRequestStatus(trader.id);
                const isApproved = request?.status === "APPROVED";
                const isPending = request?.status === "PENDING";
                const hasActiveElsewhere = copyRequests.find(r => (r.status === "APPROVED" || r.status === "PENDING") && r.traderId !== trader.id);

                return (
                  <div
                    key={trader.id}
                    onClick={() => setSelectedTraderId(trader.id)}
                    className="p-3 rounded-xl border border-border bg-surface-1 hover:bg-surface-2 hover:border-border-light hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        {trader.avatar ? (
                          <Image
                            src={trader.avatar}
                            alt={trader.name}
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-surface-3"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {trader.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-text-primary group-hover:text-brand transition-colors">{trader.name}</p>
                          <p className="text-2xs text-text-tertiary">{trader.followers} followers · {trader.totalTrades} trades</p>
                        </div>
                      </div>
                      {isApproved ? (
                        <span className="flex items-center gap-1 text-2xs px-2 py-1 rounded-full bg-success/10 text-success font-medium border border-success/20">
                          <CheckCircle2 className="w-3 h-3" /> Copying
                        </span>
                      ) : isPending ? (
                        <span className="flex items-center gap-1 text-2xs px-2 py-1 rounded-full bg-warning/10 text-warning font-medium border border-warning/20">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : hasActiveElsewhere ? (
                        <span className="flex items-center gap-1 text-2xs px-2 py-1 rounded-full bg-surface-3 text-text-tertiary font-medium border border-border cursor-not-allowed">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCopyTraderName(trader.name);
                            setCopyTraderId(trader.id);
                            setCopyMessage("");
                            setCopyError("");
                            setShowCopyRequestModal(true);
                          }}
                          className="flex items-center gap-1 text-2xs px-2.5 py-1 rounded-full bg-brand text-white hover:bg-brand-dark transition-colors font-medium shadow-sm"
                        >
                          <UserPlus className="w-3 h-3" /> Copy
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-2xs pt-2 border-t border-border/50">
                      <span className={`font-semibold ${trader.pnl >= 0 ? "text-success" : "text-danger"}`}>
                        {trader.pnl >= 0 ? "+" : ""}{formatCurrency(trader.pnl, 0)} PnL
                      </span>
                      <span className="text-text-tertiary font-medium">{trader.winRate}% win rate</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full flex flex-col items-center gap-2 py-12">
                <Search className="w-8 h-8 text-text-tertiary/40" />
                <p className="text-sm text-text-tertiary">No traders found</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══ TAB: Requests ═══ */}
      {activeTab === "requests" && (
        <>
      {/* ═══ Copy Trading Access — Request form ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...pageTransition, delay: 0.2 }}
        className="glass-panel p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand/10">
              <UserPlus className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Request Copy Access</h3>
              <p className="text-xs text-text-tertiary mt-0.5">Enter a trader&apos;s name and ID to request access</p>
            </div>
          </div>
          <button
            onClick={() => {
              setCopyTraderName("");
              setCopyTraderId("");
              setCopyMessage("");
              setCopyError("");
              setShowCopyRequestModal(true);
            }}
            className="btn-primary text-sm gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            New Request
          </button>
        </div>

        {/* Active copy requests */}
        {copyRequests.length > 0 && (
          <div className="space-y-2 mt-3">
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">Your Requests</p>
            {copyRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-1 border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-xs font-semibold">
                    {req.trader.displayName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{req.trader.displayName}</p>
                    <p className="text-2xs text-text-tertiary font-mono">{req.traderId.slice(0, 8)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === "PENDING" && (
                    <>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 border border-warning/20 text-xs font-medium text-warning">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                      <button
                        onClick={() => handleCancelRequest(req.id)}
                        disabled={cancellingRequest === req.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-danger/10 hover:bg-danger/20 border border-danger/20 text-xs font-medium text-danger transition-colors disabled:opacity-50"
                      >
                        {cancellingRequest === req.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Cancel
                      </button>
                    </>
                  )}
                  {req.status === "APPROVED" && (
                    <>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20 text-xs font-medium text-success">
                        <CheckCircle2 className="w-3 h-3" />
                        Approved
                      </span>
                      <button
                        onClick={() => handleOpenEditAllocation(req)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand/10 hover:bg-brand/20 border border-brand/20 text-xs font-medium text-brand transition-colors"
                      >
                        <Settings className="w-3 h-3" />
                        Edit Allocation
                      </button>
                    </>
                  )}
                  {req.status === "REJECTED" && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/10 border border-danger/20 text-xs font-medium text-danger">
                      <XCircle className="w-3 h-3" />
                      Rejected
                    </span>
                  )}
                  {req.status === "CANCELLED" && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-text-tertiary/10 border border-text-tertiary/20 text-xs font-medium text-text-tertiary">
                      <XCircle className="w-3 h-3" />
                      Cancelled
                    </span>
                  )}
                  <span className="text-2xs text-text-tertiary">{timeAgo(req.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {copyRequests.length === 0 && (
          <div className="flex flex-col items-center text-center py-6 border border-dashed border-border rounded-lg mt-2">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-2 to-surface-3 border border-border shadow-sm mb-3">
              <UserPlus className="w-10 h-10 text-text-tertiary/40" />
            </div>
            <p className="text-sm text-text-tertiary">No copy requests yet</p>
            <p className="text-xs text-text-tertiary/70 mt-1">Send a request to a master trader to start copying trades</p>
          </div>
        )}
      </motion.div>

        </>
      )}

      {/* ═══ TAB: Transactions ═══ */}
      {activeTab === "transactions" && (
        <>
      {/* ═══ Recent Transactions ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...pageTransition, delay: 0.4 }}
        className="glass-panel overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand/10">
              <Wallet className="w-3.5 h-3.5 text-brand" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">Recent Transactions</h3>
          </div>
          {transactions.length > 10 && (
            <Link href="/dashboard/history" className="text-2xs text-brand hover:text-brand-dark transition-colors font-medium flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        <div className="divide-y divide-border">
          {transactions.length > 0 ? (
            transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="px-4 py-3 flex items-center justify-between hover:bg-surface-1/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${
                    tx.type === "DEPOSIT" || tx.type === "COPY_PROFIT" ? "bg-success/10" :
                    tx.type === "WITHDRAWAL" || tx.type === "COPY_LOSS" ? "bg-danger/10" :
                    "bg-brand/10"
                  }`}>
                    {tx.type === "DEPOSIT" || tx.type === "COPY_PROFIT" ? (
                      <TrendingUp className={`w-3.5 h-3.5 ${tx.type === "DEPOSIT" ? "text-success" : "text-success"}`} />
                    ) : tx.type === "WITHDRAWAL" || tx.type === "COPY_LOSS" ? (
                      <TrendingDown className="w-3.5 h-3.5 text-danger" />
                    ) : (
                      <ArrowRightLeft className="w-3.5 h-3.5 text-brand" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{txTypeLabel(tx.type)}</p>
                    {tx.description && (
                      <p className="text-2xs text-text-tertiary">{tx.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${txTypeColor(tx.type)}`}>
                    {tx.amount >= 0 ? "+" : ""}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-2xs text-text-tertiary">{timeAgo(tx.createdAt)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-surface-2 to-surface-3 border border-border shadow-sm">
                <Wallet className="w-10 h-10 text-text-tertiary/40" />
              </div>
              <div className="text-center">
                <p className="text-sm text-text-tertiary">No transactions yet</p>
                <p className="text-xs text-text-tertiary/70 mt-1">Your deposits, withdrawals, and trading activity will appear here</p>
              </div>
              <Link href="/dashboard/payment-methods" className="btn-primary btn-sm mt-4">
                Make a Deposit
              </Link>
            </div>
          )}
        </div>
      </motion.div>
        </>
      )}

      {/* ═══ Deposit Modal ═══ */}
      <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title="Deposit Funds" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-brand/5 border border-brand/10">
            <ShieldCheck className="w-4 h-4 text-brand shrink-0" />
            <p className="text-xs text-text-secondary">
              Deposits require a <strong>wallet signature</strong> to verify authorization. Your private keys never leave your wallet.
            </p>
          </div>
          {!wagmiConnected && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <Lock className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs text-warning">Connect your wallet before depositing.</p>
            </div>
          )}
          {modalError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
              <XCircle className="w-4 h-4 text-danger shrink-0" />
              <p className="text-xs text-danger">{modalError}</p>
            </div>
          )}
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Amount (USD)</label>
            <input
              type="number"
              value={modalAmount}
              onChange={(e) => setModalAmount(e.target.value)}
              placeholder="0.00"
              className="input-field text-lg font-semibold"
              min={1}
              step={0.01}
            />
          </div>
          <div className="flex gap-2">
            {[100, 500, 1000, 5000].map((amt) => (
              <button
                key={amt}
                onClick={() => setModalAmount(String(amt))}
                className="flex-1 py-1.5 text-xs rounded-lg bg-surface-3 hover:bg-surface-4 text-text-secondary transition-colors"
              >
                ${amt.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowDepositModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => handleBalanceOperation("deposit")}
              disabled={modalLoading || !wagmiConnected}
              className="btn-primary flex-1 gap-2"
            >
              {modalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {modalLoading ? "Sign & Deposit..." : "Sign & Deposit"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ Withdraw Modal ═══ */}
      <Modal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} title="Withdraw Funds" size="sm">
        <div className="space-y-4">
          <p className="text-xs text-text-tertiary">
            Withdraw from your available balance. Current available: <strong>{formatCurrency(balance?.availableBalance ?? 0)}</strong>
          </p>
          {modalError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
              <XCircle className="w-4 h-4 text-danger shrink-0" />
              <p className="text-xs text-danger">{modalError}</p>
            </div>
          )}
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Amount (USD)</label>
            <input
              type="number"
              value={modalAmount}
              onChange={(e) => setModalAmount(e.target.value)}
              placeholder="0.00"
              className="input-field text-lg font-semibold"
              min={1}
              max={balance?.availableBalance ?? 0}
              step={0.01}
            />
          </div>
          <button
            onClick={() => setModalAmount(String(balance?.availableBalance ?? 0))}
            className="text-xs text-brand hover:text-brand-light transition-colors"
          >
            Withdraw All
          </button>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowWithdrawModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => handleBalanceOperation("withdraw")}
              disabled={modalLoading}
              className="btn-primary flex-1 gap-2"
            >
              {modalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minus className="w-3.5 h-3.5" />}
              {modalLoading ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ Allocate / Deallocate Modal ═══ */}
      <Modal isOpen={showAllocateModal} onClose={() => setShowAllocateModal(false)} title="Manage Allocation" size="sm">
        <div className="space-y-4">
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setAllocateAction("allocate")}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                allocateAction === "allocate"
                  ? "bg-brand text-white"
                  : "bg-surface-1 text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Allocate
            </button>
            <button
              onClick={() => setAllocateAction("deallocate")}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                allocateAction === "deallocate"
                  ? "bg-brand text-white"
                  : "bg-surface-1 text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Deallocate
            </button>
          </div>
          <p className="text-xs text-text-tertiary">
            {allocateAction === "allocate"
              ? `Move funds from available to copy trading. Available: ${formatCurrency(balance?.availableBalance ?? 0)}`
              : `Move funds from copy trading back to available. Allocated: ${formatCurrency(balance?.allocatedBalance ?? 0)}`}
          </p>
          {modalError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
              <XCircle className="w-4 h-4 text-danger shrink-0" />
              <p className="text-xs text-danger">{modalError}</p>
            </div>
          )}
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Amount (USD)</label>
            <input
              type="number"
              value={modalAmount}
              onChange={(e) => setModalAmount(e.target.value)}
              placeholder="0.00"
              className="input-field text-lg font-semibold"
              min={1}
              step={0.01}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowAllocateModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={() => handleBalanceOperation("allocate", allocateAction)}
              disabled={modalLoading}
              className="btn-primary flex-1 gap-2"
            >
              {modalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
              {modalLoading ? "Processing..." : allocateAction === "allocate" ? "Allocate" : "Deallocate"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ Copy Request Modal ═══ */}
      <Modal isOpen={showCopyRequestModal} onClose={() => { setShowCopyRequestModal(false); setCopyError(""); }} title="Request Copy Trading Access">
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-brand/5 border border-brand/10">
            <p className="text-xs text-text-secondary">
              Enter the exact <strong>Trader Name</strong> and <strong>Trader ID</strong>. The trader must approve your request before trades are copied.
            </p>
          </div>

          {copyError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
              <XCircle className="w-4 h-4 text-danger shrink-0" />
              <p className="text-xs text-danger">{copyError}</p>
            </div>
          )}

          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Trader Name</label>
            <input
              type="text"
              value={copyTraderName}
              onChange={(e) => setCopyTraderName(e.target.value)}
              placeholder="e.g. AlphaTrader"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Trader ID</label>
            <input
              type="text"
              value={copyTraderId}
              onChange={(e) => setCopyTraderId(e.target.value)}
              placeholder="e.g. a1b2c3d4-e5f6-..."
              className="input-field font-mono text-xs"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Allocation (%)</label>
            <input
              type="number"
              value={copyRiskPercent}
              onChange={(e) => setCopyRiskPercent(parseFloat(e.target.value) || 2)}
              className="input-field"
              min={1}
              max={100}
              step={1}
            />
            <p className="text-2xs text-text-tertiary mt-1">% of your allocated balance used for this trader</p>
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Message (optional)</label>
            <textarea
              value={copyMessage}
              onChange={(e) => setCopyMessage(e.target.value)}
              placeholder="Introduce yourself..."
              className="input-field resize-none h-16"
              maxLength={500}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => { setShowCopyRequestModal(false); setCopyError(""); }} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={handleSendCopyRequest}
              disabled={copyRequesting}
              className="btn-primary flex-1 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copyRequesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {copyRequesting ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ Edit Allocation Modal ═══ */}
      <Modal
        isOpen={showEditAllocationModal}
        onClose={() => { setShowEditAllocationModal(false); setEditingRequest(null); setEditError(""); }}
        title="Edit Trade Allocation"
      >
        <div className="space-y-5">
          {editingRequest && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-1 border border-border">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-light flex items-center justify-center text-white text-sm font-semibold">
                {editingRequest.trader.displayName[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{editingRequest.trader.displayName}</p>
                <p className="text-2xs text-text-tertiary font-mono">{editingRequest.traderId.slice(0, 12)}...</p>
              </div>
            </div>
          )}

          {editError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
              <XCircle className="w-4 h-4 text-danger shrink-0" />
              <p className="text-xs text-danger">{editError}</p>
            </div>
          )}

          {/* Allocation Percent */}
          <div>
            <label className="text-sm text-text-secondary mb-1.5 block">Capital Allocation (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={editAllocation}
                onChange={(e) => setEditAllocation(parseInt(e.target.value))}
                className="flex-1 accent-brand"
              />
              <input
                type="number"
                value={editAllocation}
                onChange={(e) => setEditAllocation(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className="input-field w-20 text-center text-sm font-semibold"
                min={1}
                max={100}
              />
            </div>
            <p className="text-2xs text-text-tertiary mt-1.5">
              {editAllocation}% of your allocated balance will be used when this trader executes trades.
              {balance && (
                <span className="text-text-secondary font-medium">
                  {" "}≈ {formatCurrency(balance.allocatedBalance * (editAllocation / 100))} of {formatCurrency(balance.allocatedBalance)} allocated
                </span>
              )}
            </p>
          </div>

          {/* Copy Enabled Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-1 border border-border">
            <div>
              <p className="text-sm font-medium text-text-primary">Copy Trading Active</p>
              <p className="text-2xs text-text-tertiary mt-0.5">
                {editCopyEnabled ? "Trades from this trader will be copied" : "Copying is paused — no new trades will be copied"}
              </p>
            </div>
            <button
              onClick={() => setEditCopyEnabled(!editCopyEnabled)}
              className="text-2xl transition-colors"
            >
              {editCopyEnabled ? (
                <ToggleRight className="w-8 h-8 text-success" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-text-tertiary" />
              )}
            </button>
          </div>

          {/* Preset buttons */}
          <div>
            <label className="text-2xs text-text-tertiary mb-1.5 block">Quick presets</label>
            <div className="flex flex-wrap gap-2">
              {[10, 25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setEditAllocation(pct)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    editAllocation === pct
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border bg-surface-2 text-text-tertiary hover:text-text-secondary hover:border-border-light"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setShowEditAllocationModal(false); setEditingRequest(null); setEditError(""); }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAllocation}
              disabled={editingSaving}
              className="btn-primary flex-1 gap-2 disabled:opacity-50"
            >
              {editingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {editingSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ═══ Trader Profile Slide-in Panel ═══ */}
      <TraderProfilePanel
        traderId={selectedTraderId}
        onClose={() => setSelectedTraderId(null)}
        onRequestCopy={(traderId, traderName) => {
          setSelectedTraderId(null);
          setCopyTraderName(traderName);
          setCopyTraderId(traderId);
          setCopyMessage("");
          setCopyError("");
          setShowCopyRequestModal(true);
        }}
      />
    </div>
  );
}
