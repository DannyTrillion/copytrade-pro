/**
 * Deposit payment configuration.
 *
 * The gateway is PayMeGate: we create an order server-side and redirect the
 * user to their hosted checkout. Card details are entered on PayMeGate's
 * domain, never ours, which keeps this application out of PCI scope.
 *
 * Minimums below mirror the gateway's own per-method limits (GET
 * /v1/payment-methods). They are duplicated here so the UI can validate before
 * a round trip, but the gateway remains authoritative — it will reject an
 * under-minimum order regardless of what this file says.
 */

export interface PaymentMethodOption {
  /** `paymentMethodsKeys` value sent to the gateway. */
  key: string;
  label: string;
  description: string;
  /** Gateway minimum, in `minCurrency`. */
  min: number;
  minCurrency: string;
  /** Lucide icon name resolved by the UI. */
  icon: "card" | "wallet" | "bitcoin" | "smartphone" | "banknote";
}

/**
 * Curated subset of the 20 methods enabled on the account. Showing all of them
 * buries the two or three a given user actually wants behind a wall of logos,
 * and the long tail carries $20–$30 minimums that produce avoidable failures.
 */
export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    key: "stripe",
    label: "Card",
    description: "Visa, Mastercard, Amex",
    min: 2,
    minCurrency: "USD",
    icon: "card",
  },
  {
    key: "paypal",
    label: "PayPal",
    description: "PayPal balance or linked card",
    min: 5,
    minCurrency: "USD",
    icon: "wallet",
  },
  {
    key: "crypto",
    label: "Crypto",
    description: "BTC, ETH, USDT and others",
    min: 2,
    minCurrency: "USD",
    icon: "bitcoin",
  },
  {
    key: "cashapp",
    label: "Cash App",
    description: "US only",
    min: 2,
    minCurrency: "USD",
    icon: "smartphone",
  },
  {
    key: "venmo",
    label: "Venmo",
    description: "US only",
    min: 2,
    minCurrency: "USD",
    icon: "smartphone",
  },
  {
    key: "revolut",
    label: "Revolut",
    description: "EU / EEA",
    min: 6,
    minCurrency: "EUR",
    icon: "banknote",
  },
];

export const PAYMENT_METHOD_KEYS = PAYMENT_METHODS.map((m) => m.key);

export function getPaymentMethod(key: string): PaymentMethodOption | undefined {
  return PAYMENT_METHODS.find((m) => m.key === key);
}

/** Platform-level deposit bounds, applied on top of per-method minimums. */
export const DEPOSIT_LIMITS = {
  /** Highest per-method minimum in the curated set, as a floor hint for the UI. */
  absoluteMin: 2,
  max: 100_000,
  currency: "USD",
} as const;

export const DEPOSIT_PRESETS = [50, 100, 250, 500, 1000, 5000];

/**
 * How long an unpaid order stays actionable before the reconciliation sweep
 * marks it EXPIRED. Hosted checkouts are abandoned routinely; without this,
 * PENDING rows accumulate forever and the admin queue becomes unreadable.
 */
export const ORDER_EXPIRY_MINUTES = 60;

/**
 * Minimum age before the sweep re-checks an order against the gateway. Short
 * enough to self-heal a dropped webhook quickly, long enough not to race a
 * user who is still on the checkout page.
 */
export const RECONCILE_AFTER_MINUTES = 10;
