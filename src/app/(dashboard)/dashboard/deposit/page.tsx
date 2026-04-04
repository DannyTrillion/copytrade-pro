"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Bitcoin,
  CreditCard,
  FileText,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Wallet,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  DollarSign,
  Info,
  X,
  ExternalLink,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Shield,
  Zap,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StripeCardForm } from "@/components/payment/stripe-card-form";
import { SolanaPayForm } from "@/components/payment/solana-pay-form";
import { SuiSlushForm } from "@/components/payment/sui-slush-form";
import { toast } from "@/components/ui/toast";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { useRouter } from "next/navigation";

// ─── Types ───
interface DepositRequest {
  id: string;
  amount: number;
  method: string;
  coin: string | null;
  network: string | null;
  txHash: string | null;
  proofUrl: string | null;
  cardRef: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  status: string;
  createdAt: string;
}

interface DepositSummary {
  totalDeposited: number;
  pendingAmount: number;
  pendingCount: number;
  lastDepositDate: string | null;
  lastDepositAmount: number | null;
}

// ─── Coins with multi-network support ───
interface CoinNetwork { network: string; label: string; }
interface CoinOption { id: string; name: string; symbol: string; networks: CoinNetwork[]; }

const COINS: CoinOption[] = [
  { id: "BTC", name: "Bitcoin", symbol: "BTC", networks: [{ network: "Bitcoin", label: "Bitcoin" }] },
  { id: "ETH", name: "Ethereum", symbol: "ETH", networks: [{ network: "ERC20", label: "ERC20" }] },
  { id: "USDT", name: "Tether", symbol: "USDT", networks: [
    { network: "ERC20", label: "ERC20 (Ethereum)" },
    { network: "TRC20", label: "TRC20 (Tron)" },
    { network: "BEP20", label: "BEP20 (BSC)" },
    { network: "SOL", label: "Solana" },
  ]},
  { id: "USDC", name: "USD Coin", symbol: "USDC", networks: [
    { network: "ERC20", label: "ERC20 (Ethereum)" },
    { network: "TRC20", label: "TRC20 (Tron)" },
    { network: "BEP20", label: "BEP20 (BSC)" },
    { network: "SOL", label: "Solana" },
  ]},
  { id: "BNB", name: "BNB", symbol: "BNB", networks: [{ network: "BEP20", label: "BEP20 (BSC)" }] },
  { id: "SOL", name: "Solana", symbol: "SOL", networks: [{ network: "Solana", label: "Solana" }] },
  { id: "TRX", name: "TRON", symbol: "TRX", networks: [{ network: "TRC20", label: "TRC20" }] },
  { id: "SUI", name: "SUI", symbol: "SUI", networks: [{ network: "SUI", label: "SUI" }] },
];

const METHOD_TABS = [
  { id: "CRYPTO", label: "Send Crypto", icon: Bitcoin },
  { id: "SOLANA_PAY", label: "Solana Pay", icon: Zap },
  { id: "SUI_SLUSH", label: "SUI / Slush", icon: Wallet },
  { id: "CARD", label: "Card Payment", icon: CreditCard },
  { id: "BUY_CRYPTO", label: "Buy Crypto", icon: DollarSign },
  { id: "CHEQUE", label: "Cheque", icon: FileText },
];

const AMOUNT_PRESETS = [50, 100, 250, 500, 1000, 5000];

const STATUS_STYLES: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  PENDING: { icon: Clock, color: "text-warning bg-warning/10" },
  CONFIRMED: { icon: CheckCircle2, color: "text-success bg-success/10" },
  REJECTED: { icon: XCircle, color: "text-danger bg-danger/10" },
};

