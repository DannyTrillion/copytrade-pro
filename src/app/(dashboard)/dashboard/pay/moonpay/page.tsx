"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  CreditCard,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Lock,
  Zap,
  DollarSign,
  ChevronDown,
  Globe,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/toast";

const MoonPayProvider = dynamic(
  () => import("@moonpay/moonpay-react").then((m) => m.MoonPayProvider),
  { ssr: false }
);
const MoonPayBuyWidget = dynamic(
  () => import("@moonpay/moonpay-react").then((m) => m.MoonPayBuyWidget),
  { ssr: false }
);

// ─── Constants ───
const AMOUNT_PRESETS = [25, 50, 100, 250, 500, 1000];

const CURRENCIES = [
  { code: "usd", symbol: "$", label: "US Dollar" },
  { code: "eur", symbol: "€", label: "Euro" },
  { code: "gbp", symbol: "£", label: "British Pound" },
];

const MOONPAY_API_KEY = process.env.NEXT_PUBLIC_MOONPAY_API_KEY || "pk_test_123";

type PaymentStatus = "idle" | "processing" | "success" | "error";

const MOONPAY_DISABLED = true; // Set to false when production keys are ready

export default function MoonPayPaymentPage() {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [mounted, setMounted] = useState(false);

  const numericAmount = parseFloat(amount) || 0;
  const isValidAmount = numericAmount >= 10 && numericAmount <= 10000;

  const handleContinue = useCallback(() => {
    if (!isValidAmount) return;
    setShowWidget(true);
    setMounted(true);
  }, [isValidAmount]);

  const handleBack = useCallback(() => {
    setShowWidget(false);
  }, []);

  const resetPayment = useCallback(() => {
    setAmount("");
    setShowWidget(false);
    setStatus("idle");
    setMounted(false);
  }, []);

  if (MOONPAY_DISABLED) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-5">
          <CreditCard className="w-8 h-8 text-purple-400/50" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">MoonPay — Under Maintenance</h2>
        <p className="text-sm text-text-tertiary max-w-sm mb-6">This payment method is temporarily unavailable. Please use Thirdweb card payment or crypto deposit instead.</p>
        <a href="/dashboard/deposit" className="btn-primary text-sm px-6">Back to Deposit</a>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-6 relative">
      {/* Ambient glow background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/[0.04] blur-[120px]" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8 relative z-10"
      >
        <Link
          href="/dashboard/deposit"
          className="p-2 rounded-xl hover:bg-surface-2 transition-all text-text-tertiary hover:text-text-primary border border-transparent hover:border-border"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-text-primary">Add Funds</h1>
          <p className="text-xs text-text-tertiary">Secure card payment via MoonPay</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
          <Globe className="w-3 h-3 text-purple-400" />
          <span className="text-2xs font-medium text-purple-400">Global</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ─── Success State ─── */}
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative overflow-hidden rounded-2xl border border-success/20 bg-gradient-to-b from-success/5 to-surface-1 p-8 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(38,166,154,0.1),transparent_70%)]" />
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, damping: 12 }}
                className="w-20 h-20 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-5"
              >
                <CheckCircle2 className="w-10 h-10 text-success" />
              </motion.div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Payment Successful</h2>
              <p className="text-sm text-text-secondary mb-1">
                {currency.symbol}{numericAmount.toFixed(2)} has been added to your account.
              </p>
              <p className="text-xs text-text-tertiary mb-8">
                Funds are typically available within a few minutes.
              </p>
              <div className="flex gap-3">
                <button onClick={resetPayment} className="btn-secondary flex-1 text-sm">
                  Add More
                </button>
                <Link href="/dashboard" className="btn-primary flex-1 text-sm text-center">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </motion.div>

        /* ─── Widget View ─── */
        ) : showWidget ? (
          <motion.div
            key="widget"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary mb-5 transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Change amount
            </button>

            {/* Amount summary card */}
            <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 via-surface-1 to-surface-1 p-4 mb-5">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
              <div className="flex items-center justify-between pl-3">
                <div>
                  <span className="text-2xs text-text-tertiary uppercase tracking-wider font-medium">Payment Amount</span>
                  <p className="text-2xl font-bold text-text-primary tabular-nums mt-0.5">
                    {currency.symbol}{numericAmount.toFixed(2)}
                    <span className="text-sm text-text-tertiary ml-1.5 font-medium">{currency.code.toUpperCase()}</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            {/* MoonPay Widget */}
            <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-[0_0_40px_rgba(139,92,246,0.06)] min-h-[480px]">
              <div className="absolute inset-0 bg-gradient-to-b from-surface-1 to-surface-0 -z-10" />
              {!mounted && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-1 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="text-xs text-text-tertiary">Loading payment form...</span>
                  </div>
                </div>
              )}
              <MoonPayProvider apiKey={MOONPAY_API_KEY}>
                <MoonPayBuyWidget
                  variant="embedded"
                  visible
                  baseCurrencyCode={currency.code}
                  baseCurrencyAmount={String(numericAmount)}
                  defaultCurrencyCode="usdc"
                  paymentMethod="credit_debit_card"
                  showWalletAddressForm="false"
                  colorCode="#7C3AED"
                  theme="dark"
                  language="en"
                  onLogin={async () => { setMounted(true); }}
                />
              </MoonPayProvider>
            </div>

            {/* Trust footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-6 mt-5"
            >
              {[
                { icon: Lock, label: "256-bit SSL" },
                { icon: Shield, label: "PCI DSS" },
                { icon: Globe, label: "MoonPay" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-2xs text-text-quaternary">
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
              ))}
            </motion.div>
          </motion.div>

        /* ─── Amount Selection ─── */
        ) : (
          <motion.div
            key="amount"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10"
          >
            {/* Main card */}
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface-1/80 backdrop-blur-xl shadow-[0_4px_60px_rgba(0,0,0,0.3)]">
              {/* Top gradient accent */}
              <div className="h-1 bg-gradient-to-r from-purple-500 via-violet-400 to-indigo-500" />

              <div className="p-6">
                {/* Card header */}
                <div className="flex items-center gap-3 mb-7">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-text-primary">Card Payment</p>
                    <p className="text-xs text-text-tertiary">Visa, Mastercard, Apple Pay, Google Pay</p>
                  </div>
                </div>

                {/* Currency selector */}
                <div className="mb-5">
                  <label className="block text-2xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    Currency
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                      className="w-full px-4 py-3 rounded-xl bg-surface-0 border border-border/60 text-left flex items-center justify-between text-sm hover:border-border-light transition-colors"
                    >
                      <span className="text-text-primary font-medium">{currency.symbol} {currency.label}</span>
                      <ChevronDown className={`w-4 h-4 text-text-tertiary transition-transform ${showCurrencyPicker ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {showCurrencyPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          className="absolute z-20 top-full mt-2 w-full bg-surface-2 border border-border rounded-xl overflow-hidden shadow-2xl"
                        >
                          {CURRENCIES.map((c) => (
                            <button
                              key={c.code}
                              onClick={() => { setCurrency(c); setShowCurrencyPicker(false); }}
                              className="w-full px-4 py-3 text-left text-sm hover:bg-surface-3 transition-colors flex items-center justify-between"
                            >
                              <span className="text-text-primary font-medium">{c.symbol} {c.label}</span>
                              {c.code === currency.code && (
                                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Amount input */}
                <div className="mb-5">
                  <label className="block text-2xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary text-lg font-semibold">
                      {currency.symbol}
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min={10}
                      max={10000}
                      step="0.01"
                      className="w-full pl-10 pr-4 py-4 rounded-xl bg-surface-0 border border-border/60 text-2xl font-bold tabular-nums text-text-primary placeholder:text-text-quaternary focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all"
                      autoFocus
                    />
                  </div>
                  {amount && !isValidAmount && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-danger mt-2 flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {numericAmount < 10 ? "Minimum amount is $10" : "Maximum amount is $10,000"}
                    </motion.p>
                  )}
                </div>

                {/* Preset amounts */}
                <div className="grid grid-cols-3 gap-2 mb-7">
                  {AMOUNT_PRESETS.map((preset) => (
                    <motion.button
                      key={preset}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAmount(String(preset))}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                        numericAmount === preset
                          ? "bg-purple-500/15 border-purple-500/30 text-purple-400 shadow-sm shadow-purple-500/10"
                          : "bg-surface-0 border-border/40 text-text-secondary hover:bg-surface-2 hover:border-border-light"
                      }`}
                    >
                      {currency.symbol}{preset.toLocaleString()}
                    </motion.button>
                  ))}
                </div>

                {/* Continue button */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  disabled={!isValidAmount}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  <DollarSign className="w-4 h-4" />
                  Continue — {currency.symbol}{numericAmount > 0 ? numericAmount.toFixed(2) : "0.00"}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Trust signals */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-5 px-4 py-3.5 rounded-xl bg-surface-1/50 border border-border/30 backdrop-blur-sm"
            >
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: Shield, label: "Bank-grade", sub: "Security" },
                  { icon: Zap, label: "Instant", sub: "Processing" },
                  { icon: Lock, label: "PCI DSS", sub: "Compliant" },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center mb-0.5">
                      <Icon className="w-3.5 h-3.5 text-text-tertiary" />
                    </div>
                    <span className="text-2xs font-medium text-text-secondary">{label}</span>
                    <span className="text-2xs text-text-quaternary">{sub}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Error state */}
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl bg-danger/5 border border-danger/20 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-danger" />
                </div>
                <p className="text-xs text-danger">
                  Previous payment failed. Please try again or use a different card.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
