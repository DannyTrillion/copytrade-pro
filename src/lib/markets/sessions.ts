/**
 * Market session engine.
 *
 * Answers "is this market open right now, and when does that change?" for the
 * seven categories the platform actually trades. Pure computation from the
 * clock — no API, no key, no network. That matters: this drives a always-on
 * dashboard indicator, and a status pill that depends on a third-party uptime
 * is a status pill that goes blank.
 *
 * All rules are expressed in US Eastern wall-clock time, because that is how
 * the exchanges themselves define them ("the NYSE opens at 9:30 ET" is true in
 * both EST and EDT). We therefore resolve the current ET wall clock once via
 * Intl, then reason in wall-clock minutes. Working in the same frame the rules
 * are written in avoids an entire class of daylight-saving bugs.
 */

export type MarketCategory =
  | "Crypto"
  | "Polymarket"
  | "Forex"
  | "Stocks"
  | "Indices"
  | "Commodities"
  | "Options";

export type SessionState =
  | "OPEN"
  | "CLOSED"
  | "PRE_MARKET"
  | "AFTER_HOURS"
  | "WEEKEND"
  | "HOLIDAY";

export interface MarketSession {
  market: MarketCategory;
  state: SessionState;
  /** True only for the primary trading session, not pre/after hours. */
  isOpen: boolean;
  /** True when any trading is possible, including extended hours. */
  isTradeable: boolean;
  /** Short label for a pill, e.g. "Open", "Pre-market", "Opens in 2h 14m". */
  label: string;
  /** Minutes until the next state change; null when the market never closes. */
  minutesUntilChange: number | null;
  /** What the market becomes at the next change. */
  nextState: SessionState | null;
}

const MINUTES_PER_DAY = 1440;
const ET_ZONE = "America/New_York";

/** Wall-clock position: day of week (0=Sun) plus minutes since ET midnight. */
interface WallClock {
  dow: number;
  minuteOfDay: number;
  /** YYYY-MM-DD in ET, used for holiday lookup. */
  isoDate: string;
}

/**
 * US market holidays when equities/options are fully closed.
 * Without these the pill cheerfully reports "Open" on Christmas morning.
 * Bond-only and half-day sessions are deliberately excluded — they do not
 * change the open/closed answer for the markets shown here.
 */
