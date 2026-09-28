"use client";

import { useEffect, useState } from "react";
import {
  getAllMarketSessions,
  getMarketSession,
  type MarketCategory,
  type MarketSession,
} from "@/lib/markets/sessions";

/**
 * Re-resolve sessions on a timer so countdowns tick and a market visibly
 * flips at the bell without a page refresh.
 *
 * 30s rather than 1s: labels are minute-resolution, so a faster tick would
 * re-render the tree for no visible change. The first tick is aligned to the
 * next wall-clock minute so "Opens in 3m" changes when the minute changes
 * rather than at some arbitrary offset from page load.
 */
const TICK_MS = 30_000;

function useNow(): Date {
  // Seeded lazily and identically on client mount. Sessions are rendered
  // client-side only (see MarketStatusBar) because the server's clock frame
  // and the viewer's are not guaranteed to agree at a session boundary.
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    const align = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), TICK_MS);
    }, msToNextMinute);

    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, []);

  return now;
}

/** All market sessions, open markets first, refreshed on a timer. */
export function useMarketSessions(): MarketSession[] {
  const now = useNow();
  return getAllMarketSessions(now);
}

/** A single market's session, refreshed on a timer. */
export function useMarketSession(market: MarketCategory): MarketSession {
  const now = useNow();
  return getMarketSession(market, now);
}
