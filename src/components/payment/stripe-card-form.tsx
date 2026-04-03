"use client";

import { useState, useCallback } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useChartTheme } from "@/hooks/use-chart-theme";

/* ─── Stripe instance (loaded once) ─── */

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

/* ─── Inner form that uses Stripe hooks ─── */

interface CheckoutFormProps {
  amount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function CheckoutForm({ amount, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/deposit?payment=success`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
      } else if (paymentIntent?.status === "succeeded") {
        setSucceeded(true);
        onSuccess();
      } else if (paymentIntent?.status === "requires_action") {
        // 3D Secure or similar — Stripe handles this automatically via redirect
        onError("Additional authentication required. Please complete the verification.");
      } else {
        onError("Payment processing. You will be notified once confirmed.");
      }
    } catch {
      onError("An unexpected error occurred. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="flex flex-col items-center gap-5 py-10">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center shadow-sm">
          <CheckCircle2 className="w-10 h-10 text-success" />
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-text-primary">Payment Successful!</p>
          <p className="text-sm text-text-tertiary mt-2 max-w-xs mx-auto">
            {formatCurrency(amount)} has been charged. Your balance will be credited after admin confirmation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            defaultValues: {
              billingDetails: { address: { country: "US" } },
            },
          }}
        />
      </div>

      <div className="glass-panel p-3 flex items-start gap-2">
        <Shield className="w-4 h-4 text-success shrink-0 mt-0.5" />
        <p className="text-2xs text-text-tertiary">
          Payment is securely processed by Stripe. Your card details are encrypted end-to-end
          and never touch our servers. Balance is credited after admin confirmation.
        </p>
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || processing}
        className="btn-primary w-full py-3 gap-2 disabled:opacity-50"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Pay {formatCurrency(amount)}
          </>
        )}
      </button>
    </form>
  );
}

/* ─── Main Stripe Card Form (wrapper with Elements provider) ─── */

interface StripeCardFormProps {
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function StripeCardForm({ onSuccess, onError }: StripeCardFormProps) {
  const [amount, setAmount] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ct = useChartTheme();

  const AMOUNT_PRESETS = [50, 100, 250, 500, 1000, 5000];

  const handleCreateIntent = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 10) {
      setError("Minimum deposit is $10");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (res.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setError(data.error || "Failed to initialize payment");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [amount]);

  // If no Stripe key configured, show manual card form fallback
  if (!stripePromise) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl border border-warning/20 bg-warning/5">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary">Stripe Not Configured</p>
            <p className="text-xs text-text-tertiary mt-1">
              Card payments require a Stripe API key. Please configure <code className="text-brand">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and <code className="text-brand">STRIPE_SECRET_KEY</code> in your environment variables.
              You can get your keys from the <span className="text-brand">Stripe Dashboard</span>.
            </p>
          </div>
        </div>
        <ManualCardFallback onSuccess={onSuccess} onError={onError} />
      </div>
    );
  }

  // Step 1: Amount selection
  if (!clientSecret) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand/10">
            <CreditCard className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Card Payment</h3>
            <p className="text-2xs text-text-tertiary">Secure payment via Stripe</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">Deposit Amount (USD)</label>
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
                    ? "border-brand bg-brand/10 text-brand shadow-sm"
                    : "border-border bg-surface-1 text-text-secondary hover:text-text-primary hover:border-border-light hover:shadow-sm"
                }`}
              >
                ${preset.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-danger/5 border border-danger/15">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        {/* Card brands */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xs text-text-tertiary mr-1">Accepted:</span>
          {["Visa", "Mastercard", "Amex", "Apple Pay", "Google Pay"].map((b) => (
            <span key={b} className="text-2xs px-2.5 py-1 rounded-lg bg-surface-2 text-text-secondary font-medium border border-border/50">{b}</span>
          ))}
        </div>

        <button
          onClick={handleCreateIntent}
          disabled={loading || !amount || parseFloat(amount) < 10}
          className="btn-primary w-full py-3.5 gap-2 text-sm disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Continue to Payment {amount && parseFloat(amount) >= 10 ? `— ${formatCurrency(parseFloat(amount))}` : ""}
            </>
          )}
        </button>
      </div>
    );
  }

  // Step 2: Stripe Elements payment form
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: ct.stripeTheme,
          variables: {
            colorPrimary: "#2962FF",
            colorBackground: ct.stripeBg,
            colorText: ct.stripeText,
            colorTextSecondary: ct.stripeSecondary,
            colorDanger: "#EF5350",
            borderRadius: "8px",
            fontFamily: "inherit",
            spacingUnit: "4px",
          },
          rules: {
            ".Input": {
              backgroundColor: ct.stripeInputBg,
              border: `1px solid ${ct.stripeBorder}`,
              boxShadow: "none",
              padding: "10px 12px",
            },
            ".Input:focus": {
              border: "1px solid #2962FF",
              boxShadow: "0 0 0 1px #2962FF",
            },
            ".Label": {
              color: ct.stripeSecondary,
              fontSize: "12px",
              fontWeight: "500",
            },
            ".Tab": {
              backgroundColor: ct.stripeInputBg,
              border: `1px solid ${ct.stripeBorder}`,
            },
            ".Tab--selected": {
              backgroundColor: "#2962FF",
              border: "1px solid #2962FF",
              color: "#ffffff",
            },
          },
        },
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-text-secondary">Depositing</span>
          <span className="text-lg font-bold text-text-primary tabular-nums">
            {formatCurrency(parseFloat(amount))}
          </span>
        </div>
        <CheckoutForm
          amount={parseFloat(amount)}
          onSuccess={onSuccess}
          onError={(msg) => {
            setError(msg);
            onError(msg);
          }}
        />
        <button
          onClick={() => {
            setClientSecret(null);
            setError(null);
          }}
          className="btn-secondary w-full text-sm"
        >
          Change Amount
        </button>
      </div>
    </Elements>
  );
}

