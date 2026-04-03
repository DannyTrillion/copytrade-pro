"use client";

import { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Shield,
  Wallet,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const AMOUNT_PRESETS = [50, 100, 250, 500, 1000, 5000];

interface SolanaPayFormProps {
  adminWallet: string | null;
  walletMap: Record<string, string>;
  onSubmit: (data: {
    amount: number;
    method: string;
    coin: string;
    network: string;
    txHash?: string;
    proofUrl?: string;
  }) => Promise<void>;
  submitting: boolean;
}

export function SolanaPayForm({ adminWallet, walletMap, onSubmit, submitting }: SolanaPayFormProps) {
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");

  // Use SOL-specific wallet if available, fallback to admin wallet
  const solWallet = walletMap["SOL_Solana"] || adminWallet;

  // Build a Solana Pay URL for QR scanning
  const solanaPayUrl = useMemo(() => {
    if (!solWallet || !amount) return null;
    const amt = parseFloat(amount);
    if (!amt || amt < 10) return null;
    // solana:<recipient>?amount=<amount>&label=CopyTrade+Pro&message=Deposit
    return `solana:${solWallet}?label=CopyTrade+Pro&message=Deposit+${amt}+USD`;
  }, [solWallet, amount]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) return;
    await onSubmit({
      amount: amt,
      method: "CRYPTO",
      coin: "SOL",
      network: "Solana",
      txHash: txHash || undefined,
    });
    setAmount("");
    setTxHash("");
    setStep("form");
  };

  if (step === "confirm") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => setStep("form")} className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary">
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
          <h3 className="text-sm font-semibold text-text-primary">Confirm Solana Pay Deposit</h3>
        </div>
        <div className="bg-surface-1 rounded-xl p-4 space-y-3 border border-border">
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-tertiary">Amount</span>
            <span className="text-lg font-semibold text-text-primary">{formatCurrency(parseFloat(amount) || 0)}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-tertiary">Network</span>
            <span className="text-sm text-text-primary font-medium">Solana</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-tertiary">Coin</span>
            <span className="text-sm text-text-primary font-medium">SOL</span>
          </div>
          {txHash && (
            <>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-tertiary">TX Hash</span>
                <code className="text-2xs text-text-secondary font-mono">{txHash.slice(0, 16)}...</code>
              </div>
            </>
          )}
        </div>
        <div className="glass-panel p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <p className="text-2xs text-text-tertiary">Your deposit will be reviewed by our team. Solana transactions typically confirm within 1–5 minutes.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep("form")} className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-2 transition-colors">Back</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 btn-primary text-sm flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />Confirm Deposit</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.89 7.15L16.17 10.88C16.06 10.99 15.91 11.05 15.75 11.05H4.71C4.43 11.05 4.29 10.71 4.49 10.51L8.21 6.79C8.32 6.68 8.47 6.62 8.63 6.62H19.67C19.95 6.62 20.09 6.96 19.89 7.15Z" fill="#9945FF"/>
            <path d="M19.89 17.22L16.17 13.5C16.06 13.39 15.91 13.33 15.75 13.33H4.71C4.43 13.33 4.29 13.67 4.49 13.87L8.21 17.59C8.32 17.7 8.47 17.76 8.63 17.76H19.67C19.95 17.76 20.09 17.42 19.89 17.22Z" fill="#9945FF"/>
            <path d="M4.49 4.13L8.21 7.86C8.32 7.97 8.47 8.03 8.63 8.03H19.67C19.95 8.03 20.09 7.69 19.89 7.49L16.17 3.76C16.06 3.65 15.91 3.59 15.75 3.59H4.71C4.43 3.59 4.29 3.93 4.49 4.13Z" fill="#14F195"/>
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Solana Pay</h3>
          <p className="text-2xs text-text-tertiary">Fast, low-fee payments on Solana</p>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Deposit Amount (USD)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-semibold text-text-tertiary">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field text-xl font-bold pl-8"
            placeholder="0.00"
            min="10"
            step="0.01"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                amount === String(preset)
                  ? "border-purple-500 bg-purple-500/10 text-purple-600 shadow-sm"
                  : "border-border bg-surface-1 text-text-secondary hover:text-text-primary hover:border-border-light"
              }`}
            >
              ${preset.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Wallet Address + QR */}
      {solWallet ? (
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white rounded-xl p-3 shrink-0 shadow-sm">
              {solanaPayUrl ? (
                <QRCodeSVG value={solanaPayUrl} size={130} level="M" bgColor="#FFFFFF" fgColor="#000000" />
              ) : (
                <QRCodeSVG value={solWallet} size={130} level="M" bgColor="#FFFFFF" fgColor="#000000" />
              )}
            </div>
            <div className="flex-1 w-full min-w-0">
              <p className="text-2xs text-text-tertiary mb-1.5 flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Solana Wallet Address
              </p>
              <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2.5 border border-border">
                <code className="flex-1 text-xs text-text-primary break-all font-mono">{solWallet}</code>
                <button type="button" onClick={() => handleCopy(solWallet)} className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary shrink-0">
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-2xs text-text-tertiary mt-2">
                Send <span className="text-purple-600 font-semibold">SOL</span> or <span className="text-purple-600 font-semibold">SPL tokens</span> on the <span className="text-text-primary font-medium">Solana</span> network
              </p>
              {solanaPayUrl && (
                <p className="text-2xs text-success mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> QR code is Solana Pay compatible — scan with Phantom, Solflare, etc.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-warning text-sm p-4 rounded-xl border border-warning/20 bg-warning/5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No Solana wallet configured — please contact support
        </div>
      )}

      {/* TX Hash */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Transaction Signature</label>
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          className="input-field font-mono text-xs"
          placeholder="Paste your Solana transaction signature..."
        />
        <p className="text-2xs text-text-tertiary mt-1">Providing the TX signature speeds up confirmation</p>
      </div>

      {/* Security note */}
      <div className="glass-panel p-3 flex items-start gap-2">
        <Shield className="w-4 h-4 text-success shrink-0 mt-0.5" />
        <p className="text-2xs text-text-tertiary">
          Solana transactions confirm in seconds with minimal fees (~$0.00025). Supported wallets: Phantom, Solflare, Backpack, and any Solana Pay compatible wallet.
        </p>
      </div>

      <button
        onClick={() => setStep("confirm")}
        disabled={!amount || parseFloat(amount) < 10}
        className="btn-primary w-full text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        Review Deposit <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