// ─── On-ramp providers ───
const ONRAMP_PROVIDERS = [
  {
    id: "moonpay" as const,
    name: "MoonPay",
    description: "Card, Apple Pay, Google Pay, Bank Transfer",
    features: ["Visa / Mastercard", "Apple Pay", "Google Pay", "Bank Transfer"],
    color: "from-purple-500/20 to-indigo-500/20",
    borderColor: "border-purple-500/30",
    url: "https://www.moonpay.com/buy",
  },
  {
    id: "transak" as const,
    name: "Transak",
    description: "Card, Bank Transfer, 100+ payment methods",
    features: ["Visa / Mastercard", "Bank Transfer", "100+ methods", "150+ countries"],
    color: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
    url: "https://global.transak.com",
  },
  {
    id: "coinbase" as const,
    name: "Coinbase Pay",
    description: "Pay with Coinbase account or card",
    features: ["Coinbase Account", "Debit Card", "Apple Pay", "Instant"],
    color: "from-blue-600/20 to-blue-400/20",
    borderColor: "border-blue-600/30",
    url: "https://www.coinbase.com/price",
  },
  {
    id: "crypto_com" as const,
    name: "Crypto.com Pay",
    description: "Pay with Crypto.com app, Visa card, or crypto balance",
    features: ["Crypto.com Card", "CRO Pay", "Visa / Mastercard", "100+ cryptos"],
    color: "from-blue-700/20 to-indigo-400/20",
    borderColor: "border-blue-700/30",
    url: "https://crypto.com/app",
  },
  {
    id: "ramp" as const,
    name: "Ramp Network",
    description: "Open banking, card, Apple Pay — best rates",
    features: ["Open Banking", "Visa / Mastercard", "Apple Pay", "Low fees"],
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    url: "https://ramp.network/buy",
  },
  {
    id: "banxa" as const,
    name: "Banxa",
    description: "Buy crypto with card, PayID, bank transfer",
    features: ["Visa / Mastercard", "PayID", "Bank Transfer", "SEPA"],
    color: "from-orange-500/20 to-amber-500/20",
    borderColor: "border-orange-500/30",
    url: "https://banxa.com",
  },
];

type DepositStep = "form" | "confirm";
type OnrampProvider = "moonpay" | "transak" | "coinbase" | "crypto_com" | "ramp" | "banxa";

