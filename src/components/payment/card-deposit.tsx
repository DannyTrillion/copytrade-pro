"use client";

/**
 * Card / alternative-method deposit.
 *
 * Collects an amount and a method, then hands off to the gateway's hosted
 * checkout. No card field exists anywhere in this component by design — card
 * data is entered on the gateway's domain, which is what keeps this
 * application out of PCI scope.
 *
 * On return, the deposit page reads `?payment=<id>` and polls the status
 * endpoint, so a dropped webhook still resolves while the user is watching.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  Bitcoin,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  Smartphone,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEPOSIT_PRESETS,
  PAYMENT_METHODS,
  getPaymentMethod,
  type PaymentMethodOption,
} from "@/config/payments";

const ICONS = {
  card: CreditCard,
  wallet: Wallet,
  bitcoin: Bitcoin,
  smartphone: Smartphone,
  banknote: Banknote,
} as const;

export function CardDeposit({
  onError,
  className,
}: {
  onError?: (message: string) => void;
  className?: string;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].key);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = getPaymentMethod(method);
  const parsed = parseFloat(amount);

  const belowMinimum = useMemo(() => {
    if (!selected || !Number.isFinite(parsed)) return false;
    return parsed < selected.min;
  }, [selected, parsed]);

  const canSubmit =
    Number.isFinite(parsed) && parsed > 0 && !belowMinimum && !submitting;

  const fail = (message: string) => {
    setError(message);
    onError?.(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/paymegate/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsed, method }),
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        fail(data.error || "Could not start the payment");
        setSubmitting(false);
        return;
      }

      // Full navigation rather than a popup: popups are blocked by default on
      // mobile Safari, and the checkout must own the address bar so the user
      // can see the gateway's domain and padlock before entering card details.
      window.location.href = data.checkoutUrl;
    } catch {
      fail("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", className)}>
      <div>
        <label
          htmlFor="deposit-amount"
          className="block text-xs font-medium text-text-secondary mb-1.5"
        >
          Amount (USD)
        </label>
        <input
          id="deposit-amount"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          min={selected?.min ?? 2}
          step="0.01"
          className="input-field text-lg font-semibold w-full"
          required
        />

        <div className="flex flex-wrap gap-2 mt-2">
          {DEPOSIT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium border transition-colors",
                amount === String(preset)
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-surface-1 text-text-tertiary hover:text-text-secondary"
              )}
            >
              ${preset.toLocaleString()}
            </button>
          ))}
        </div>

        {belowMinimum && selected && (
          <p className="text-2xs text-warning mt-2">
            Minimum for {selected.label} is {selected.min} {selected.minCurrency}
          </p>
        )}
      </div>

      <div>
        <span className="block text-xs font-medium text-text-secondary mb-2">
          Payment method
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((option) => (
            <MethodTile
              key={option.key}
              option={option}
              selected={method === option.key}
              onSelect={() => setMethod(option.key)}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to secure checkout…
          </>
        ) : (
          <>
            Continue to payment
            <ExternalLink className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-2xs text-text-tertiary inline-flex items-start gap-1.5">
        <Lock className="w-3 h-3 shrink-0 mt-0.5" />
        <span>
          Payment is completed on our provider&apos;s secure checkout. Your card
          details are never entered on or stored by this site. Your balance is
          credited automatically once the payment clears.
        </span>
      </p>
    </form>
  );
}

function MethodTile({
  option,
  selected,
  onSelect,
}: {
  option: PaymentMethodOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = ICONS[option.icon];

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-colors",
        selected
          ? "border-brand bg-brand/10"
          : "border-border bg-surface-1 hover:border-border-light"
      )}
    >
      <Icon className={cn("w-4 h-4", selected ? "text-brand" : "text-text-tertiary")} />
      <span className="text-xs font-medium text-text-primary">{option.label}</span>
      <span className="text-2xs text-text-tertiary leading-tight">
        {option.description}
      </span>
    </motion.button>
  );
}