const FULL_CLOSURES = new Set([
  // 2026
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  // 2027
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
  "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);

const DOW_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/**
 * Intl.DateTimeFormat is comparatively expensive and this runs on a ticking
 * interval, so the formatter is built once rather than per call.
 */
let etFormatter: Intl.DateTimeFormat | null = null;

function getEtFormatter(): Intl.DateTimeFormat {
  if (!etFormatter) {
    etFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: ET_ZONE,
      hour12: false,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return etFormatter;
}

function toWallClock(date: Date): WallClock {
  const parts = getEtFormatter().formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  // "24" appears at midnight under hour12:false in some engines.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));

  return {
    dow: DOW_INDEX[get("weekday")] ?? 0,
    minuteOfDay: hour * 60 + minute,
    isoDate: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

/** Advance a wall clock by whole minutes, rolling the day over as needed. */
function advance(clock: WallClock, minutes: number): WallClock {
  const total = clock.minuteOfDay + minutes;
  const dayShift = Math.floor(total / MINUTES_PER_DAY);

  return {
    dow: (((clock.dow + dayShift) % 7) + 7) % 7,
    minuteOfDay: ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY,
    // Holiday accuracy only matters for "right now"; lookahead uses weekday
    // rules alone, which is why this is left unshifted. See resolveSession.
    isoDate: clock.isoDate,
  };
}

const AT = (hour: number, minute = 0) => hour * 60 + minute;

/** Equity regular session: 09:30–16:00 ET, Mon–Fri. */
const EQUITY_OPEN = AT(9, 30);
const EQUITY_CLOSE = AT(16, 0);
const EQUITY_PRE_OPEN = AT(4, 0);
const EQUITY_AFTER_CLOSE = AT(20, 0);

function isWeekday(dow: number): boolean {
  return dow >= 1 && dow <= 5;
}

/**
 * Resolve state for a market at a given wall-clock position.
 *
 * `checkHolidays` is false during lookahead: we do not know the calendar date
 * of a future step (advance() intentionally does not roll the date), so the
 * lookahead answers on weekday rules alone. The practical effect is that a
 * countdown may point at a session that turns out to be a holiday — a rare,
 * low-harm inaccuracy, and the pill self-corrects once that day arrives.
 */
function resolveSession(
  market: MarketCategory,
  clock: WallClock,
  checkHolidays: boolean
): SessionState {
  const { dow, minuteOfDay } = clock;

  switch (market) {
    // Continuous venues. No session concept at all.
    case "Crypto":
    case "Polymarket":
      return "OPEN";

    // Forex: one continuous week. Opens Sunday 17:00 ET, closes Friday 17:00 ET.
    case "Forex": {
      if (dow === 6) return "WEEKEND";
      if (dow === 0) return minuteOfDay >= AT(17) ? "OPEN" : "WEEKEND";
      if (dow === 5) return minuteOfDay < AT(17) ? "OPEN" : "WEEKEND";
      return "OPEN";
    }

    // CME-style futures: Sunday 18:00 ET through Friday 17:00 ET, with a daily
    // 17:00–18:00 maintenance halt.
    case "Commodities": {
      if (dow === 6) return "WEEKEND";
      if (dow === 0) return minuteOfDay >= AT(18) ? "OPEN" : "WEEKEND";
      if (dow === 5) return minuteOfDay < AT(17) ? "OPEN" : "WEEKEND";
      if (minuteOfDay >= AT(17) && minuteOfDay < AT(18)) return "CLOSED";
      return "OPEN";
    }

    // Cash equities and their derivatives share the NYSE/Nasdaq calendar.
    case "Stocks":
    case "Indices":
    case "Options": {
      if (checkHolidays && FULL_CLOSURES.has(clock.isoDate)) return "HOLIDAY";
      if (!isWeekday(dow)) return "WEEKEND";

      if (minuteOfDay >= EQUITY_OPEN && minuteOfDay < EQUITY_CLOSE) return "OPEN";

      // Options do not trade in extended hours.
      if (market === "Options") return "CLOSED";

      if (minuteOfDay >= EQUITY_PRE_OPEN && minuteOfDay < EQUITY_OPEN) {
        return "PRE_MARKET";
      }
      if (minuteOfDay >= EQUITY_CLOSE && minuteOfDay < EQUITY_AFTER_CLOSE) {
        return "AFTER_HOURS";
      }
      return "CLOSED";
    }
  }
}

/**
 * Minutes until the state changes, found by stepping the wall clock forward.
 *
 * A scan rather than closed-form arithmetic: the rules differ per market and
 * include awkward cases (the Sunday forex open, the futures maintenance hour),
 * and a scan stays correct when a rule is edited without anyone having to
 * re-derive a formula. Each step is integer arithmetic with no Intl call, so
 * a full 8-day search is a fraction of a millisecond.
 */
function minutesUntilChange(
  market: MarketCategory,
  clock: WallClock,
  current: SessionState
): { minutes: number; next: SessionState } | null {
  const HORIZON = 8 * MINUTES_PER_DAY;

  for (let step = 1; step <= HORIZON; step++) {
    const future = advance(clock, step);
    const state = resolveSession(market, future, false);
    if (state !== current) return { minutes: step, next: state };
  }

  return null;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return "moments";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

const STATE_LABEL: Record<SessionState, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  PRE_MARKET: "Pre-market",
  AFTER_HOURS: "After hours",
  WEEKEND: "Weekend",
  HOLIDAY: "Holiday",
};

/** Resolve the full session for one market. */
export function getMarketSession(
  market: MarketCategory,
  now: Date = new Date()
): MarketSession {
  const clock = toWallClock(now);
  const state = resolveSession(market, clock, true);

  const continuous = market === "Crypto" || market === "Polymarket";
  const isOpen = state === "OPEN";
  const isTradeable =
    isOpen || state === "PRE_MARKET" || state === "AFTER_HOURS";

  if (continuous) {
    return {
      market,
      state,
      isOpen: true,
      isTradeable: true,
      label: "24/7",
      minutesUntilChange: null,
      nextState: null,
    };
  }

  const change = minutesUntilChange(market, clock, state);

  // Counting down from days away is noise; show the plain state instead and
  // start the countdown when it becomes actionable.
  const COUNTDOWN_THRESHOLD = 12 * 60;
  let label = STATE_LABEL[state];

  if (change && change.minutes <= COUNTDOWN_THRESHOLD) {
    const verb = change.next === "OPEN" ? "Opens" : isOpen ? "Closes" : "Opens";
    label = `${verb} in ${formatDuration(change.minutes)}`;
  }

  return {
    market,
    state,
    isOpen,
    isTradeable,
    label,
    minutesUntilChange: change?.minutes ?? null,
    nextState: change?.next ?? null,
  };
}

export const ALL_MARKETS: MarketCategory[] = [
  "Crypto",
  "Forex",
  "Stocks",
  "Indices",
  "Commodities",
  "Polymarket",
  "Options",
];

/** Sessions for every market, ordered with open markets first. */
export function getAllMarketSessions(now: Date = new Date()): MarketSession[] {
  return ALL_MARKETS.map((m) => getMarketSession(m, now)).sort((a, b) => {
    if (a.isTradeable !== b.isTradeable) return a.isTradeable ? -1 : 1;
    return a.market.localeCompare(b.market);
  });
}

/** Normalise a free-text market string from the database to a known category. */
export function toMarketCategory(value: string | null | undefined): MarketCategory | null {
  if (!value) return null;
  const match = ALL_MARKETS.find(
    (m) => m.toLowerCase() === value.trim().toLowerCase()
  );
  return match ?? null;
}
