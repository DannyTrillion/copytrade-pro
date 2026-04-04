"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
  Zap,
  DollarSign,
  ChevronDown,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/toast";
import { useWertWidget } from "@wert-io/module-react-component";

// ─── Constants ───
const AMOUNT_PRESETS = [25, 50, 100, 250, 500, 1000];

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
];

type PaymentStatus = "idle" | "processing" | "success" | "error";

export default function WertPaymentPage() {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [depositWallet, setDepositWallet] = useState("");

  const partnerId = process.env.NEXT_PUBLIC_WERT_PARTNER_ID || "";

  useEffect(() => {
    fetch("/api/pay/wallet")
      .then((r) => r.json())
      .then((d) => { if (d.wallet) setDepositWallet(d.wallet); })
      .catch(() => {});
  }, []);

  const { open: openWert } = useWertWidget({
    listeners: {
      "payment-status": (data: { status: string }) => {
        if (data.status === "success") {
          setStatus("success");
          toast.success("Payment completed successfully!");
        } else if (data.status === "failed" || data.status === "failover") {
          setStatus("error");
          toast.error("Payment failed. Please try again.");
        }
      },
    },
  });

  const numericAmount = parseFloat(amount) || 0;
  const isValidAmount = numericAmount >= 10 && numericAmount <= 10000;

  const handleContinue = useCallback(() => {
    if (!isValidAmount || !depositWallet) {
      if (!depositWallet) toast.error("Payment wallet not configured. Contact support.");
      return;
    }

    setStatus("processing");

    openWert({
      partner_id: partnerId,
      origin: "https://widget.wert.io",
      commodity: "USDC",
      network: "base",
      commodity_amount: numericAmount,
      display_currency: currency.code,
      address: depositWallet,
    });
  }, [isValidAmount, depositWallet, numericAmount, currency, partnerId, openWert]);

  const resetPayment = useCallback(() => {
    setAmount("");
    setStatus("idle");
  }, []);

  return (
    <div className="max-w-lg mx-auto py-6 relative">
      {/* Ambient glow background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.04] blur-[120px]" />
      </div>

      {/* Back link */}
      <Link
        href="/dashboard/deposit"
        className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Deposit
      </Link>

      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Payment Successful</h2>
            <p className="text-text-tertiary text-sm mb-6">
              Your funds will appear in your account shortly.
            </p>
            <button
              onClick={resetPayment}
              className="px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Make Another Payment
            </button>
          </motion.div>
        ) : status === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">Payment Failed</h2>
            <p className="text-text-tertiary text-sm mb-6">
              Something went wrong. Please try again.
            </p>
            <button
              onClick={resetPayment}
              className="px-5 py-2.5 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                </div>
                <h1 className="text-xl font-semibold text-text-primary">Card Payment</h1>
              </div>
              <p className="text-sm text-text-tertiary ml-10">
                Powered by Wert — instant card payment
              </p>
            </div>

            {/* Gradient accent bar */}
            <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent mb-6" />

            {/* Amount selection card */}
            <div className="rounded-xl border border-border/50 bg-surface-2/80 backdrop-blur-sm p-5 mb-4">
              {/* Currency selector */}
              <div className="mb-4">
                <label className="text-2xs font-medium text-text-tertiary uppercase tracking-wider mb-2 block">
                  Currency
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-3 hover:bg-surface-3/80 border border-border/40 transition-colors text-sm"
                  >
                    <span className="text-text-primary font-medium">{currency.symbol}</span>
                    <span className="text-text-secondary">{currency.code}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-text-tertiary ml-1" />
                  </button>
                  {showCurrencyPicker && (
                    <div className="absolute left-0 top-full mt-1 z-10 w-48 bg-surface-2 border border-border/60 rounded-lg shadow-lg py-1">
                      {CURRENCIES.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-surface-3 transition-colors flex items-center gap-2"
                        >
                          <span className="text-text-primary font-medium">{c.symbol}</span>
                          <span className="text-text-secondary">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Amount input */}
              <div className="mb-4">
                <label className="text-2xs font-medium text-text-tertiary uppercase tracking-wider mb-2 block">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-text-tertiary font-medium">
                    {currency.symbol}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-surface-3 border border-border/40 text-xl font-semibold text-text-primary placeholder:text-text-tertiary/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all"
                  />
                </div>
                <p className="text-2xs text-text-tertiary mt-1.5">
                  Min {currency.symbol}10 — Max {currency.symbol}10,000
                </p>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-3 gap-2">
                {AMOUNT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset.toString())}
                    className={`py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      amount === preset.toString()
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-surface-3 text-text-secondary hover:text-text-primary hover:bg-surface-3/80 border border-transparent"
                    }`}
                  >
                    {currency.symbol}{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {isValidAmount && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-xl border border-border/50 bg-surface-2/80 backdrop-blur-sm p-4 mb-4"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">You pay</span>
                  <span className="text-text-primary font-semibold">
                    {currency.symbol}{numericAmount.toLocaleString()}
                  </span>
                </div>
                <div className="h-px bg-border/30 my-2.5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">You receive (approx)</span>
                  <span className="text-emerald-400 font-semibold">
                    ~{numericAmount.toLocaleString()} USDC
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 text-2xs text-text-tertiary">
                  <DollarSign className="w-3 h-3" />
                  <span>Network: Base — Low gas fees</span>
                </div>
              </motion.div>
            )}

            {/* CTA Button */}
            <button
              onClick={handleContinue}
              disabled={!isValidAmount || status === "processing"}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              {status === "processing" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Opening Wert...
                </>
              ) : (
                <>
                  Pay {currency.symbol}{numericAmount > 0 ? numericAmount.toLocaleString() : "0"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-4 mt-5 text-2xs text-text-tertiary">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" /> SSL Encrypted
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> PCI Compliant
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" /> Instant
              </span>
            </div>

            {/* Features */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { icon: CreditCard, title: "All Major Cards", desc: "Visa, Mastercard, Apple Pay" },
                { icon: Shield, title: "Secure & Regulated", desc: "Licensed payment provider" },
                { icon: Zap, title: "Instant Settlement", desc: "Funds arrive in minutes" },
                { icon: Sparkles, title: "Global Coverage", desc: "200+ countries supported" },
              ].map((f, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-surface-2/50 border border-border/30"
                >
                  <f.icon className="w-4 h-4 text-emerald-400 mb-1.5" />
                  <p className="text-xs font-medium text-text-primary">{f.title}</p>
                  <p className="text-2xs text-text-tertiary">{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