export default function DepositPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [summary, setSummary] = useState<DepositSummary | null>(null);
  const [trackingWallet, setTrackingWallet] = useState("");
  const [adminWallet, setAdminWallet] = useState<string | null>(null);
  const [walletMap, setWalletMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Experience check
  const [hasExperience, setHasExperience] = useState<boolean | null>(null);
  const [showBeginnerModal, setShowBeginnerModal] = useState(false);
  const [beginnerStep, setBeginnerStep] = useState(0);

  // On-ramp state
  // Form state (existing)
  const [method, setMethod] = useState("CRYPTO");
  const [amount, setAmount] = useState("");
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [selectedNetwork, setSelectedNetwork] = useState("Bitcoin");
  const [txHash, setTxHash] = useState("");
  const [cardRef, setCardRef] = useState("");
  const [bankName, setBankName] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<DepositStep>("form");
  const [copied, setCopied] = useState(false);
  // msg kept for inline display in some areas; toast used for action feedback
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentCoin = COINS.find((c) => c.id === selectedCoin);

  // Check localStorage for experience preference
  useEffect(() => {
    const saved = localStorage.getItem("deposit_experience");
    if (saved !== null) {
      setHasExperience(saved === "true");
    }
  }, []);

  const fetchDeposits = useCallback(async () => {
    try {
      const res = await fetch("/api/deposits");
      if (res.ok) {
        const data = await res.json();
        setDeposits(data.deposits || []);
        setTrackingWallet(data.trackingWallet || "");
        setAdminWallet(data.adminWallet || null);
        setWalletMap(data.walletMap || {});
        setSummary(data.summary || null);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchDeposits();
    // Poll every 30s for deposit status updates (e.g. admin confirmation, webhook)
    const interval = setInterval(() => {
      if (!document.hidden) fetchDeposits();
    }, 30000);
    const handleVisibility = () => { if (!document.hidden) fetchDeposits(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchDeposits]);

  useEffect(() => {
    const coin = COINS.find((c) => c.id === selectedCoin);
    if (coin && coin.networks.length > 0) setSelectedNetwork(coin.networks[0].network);
  }, [selectedCoin]);

  // ─── Handlers ───
  const handleExperienceChoice = (experienced: boolean) => {
    setHasExperience(experienced);
    localStorage.setItem("deposit_experience", String(experienced));
    if (!experienced) {
      setShowBeginnerModal(true);
      setBeginnerStep(0);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setProofUrl(data.url);
      else setMsg({ type: "error", text: data.error || "Upload failed" });
    } catch { setMsg({ type: "error", text: "Failed to upload file" }); }
    finally { setUploading(false); }
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setStep("confirm");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          method: method === "BUY_CRYPTO" ? "ONRAMP" : method,
          coin: method === "CRYPTO" ? selectedCoin : undefined,
          network: method === "CRYPTO" ? selectedNetwork : undefined,
          txHash: txHash || undefined,
          proofUrl: proofUrl || undefined,
          cardRef: method === "BUY_CRYPTO" ? cardRef : undefined,
          bankName: method === "CHEQUE" ? bankName : undefined,
          chequeNumber: method === "CHEQUE" ? chequeNumber : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: "Deposit request submitted successfully! Awaiting confirmation." });
        resetForm();
        fetchDeposits();
      } else {
        setMsg({ type: "error", text: data.error || "Failed to submit" });
        setStep("form");
      }
    } catch {
      setMsg({ type: "error", text: "Network error" });
      setStep("form");
    } finally { setSubmitting(false); }
  };

  const handleOnrampLaunch = (provider: OnrampProvider) => {
    const providerConfig = ONRAMP_PROVIDERS.find((p) => p.id === provider);
    if (!providerConfig) return;
    window.open(providerConfig.url, "_blank", "noopener,noreferrer");
    toast.success(`Redirecting to ${providerConfig.name}. Sign up and purchase crypto there.`);
  };


  const resetForm = () => {
    setAmount("");
    setTxHash("");
    setCardRef("");
    setBankName("");
    setChequeNumber("");
    setProofUrl(null);
    setStep("form");
  };

  const filteredDeposits = statusFilter === "ALL" ? deposits : deposits.filter((d) => d.status === statusFilter);

  if (loading) {
    return (
      <div className="dashboard-section">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  // ─── Experience Check (first-time only) ───
  if (hasExperience === null) {
    return (
      <div className="dashboard-section">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto mt-8"
        >
          <div className="glass-panel p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-5">
              <HelpCircle className="w-7 h-7 text-brand" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Have you deposited crypto before?
            </h2>
            <p className="text-sm text-text-tertiary mb-6">
              This helps us show you the right deposit flow
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExperienceChoice(true)}
                className="group glass-panel p-5 hover:border-brand/40 transition-all text-left"
              >
                <Zap className="w-5 h-5 text-brand mb-2" />
                <p className="text-sm font-semibold text-text-primary">Yes, I have</p>
                <p className="text-2xs text-text-tertiary mt-1">Show me the wallet address & QR code</p>
              </button>
              <button
                onClick={() => handleExperienceChoice(false)}
                className="group glass-panel p-5 hover:border-brand/40 transition-all text-left"
              >
                <Sparkles className="w-5 h-5 text-warning mb-2" />
                <p className="text-sm font-semibold text-text-primary">No, I&apos;m new</p>
                <p className="text-2xs text-text-tertiary mt-1">Guide me through the process</p>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-section">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Deposit Funds</h2>
            <p className="text-sm text-text-tertiary mt-0.5">Add funds to your trading account</p>
          </div>
          <button
            onClick={() => { setHasExperience(null); localStorage.removeItem("deposit_experience"); }}
            className="text-2xs text-text-tertiary hover:text-text-secondary transition-colors flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            Change experience level
          </button>
        </motion.div>

        {/* Alert */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${
                msg.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}
            >
              {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="flex-1">{msg.text}</span>
              <button onClick={() => setMsg(null)} className="p-0.5 rounded hover:bg-surface-3"><X className="w-3.5 h-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Hero Deposit Summary ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/90 via-emerald-600 to-teal-700 p-5 md:p-7 text-white shadow-lg"
        >
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="dep-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="currentColor"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#dep-grid)"/>
          </svg>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-xs font-medium tracking-wide uppercase mb-1">Total Deposited</p>
              <p className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight">{formatCurrency(summary?.totalDeposited || 0)}</p>
            </div>
            <div className="flex gap-4 md:gap-6">
              <div className="text-center">
                <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Pending</p>
                <p className="text-lg font-bold tabular-nums mt-0.5">{summary?.pendingCount ?? 0}</p>
                {(summary?.pendingAmount ?? 0) > 0 && (
                  <p className="text-2xs text-white/60">{formatCurrency(summary?.pendingAmount ?? 0)}</p>
                )}
              </div>
              <div className="w-px bg-white/20" />
              <div className="text-center">
                <p className="text-white/60 text-2xs font-medium uppercase tracking-wider">Last Deposit</p>
                <p className="text-lg font-bold tabular-nums mt-0.5">{summary?.lastDepositAmount ? formatCurrency(summary.lastDepositAmount) : "—"}</p>
                {summary?.lastDepositDate && (
                  <p className="text-2xs text-white/60">{formatDate(summary.lastDepositDate)}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main deposit panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-2 glass-panel p-5 md:p-6"
          >
            {/* Method tabs */}
            <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-6 overflow-x-auto scrollbar-thin">
              {METHOD_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setMethod(tab.id); setMsg(null); setStep("form"); }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                      method === tab.id ? "bg-brand text-white shadow-sm" : "text-text-tertiary hover:text-text-secondary hover:bg-surface-3"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {/* ═══════════════════════════════════════════════ */}
              {/* CARD PAYMENT — Stripe Elements integration      */}
              {/* ═══════════════════════════════════════════════ */}
              {method === "CARD" && (
                <motion.div
                  key="card_payment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {/* Quick links to in-app card flows */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard/pay/thirdweb")}
                      className="p-3.5 rounded-xl border border-brand/20 bg-brand/5 hover:border-brand/40 transition-all flex items-center gap-3 text-left cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-brand" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-text-primary block">Pay with Card</span>
                        <span className="text-2xs text-text-tertiary">via Thirdweb — instant</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-quaternary ml-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard/pay/moonpay")}
                      className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 transition-all flex items-center gap-3 text-left cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-text-primary block">Pay with Card</span>
                        <span className="text-2xs text-text-tertiary">via MoonPay — global</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-quaternary ml-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/dashboard/pay/wert")}
                      className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 transition-all flex items-center gap-3 text-left cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-text-primary block">Pay with Card</span>
                        <span className="text-2xs text-text-tertiary">via Wert — global</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-quaternary ml-auto" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-2xs text-text-quaternary">or pay via Stripe</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <StripeCardForm
                    onSuccess={() => {
                      toast.success("Card payment submitted! Your deposit is pending admin confirmation.");
                      fetchDeposits();
                    }}
                    onError={(errorMsg) => {
                      toast.error(errorMsg);
                    }}
                  />
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* SOLANA PAY                                        */}
              {/* ═══════════════════════════════════════════════ */}
              {method === "SOLANA_PAY" && (
                <motion.div
                  key="solana_pay"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SolanaPayForm
                    adminWallet={adminWallet}
                    walletMap={walletMap}
                    onSubmit={async (data) => {
                      setSubmitting(true);
                      setMsg(null);
                      try {
                        const res = await fetch("/api/deposits", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(data),
                        });
                        const result = await res.json();
                        if (res.ok) {
                          toast.success("Solana deposit submitted! Awaiting confirmation.");
                          fetchDeposits();
                        } else {
                          toast.error(result.error || "Failed to submit");
                        }
                      } catch {
                        toast.error("Network error");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    submitting={submitting}
                  />
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* SUI / SLUSH WALLET                               */}
              {/* ═══════════════════════════════════════════════ */}
              {method === "SUI_SLUSH" && (
                <motion.div
                  key="sui_slush"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SuiSlushForm
                    adminWallet={adminWallet}
                    walletMap={walletMap}
                    onSubmit={async (data) => {
                      setSubmitting(true);
                      setMsg(null);
                      try {
                        const res = await fetch("/api/deposits", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(data),
                        });
                        const result = await res.json();
                        if (res.ok) {
                          toast.success("SUI deposit submitted! Awaiting confirmation.");
                          fetchDeposits();
                        } else {
                          toast.error(result.error || "Failed to submit");
                        }
                      } catch {
                        toast.error("Network error");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    submitting={submitting}
                  />
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* BUY CRYPTO — On-ramp providers                  */}
              {/* ═══════════════════════════════════════════════ */}
              {method === "BUY_CRYPTO" && (
                <motion.div
                  key="buy_crypto"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  <p className="text-sm text-text-secondary">
                    Pay with your card to add funds instantly. Choose a payment method below.
                  </p>

                  {/* ─── Featured: In-app card payments ─── */}
                  <div>
                    <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Recommended</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard/pay/thirdweb")}
                        className="group p-4 rounded-xl border border-brand/20 bg-gradient-to-br from-brand/10 to-brand/5 hover:border-brand/40 hover:scale-[1.01] active:scale-[0.99] transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-brand/15 flex items-center justify-center">
                            <CreditCard className="w-4.5 h-4.5 text-brand" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-text-primary block">Card Payment</span>
                            <span className="text-2xs text-brand">Powered by Thirdweb</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {["Visa / Mastercard", "Apple Pay", "Instant"].map((f) => (
                            <span key={f} className="text-2xs px-2 py-0.5 rounded-full bg-brand/10 text-brand/80">{f}</span>
                          ))}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard/pay/moonpay")}
                        className="group p-4 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 hover:border-purple-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                            <CreditCard className="w-4.5 h-4.5 text-purple-400" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-text-primary block">Card Payment</span>
                            <span className="text-2xs text-purple-400">Powered by MoonPay</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {["Visa / Mastercard", "Apple Pay", "Google Pay", "Bank Transfer"].map((f) => (
                            <span key={f} className="text-2xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400/80">{f}</span>
                          ))}
                        </div>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <button
                        type="button"
                        onClick={() => router.push("/dashboard/pay/wert")}
                        className="group p-4 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 hover:border-emerald-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                            <CreditCard className="w-4.5 h-4.5 text-emerald-400" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-text-primary block">Card Payment</span>
                            <span className="text-2xs text-emerald-400">Powered by Wert</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {["Visa / Mastercard", "Apple Pay", "200+ Countries"].map((f) => (
                            <span key={f} className="text-2xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/80">{f}</span>
                          ))}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ─── Other providers ─── */}
                  <div>
                    <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Other Providers</p>
                  </div>
                  <div className="space-y-3">
                    {ONRAMP_PROVIDERS.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => handleOnrampLaunch(provider.id)}
                        className={`w-full text-left p-4 rounded-xl border bg-gradient-to-r ${provider.color} ${provider.borderColor} hover:scale-[1.01] active:scale-[0.99] transition-all`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-text-primary">{provider.name}</span>
                          <ExternalLink className="w-4 h-4 text-text-tertiary" />
                        </div>
                        <p className="text-2xs text-text-tertiary mb-2.5">{provider.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {provider.features.map((f) => (
                            <span key={f} className="text-2xs px-2 py-0.5 rounded-full bg-surface-3 text-text-tertiary">
                              {f}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="glass-panel p-3 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-info shrink-0 mt-0.5" />
                    <p className="text-2xs text-text-tertiary">
                      You will be redirected to the provider&apos;s platform to sign up and purchase crypto.
                      Once integrated, payments will be routed directly to your CopyTrade Pro account.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* SEND CRYPTO — Manual wallet deposit             */}
              {/* ═══════════════════════════════════════════════ */}
              {method === "CRYPTO" && step === "form" && (
                <motion.div
                  key="crypto_form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <form onSubmit={handleProceedToConfirm} className="space-y-5">
                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Amount (USD)</label>
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field text-lg font-semibold" placeholder="0.00" min="10" step="0.01" required />
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {AMOUNT_PRESETS.map((preset) => (
                          <button key={preset} type="button" onClick={() => setAmount(String(preset))} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${amount === String(preset) ? "border-brand bg-brand/10 text-brand" : "border-border bg-surface-1 text-text-tertiary hover:text-text-secondary hover:border-border-light"}`}>
                            ${preset.toLocaleString()}
                          </button>
                        ))}
                      </div>
                      <p className="text-2xs text-text-tertiary mt-1.5 flex items-center gap-1"><Info className="w-3 h-3" />Minimum deposit: $10</p>
                    </div>

                    {/* Coin selector */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Select Coin</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {COINS.map((coin) => (
                          <button key={coin.id} type="button" onClick={() => setSelectedCoin(coin.id)} className={`px-3 py-2.5 rounded-lg border text-sm transition-all ${selectedCoin === coin.id ? "border-brand bg-brand/10 text-brand font-semibold" : "border-border bg-surface-1 text-text-secondary hover:border-border-light"}`}>
                            <span className="font-medium">{coin.symbol}</span>
                            <span className="block text-2xs text-text-tertiary mt-0.5">{coin.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Network selector */}
                    {currentCoin && currentCoin.networks.length > 1 && (
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Select Network</label>
                        <div className="flex flex-wrap gap-2">
                          {currentCoin.networks.map((net) => (
                            <button key={net.network} type="button" onClick={() => setSelectedNetwork(net.network)} className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all ${selectedNetwork === net.network ? "border-brand bg-brand/10 text-brand" : "border-border bg-surface-1 text-text-secondary hover:border-border-light"}`}>
                              {net.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-2xs text-warning mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Ensure you send on the correct network. Wrong network = lost funds.</p>
                      </div>
                    )}

                    {/* QR + Wallet */}
                    {(() => {
                      // Use per-coin wallet if available, otherwise fall back to default
                      const coinKey = `${selectedCoin}_${selectedNetwork}`;
                      const displayWallet = walletMap[coinKey] || adminWallet;
                      return (
                        <div>
                          <label className="block text-xs font-medium text-text-secondary mb-1.5">Send {selectedCoin} ({selectedNetwork}) to this address</label>
                          <div className="bg-surface-1 border border-border rounded-lg p-4">
                            {displayWallet ? (
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="bg-white rounded-lg p-2.5 shrink-0">
                                  <QRCodeSVG value={displayWallet} size={120} level="M" bgColor="#FFFFFF" fgColor="#000000" />
                                </div>
                                <div className="flex-1 w-full min-w-0">
                                  <p className="text-2xs text-text-tertiary mb-2">Wallet Address</p>
                                  <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2.5">
                                    <code className="flex-1 text-xs text-text-primary break-all font-mono">{displayWallet}</code>
                                    <button type="button" onClick={() => handleCopy(displayWallet)} className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary shrink-0">
                                      {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  </div>
                                  <p className="text-2xs text-text-tertiary mt-2">Only send <span className="text-text-primary font-medium">{selectedCoin}</span> on <span className="text-text-primary font-medium">{selectedNetwork}</span></p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-warning text-sm py-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />No wallet configured for {selectedCoin} ({selectedNetwork}) — please contact support
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* TX Hash */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Transaction Hash</label>
                      <input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)} className="input-field font-mono text-xs" placeholder="0x..." />
                      <p className="text-2xs text-text-tertiary mt-1">Providing a TX hash speeds up confirmation</p>
                    </div>

                    {/* Proof upload */}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Proof of Payment</label>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={handleFileUpload} className="hidden" />
                      {proofUrl ? (
                        <div className="flex items-center gap-3 bg-success/5 border border-success/20 rounded-lg px-4 py-3">
                          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                          <div className="flex-1 min-w-0"><p className="text-sm text-text-primary font-medium">File uploaded</p></div>
                          <button type="button" onClick={() => { setProofUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-1 rounded hover:bg-surface-3 text-text-tertiary hover:text-text-primary transition-colors"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border-2 border-dashed border-border rounded-lg hover:border-brand/50 hover:bg-brand/5 transition-all text-sm text-text-tertiary hover:text-text-secondary">
                          {uploading ? (<><Loader2 className="w-4 h-4 animate-spin" />Uploading...</>) : (<><Upload className="w-4 h-4" />Upload receipt or screenshot<span className="text-2xs">(max 5MB)</span></>)}
                        </button>
                      )}
                    </div>

                    <button type="submit" disabled={submitting || !amount || parseFloat(amount) < 10} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                      Review Deposit <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* CHEQUE                                          */}
              {/* ═══════════════════════════════════════════════ */}
              {method === "CHEQUE" && step === "form" && (
                <motion.div key="cheque_form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                  <form onSubmit={handleProceedToConfirm} className="space-y-5">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Amount (USD)</label>
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field text-lg font-semibold" placeholder="0.00" min="10" step="0.01" required />
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {AMOUNT_PRESETS.map((p) => (
                          <button key={p} type="button" onClick={() => setAmount(String(p))} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${amount === String(p) ? "border-brand bg-brand/10 text-brand" : "border-border bg-surface-1 text-text-tertiary"}`}>${p.toLocaleString()}</button>
                        ))}
                      </div>
                    </div>
                    <div className="glass-panel p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-brand/10 shrink-0"><FileText className="w-5 h-5 text-brand" /></div>
                        <div>
                          <p className="text-sm font-medium text-text-primary mb-1">Cheque Deposit Instructions</p>
                          <ol className="text-xs text-text-secondary space-y-1.5 list-decimal list-inside">
                            <li>Fill in the cheque details below</li>
                            <li>Upload a photo of the cheque as proof</li>
                            <li>Submit and wait for verification (3–5 business days)</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Bank Name</label>
                        <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="input-field" placeholder="e.g. Chase" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">Cheque Number</label>
                        <input type="text" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className="input-field" placeholder="e.g. 001234" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">Proof of Payment <span className="text-danger">*</span></label>
                      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={handleFileUpload} className="hidden" />
                      {proofUrl ? (
                        <div className="flex items-center gap-3 bg-success/5 border border-success/20 rounded-lg px-4 py-3">
                          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                          <p className="text-sm text-text-primary font-medium flex-1">File uploaded</p>
                          <button type="button" onClick={() => { setProofUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-1 rounded hover:bg-surface-3 text-text-tertiary"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border-2 border-dashed border-border rounded-lg hover:border-brand/50 hover:bg-brand/5 transition-all text-sm text-text-tertiary">
                          {uploading ? (<><Loader2 className="w-4 h-4 animate-spin" />Uploading...</>) : (<><Upload className="w-4 h-4" />Upload cheque photo</>)}
                        </button>
                      )}
                    </div>
                    <button type="submit" disabled={!amount || !bankName || !chequeNumber || !proofUrl} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                      Review Deposit <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════ */}
              {/* CONFIRMATION STEP (crypto + cheque)             */}
              {/* ═══════════════════════════════════════════════ */}
              {(method === "CRYPTO" || method === "CHEQUE") && step === "confirm" && (
                <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-center gap-2 mb-5">
                    <button onClick={() => setStep("form")} className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary">
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
                    <h3 className="text-sm font-semibold text-text-primary">Confirm Your Deposit</h3>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="bg-surface-1 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-text-tertiary">Amount</span>
                        <span className="text-lg font-semibold text-text-primary">{formatCurrency(parseFloat(amount) || 0)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-text-tertiary">Method</span>
                        <span className="text-sm text-text-primary font-medium">{method}</span>
                      </div>
                      {method === "CRYPTO" && (
                        <>
                          <div className="flex justify-between"><span className="text-xs text-text-tertiary">Coin</span><span className="text-sm text-text-primary">{selectedCoin}</span></div>
                          <div className="flex justify-between"><span className="text-xs text-text-tertiary">Network</span><span className="text-sm text-text-primary">{selectedNetwork}</span></div>
                          {txHash && <div className="flex justify-between"><span className="text-xs text-text-tertiary">TX Hash</span><code className="text-2xs text-text-secondary font-mono">{txHash.slice(0, 16)}...</code></div>}
                        </>
                      )}
                      {method === "CHEQUE" && (
                        <>
                          <div className="flex justify-between"><span className="text-xs text-text-tertiary">Bank</span><span className="text-sm text-text-primary">{bankName}</span></div>
                          <div className="flex justify-between"><span className="text-xs text-text-tertiary">Cheque #</span><span className="text-sm text-text-primary">{chequeNumber}</span></div>
                        </>
                      )}
                      {proofUrl && (
                        <div className="flex justify-between"><span className="text-xs text-text-tertiary">Proof</span><span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Uploaded</span></div>
                      )}
                    </div>
                    <div className="glass-panel p-3 flex items-start gap-2">
                      <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
                      <p className="text-2xs text-text-tertiary">Your deposit will be reviewed by our team. Crypto: 1–24 hours. Cheque: 3–5 business days.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep("form")} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-2 transition-colors">Back</button>
                    <button onClick={handleSubmit} disabled={submitting} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />Confirm Deposit</>}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right sidebar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="space-y-4">
            {/* Tracking ID */}
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 rounded-lg bg-brand/10">
                  <Wallet className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Tracking ID</h3>
                  <p className="text-2xs text-text-tertiary">Your unique deposit reference</p>
                </div>
              </div>
              <div className="bg-surface-2 rounded-lg px-3 py-2.5 flex items-center gap-2 border border-border">
                <code className="flex-1 text-2xs text-text-secondary font-mono break-all">{trackingWallet}</code>
                <button onClick={() => handleCopy(trackingWallet)} className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary shrink-0"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Supported Coins */}
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Bitcoin className="w-4 h-4 text-warning" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Supported Coins</h3>
              </div>
              <div className="space-y-2.5">
                {COINS.map((coin) => (
                  <div key={coin.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-primary font-semibold">{coin.symbol}</span>
                      <span className="text-2xs text-text-tertiary">{coin.name}</span>
                    </div>
                    <div className="flex gap-1">{coin.networks.map((net) => (<span key={net.network} className="text-2xs px-1.5 py-0.5 rounded-md bg-surface-2 text-text-tertiary border border-border/50">{net.network}</span>))}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deposit Info */}
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-info/10">
                  <Info className="w-4 h-4 text-info" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary">Processing Times</h3>
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { label: "Minimum Deposit", value: "$10.00" },
                  { label: "Max Pending", value: "5 requests" },
                  { label: "Crypto Processing", value: "1–24 hours" },
                  { label: "Card (On-ramp)", value: "Instant–10 min" },
                  { label: "Cheque Processing", value: "3–5 days" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-0.5">
                    <span className="text-text-tertiary">{row.label}</span>
                    <span className="text-text-primary font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Deposit History */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="glass-panel overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-success/10">
                <DollarSign className="w-3.5 h-3.5 text-success" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">Deposit History</h3>
              {deposits.length > 0 && (
                <span className="text-2xs px-2 py-0.5 rounded-full bg-surface-3 text-text-tertiary font-medium">{deposits.length}</span>
              )}
            </div>
            <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-0.5">
              {["ALL", "PENDING", "CONFIRMED", "REJECTED"].map((f) => (
                <button key={f} onClick={() => setStatusFilter(f)} className={`px-2.5 py-1 rounded-md text-2xs font-medium transition-all ${statusFilter === f ? "bg-surface-3 text-text-primary" : "text-text-tertiary hover:text-text-secondary"}`}>
                  {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <ScrollableTable>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-1/30">
                  <th className="table-header px-4 py-2.5 text-left">Method</th>
                  <th className="table-header px-4 py-2.5 text-right">Amount</th>
                  <th className="table-header px-4 py-2.5 text-center">Status</th>
                  <th className="table-header px-4 py-2.5 text-left hidden sm:table-cell">Details</th>
                  <th className="table-header px-4 py-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeposits.length > 0 ? filteredDeposits.map((d) => {
                  const statusStyle = STATUS_STYLES[d.status] || STATUS_STYLES.PENDING;
                  const StatusIcon = statusStyle.icon;
                  return (
                    <tr key={d.id} className="table-row">
                      <td className="table-cell"><p className="text-sm text-text-primary font-medium">{d.method}</p>{d.coin && <p className="text-2xs text-text-tertiary">{d.coin} — {d.network}</p>}</td>
                      <td className="table-cell text-right text-sm font-medium text-success">+{formatCurrency(d.amount)}</td>
                      <td className="table-cell text-center"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusStyle.color}`}><StatusIcon className="w-3 h-3" />{d.status}</span></td>
                      <td className="table-cell hidden sm:table-cell">
                        {d.txHash && <code className="text-2xs text-text-tertiary font-mono">TX: {d.txHash.slice(0, 12)}...</code>}
                        {d.cardRef && <span className="text-2xs text-text-tertiary">Ref: {d.cardRef}</span>}
                        {d.bankName && <span className="text-2xs text-text-tertiary">{d.bankName} #{d.chequeNumber}</span>}
                        {d.proofUrl && <span className="text-2xs text-success ml-1.5 inline-flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" />Proof</span>}
                      </td>
                      <td className="table-cell text-right text-xs text-text-tertiary">{formatDate(d.createdAt)}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} className="text-center py-10"><div className="flex flex-col items-center gap-2"><DollarSign className="w-8 h-8 text-text-tertiary/30" /><p className="text-sm text-text-tertiary">{statusFilter === "ALL" ? "No deposits yet — make your first deposit above" : `No ${statusFilter.toLowerCase()} deposits`}</p></div></td></tr>
                )}
              </tbody>
            </table>
          </ScrollableTable>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BEGINNER GUIDE MODAL                                */}
      {/* ═══════════════════════════════════════════════════ */}
      <Modal isOpen={showBeginnerModal} onClose={() => setShowBeginnerModal(false)} title="How Deposits Work" size="lg">
        <AnimatePresence mode="wait">
          {beginnerStep === 0 && (
            <motion.div key="s0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-brand" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">Welcome to Deposits</h3>
                <p className="text-sm text-text-tertiary max-w-sm mx-auto">
                  Adding funds to your account is simple. Here&apos;s how it works:
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { icon: CreditCard, title: "Buy Crypto with Card", desc: "Use your debit/credit card, Apple Pay, or Google Pay through our trusted partners" },
                  { icon: Bitcoin, title: "Send Crypto Directly", desc: "If you already have crypto, send it to our deposit address" },
                  { icon: Shield, title: "Secure & Verified", desc: "All payments are processed through regulated providers. Your funds are safe." },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-surface-1 rounded-lg">
                    <div className="p-2 rounded-lg bg-brand/10 shrink-0"><item.icon className="w-4 h-4 text-brand" /></div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{item.title}</p>
                      <p className="text-2xs text-text-tertiary mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setBeginnerStep(1)} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                Buy Crypto Now <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowBeginnerModal(false); setMethod("CRYPTO"); }} className="w-full text-center text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                I&apos;ll send crypto manually instead
              </button>
            </motion.div>
          )}

          {beginnerStep === 1 && (
            <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              <div>
                <button onClick={() => setBeginnerStep(0)} className="text-xs text-text-tertiary hover:text-text-secondary flex items-center gap-1 mb-3">
                  <ArrowRight className="w-3 h-3 rotate-180" /> Back
                </button>
                <h3 className="text-sm font-semibold text-text-primary mb-1">Choose how much to deposit</h3>
                <p className="text-2xs text-text-tertiary">Select an amount or enter a custom value</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Choose a provider to get started</label>
                <div className="space-y-2.5">
                  {ONRAMP_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => { handleOnrampLaunch(provider.id); setShowBeginnerModal(false); }}
                      className={`w-full text-left p-4 rounded-xl border bg-gradient-to-r ${provider.color} ${provider.borderColor} hover:scale-[1.01] active:scale-[0.99] transition-all`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-text-primary">{provider.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
                      </div>
                      <p className="text-2xs text-text-tertiary">{provider.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </>
  );
}
