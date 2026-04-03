"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Shield,
  Wallet,
  ArrowRight,
  Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const AMOUNT_PRESETS = [50, 100, 250, 500, 1000, 5000];

interface SuiSlushFormProps {
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

export function SuiSlushForm({ adminWallet, walletMap, onSubmit, submitting }: SuiSlushFormProps) {
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");

  // Use SUI-specific wallet if available
  const suiWallet = walletMap["SUI_SUI"] || walletMap["SUI_Sui"] || adminWallet;

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
      coin: "SUI",
      network: "SUI",
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
          <h3 className="text-sm font-semibold text-text-primary">Confirm SUI Deposit</h3>
        </div>
        <div className="bg-surface-1 rounded-xl p-4 space-y-3 border border-border">
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-tertiary">Amount</span>
            <span className="text-lg font-semibold text-text-primary">{formatCurrency(parseFloat(amount) || 0)}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-tertiary">Network</span>
            <span className="text-sm text-text-primary font-medium">SUI</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-tertiary">Coin</span>
            <span className="text-sm text-text-primary font-medium">SUI</span>
          </div>
          {txHash && (
            <>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-tertiary">TX Digest</span>
                <code className="text-2xs text-text-secondary font-mono">{txHash.slice(0, 16)}...</code>
              </div>
            </>
          )}
        </div>
        <div className="glass-panel p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
          <p className="text-2xs text-text-tertiary">Your deposit will be reviewed by our team. SUI transactions typically confirm within seconds.</p>
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
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/20 border border-sky-500/20">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.78 5.22C15.13 3.57 12.78 2.5 10.17 2.5C5.02 2.5 0.84 6.68 0.84 11.83C0.84 14.44 1.91 16.79 3.56 18.44L8.94 13.06C9.28 12.72 9.73 12.53 10.2 12.53H18.14C18.56 12.53 18.77 12.03 18.47 11.73L16.78 5.22Z" fill="#6FBCF0"/>
            <path d="M7.22 18.78C8.87 20.43 11.22 21.5 13.83 21.5C18.98 21.5 23.16 17.32 23.16 12.17C23.16 9.56 22.09 7.21 20.44 5.56L15.06 10.94C14.72 11.28 14.27 11.47 13.8 11.47H5.86C5.44 11.47 5.23 11.97 5.53 12.27L7.22 18.78Z" fill="#4DA2FF"/>
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text-primary">SUI (Slush Wallet)</h3>
          <p className="text-2xs text-text-tertiary">Deposit via the SUI blockchain</p>
        </div>
      </div>

      {/* Slush Wallet badge */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-500/5 to-blue-500/5">
        <div className="p-2 rounded-lg bg-sky-500/10 shrink-0">
          <Wallet className="w-4 h-4 text-sky-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary mb-0.5">Compatible with Slush Wallet</p>
          <p className="text-2xs text-text-tertiary">
            Open your <span className="text-sky-500 font-semibold">Slush</span> wallet app, scan the QR code or paste the address below to send SUI tokens.
          </p>
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
                  ? "border-sky-500 bg-sky-500/10 text-sky-600 shadow-sm"
                  : "border-border bg-surface-1 text-text-secondary hover:text-text-primary hover:border-border-light"
              }`}
            >
              ${preset.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* SUI Wallet Address + QR */}
      {suiWallet ? (
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-white rounded-xl p-3 shrink-0 shadow-sm">
              <QRCodeSVG value={suiWallet} size={130} level="M" bgColor="#FFFFFF" fgColor="#000000" />
            </div>
            <div className="flex-1 w-full min-w-0">
              <p className="text-2xs text-text-tertiary mb-1.5 flex items-center gap-1">
                <Wallet className="w-3 h-3" /> SUI Wallet Address
              </p>
              <div className="flex items-center gap-2 bg-surface-2 rounded-lg px-3 py-2.5 border border-border">
                <code className="flex-1 text-xs text-text-primary break-all font-mono">{suiWallet}</code>
                <button type="button" onClick={() => handleCopy(suiWallet)} className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-text-tertiary hover:text-text-primary shrink-0">
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-2xs text-text-tertiary mt-2">
                Only send <span className="text-sky-500 font-semibold">SUI</span> tokens on the <span className="text-text-primary font-medium">SUI</span> network
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-warning text-sm p-4 rounded-xl border border-warning/20 bg-warning/5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          No SUI wallet configured — please contact support
        </div>
      )}

      {/* TX Digest */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Transaction Digest</label>
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          className="input-field font-mono text-xs"
          placeholder="Paste your SUI transaction digest..."
        />
        <p className="text-2xs text-text-tertiary mt-1">Providing the TX digest speeds up confirmation</p>
      </div>

      {/* Security note */}
      <div className="glass-panel p-3 flex items-start gap-2">
        <Shield className="w-4 h-4 text-success shrink-0 mt-0.5" />
        <p className="text-2xs text-text-tertiary">
          SUI transactions are near-instant with sub-second finality and ultra-low fees. Compatible with Slush, Sui Wallet, Ethos, Martian, and other SUI wallets.
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