/* ─── Manual card fallback (when Stripe is not configured) ─── */

function ManualCardFallback({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const [amount, setAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [processing, setProcessing] = useState(false);

  const formatCardNum = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExp = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt < 10) { onError("Minimum deposit is $10"); return; }
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) { onError("Fill in all card details"); return; }

    setProcessing(true);
    try {
      const last4 = cardNumber.replace(/\s/g, "").slice(-4);
      const raw = cardNumber.replace(/\s/g, "");
      const brand = raw.startsWith("4") ? "Visa"
        : raw.startsWith("5") ? "Mastercard"
        : raw.startsWith("3") ? "Amex"
        : raw.startsWith("6") ? "Discover" : "Card";

      const res = await fetch("/api/card-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, cardLast4: last4, cardBrand: brand }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        onError(data.error || "Payment failed");
      }
    } catch {
      onError("Network error");
    } finally {
      setProcessing(false);
    }
  };

  const PRESETS = [50, 100, 250, 500, 1000, 5000];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-text-tertiary">Manual card entry — deposit will be reviewed by admin.</p>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Amount (USD)</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field text-lg font-semibold" placeholder="0.00" min="10" step="0.01" required />
        <div className="flex flex-wrap gap-2 mt-2">
          {PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => setAmount(String(p))} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${amount === String(p) ? "border-brand bg-brand/10 text-brand" : "border-border bg-surface-1 text-text-tertiary"}`}>${p.toLocaleString()}</button>
          ))}
        </div>
      </div>
      <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} className="input-field" placeholder="Cardholder Name" required />
      <input type="text" value={cardNumber} onChange={(e) => setCardNumber(formatCardNum(e.target.value))} className="input-field" placeholder="1234 5678 9012 3456" maxLength={19} required />
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={cardExpiry} onChange={(e) => setCardExpiry(formatExp(e.target.value))} className="input-field" placeholder="MM/YY" maxLength={5} required />
        <input type="text" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} className="input-field" placeholder="CVC" maxLength={4} required />
      </div>
      <button type="submit" disabled={processing} className="btn-primary w-full py-3 gap-2 disabled:opacity-50">
        {processing ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <><CreditCard className="w-4 h-4" />Pay {amount ? formatCurrency(parseFloat(amount)) : "$0.00"}</>}
      </button>
    </form>
  );
}
