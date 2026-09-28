import { getMarketSession } from "../src/lib/markets/sessions";

let pass = 0, fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}\n      expected: ${expected}\n      actual:   ${actual}`); }
}
const et = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", month: "short", day: "numeric", hour12: false });

console.log("\n── US equities (NYSE calendar) ──");
for (const [utc, expected] of [
  ["2026-09-30T14:00:00Z", "OPEN"],        // 10:00 EDT Wed
  ["2026-09-30T12:00:00Z", "PRE_MARKET"],  // 08:00 EDT
  ["2026-09-30T21:00:00Z", "AFTER_HOURS"], // 17:00 EDT
  ["2026-09-30T06:00:00Z", "CLOSED"],      // 02:00 EDT
  ["2026-10-03T16:00:00Z", "WEEKEND"],     // Sat
  ["2026-12-25T15:00:00Z", "HOLIDAY"],     // Christmas
  ["2026-01-19T15:00:00Z", "HOLIDAY"],     // MLK Day (EST)
] as const) {
  check(`${et(utc)} → ${expected}`, getMarketSession("Stocks", new Date(utc)).state, expected);
}

console.log("\n── Options: no extended hours ──");
check("08:00 EDT weekday", getMarketSession("Options", new Date("2026-09-30T12:00:00Z")).state, "CLOSED");
check("10:00 EDT weekday", getMarketSession("Options", new Date("2026-09-30T14:00:00Z")).state, "OPEN");

console.log("\n── Forex: Sun 17:00 ET → Fri 17:00 ET ──");
for (const [utc, expected] of [
  ["2026-10-03T16:00:00Z", "WEEKEND"], // Sat
  ["2026-10-04T20:00:00Z", "WEEKEND"], // Sun 16:00 EDT, before open
  ["2026-10-04T22:00:00Z", "OPEN"],    // Sun 18:00 EDT, after open
  ["2026-10-02T22:00:00Z", "WEEKEND"], // Fri 18:00 EDT, after close
  ["2026-10-02T18:00:00Z", "OPEN"],    // Fri 14:00 EDT
  ["2026-09-30T06:00:00Z", "OPEN"],    // Wed overnight — forex is continuous
] as const) {
  check(`${et(utc)} → ${expected}`, getMarketSession("Forex", new Date(utc)).state, expected);
}

console.log("\n── Commodities: daily 17:00–18:00 ET halt ──");
check("17:30 EDT Wed → CLOSED", getMarketSession("Commodities", new Date("2026-09-30T21:30:00Z")).state, "CLOSED");
check("18:30 EDT Wed → OPEN", getMarketSession("Commodities", new Date("2026-09-30T22:30:00Z")).state, "OPEN");

console.log("\n── Continuous venues ──");
for (const utc of ["2026-10-03T16:00:00Z", "2026-12-25T15:00:00Z", "2026-09-30T06:00:00Z"]) {
  check(`Crypto @ ${et(utc)}`, getMarketSession("Crypto", new Date(utc)).isOpen, true);
  check(`Polymarket @ ${et(utc)}`, getMarketSession("Polymarket", new Date(utc)).isOpen, true);
}

console.log("\n── DST: rules hold in EST and EDT alike ──");
check("Jan (EST) 10:00 → OPEN", getMarketSession("Stocks", new Date("2026-01-14T15:00:00Z")).state, "OPEN");
check("Jul (EDT) 10:00 → OPEN", getMarketSession("Stocks", new Date("2026-07-15T14:00:00Z")).state, "OPEN");
check("Jan (EST) 09:00 → PRE",  getMarketSession("Stocks", new Date("2026-01-14T14:00:00Z")).state, "PRE_MARKET");

console.log("\n── Countdown ──");
const preOpen = getMarketSession("Stocks", new Date("2026-09-30T13:00:00Z")); // 09:00 EDT, 30m to open
check("30m before open → minutes", preOpen.minutesUntilChange, 30);
check("30m before open → next", preOpen.nextState, "OPEN");
check("label counts down", preOpen.label, "Opens in 30m");
console.log(`  (label sample: "${getMarketSession("Stocks", new Date("2026-09-30T14:00:00Z")).label}")`);

console.log(`\n${"─".repeat(46)}\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
