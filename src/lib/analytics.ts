/**
 * Lightweight analytics abstraction layer.
 * Supports Google Analytics (gtag) and extensible for Mixpanel, PostHog, etc.
 *
 * Usage:
 *   import { trackEvent, trackPageView } from "@/lib/analytics";
 *   trackEvent("deposit_started", { method: "CRYPTO", amount: 100 });
 *   trackPageView("/dashboard/deposit");
 *
 * Setup:
 *   Add NEXT_PUBLIC_GA_MEASUREMENT_ID to env vars and include the GA script
 *   in your layout via the AnalyticsScript component.
 */

// ─── Types ───
interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

// ─── Google Analytics (gtag.js) ───
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Track a custom event
 */
export function trackEvent(name: string, properties?: EventProperties) {
  // Google Analytics
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, properties);
  }

  // Console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", name, properties);
  }
}

/**
 * Track a page view
 */
export function trackPageView(url: string) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
}

/**
 * Identify a user (for enriched analytics)
 */
export function identifyUser(userId: string, traits?: EventProperties) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("set", "user_properties", {
      user_id: userId,
      ...traits,
    });
  }
}

// ─── Common Event Helpers ───
export const analytics = {
  // Auth events
  signUp: (method: string) => trackEvent("sign_up", { method }),
  login: (method: string) => trackEvent("login", { method }),

  // Deposit events
  depositStarted: (method: string, amount?: number) =>
    trackEvent("deposit_started", { method, amount }),
  depositCompleted: (method: string, amount: number) =>
    trackEvent("deposit_completed", { method, amount }),

  // Withdrawal events
  withdrawalRequested: (amount: number, network: string) =>
    trackEvent("withdrawal_requested", { amount, network }),

  // Copy trading events
  copyTradeStarted: (traderId: string) =>
    trackEvent("copy_trade_started", { trader_id: traderId }),
  copyTradeStopped: (traderId: string) =>
    trackEvent("copy_trade_stopped", { trader_id: traderId }),

  // Engagement events
  walletConnected: (connector: string) =>
    trackEvent("wallet_connected", { connector }),
  pageViewed: (page: string) => trackPageView(page),
};
