/**
 * Minimal user-agent parsing.
 *
 * Deliberately dependency-free. Full UA libraries carry large, frequently
 * updated regex databases, and this is only used for admin display and coarse
 * risk signals — "Chrome on Windows" is enough. Anything requiring precision
 * should use the device fingerprint, not the UA string, which is trivially
 * spoofed and increasingly frozen by browsers.
 *
 * Order is significant throughout: many browsers impersonate others in their
 * UA string (Edge contains "Chrome", Chrome contains "Safari"), so the most
 * specific pattern must be tested first.
 */

export interface ParsedUserAgent {
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: "desktop" | "mobile" | "tablet" | "bot" | null;
}

const BROWSER_PATTERNS: Array<[string, RegExp]> = [
  ["Edge", /edg(?:e|a|ios)?\/([\d.]+)/i],
  ["Opera", /(?:opr|opera)\/([\d.]+)/i],
  ["Samsung Internet", /samsungbrowser\/([\d.]+)/i],
  ["Firefox", /(?:firefox|fxios)\/([\d.]+)/i],
  ["Chrome", /(?:chrome|crios)\/([\d.]+)/i],
  ["Safari", /version\/([\d.]+).*safari/i],
];

const OS_PATTERNS: Array<[string, RegExp]> = [
  ["Windows", /windows nt ([\d.]+)/i],
  ["iOS", /(?:iphone|ipad|ipod).*os ([\d_]+)/i],
  ["macOS", /mac os x ([\d_.]+)/i],
  ["Android", /android ([\d.]+)/i],
  ["Linux", /(linux)/i],
];

/** Marketing names for Windows NT kernel versions. */
const WINDOWS_VERSIONS: Record<string, string> = {
  "10.0": "10/11",
  "6.3": "8.1",
  "6.2": "8",
  "6.1": "7",
};

const BOT_PATTERN = /bot|crawler|spider|crawling|headless|python-requests|curl\/|wget/i;
const TABLET_PATTERN = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i;
const MOBILE_PATTERN = /mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i;

export function parseUserAgent(
  userAgent: string | null | undefined
): ParsedUserAgent {
  const empty: ParsedUserAgent = {
    browser: null,
    browserVersion: null,
    os: null,
    osVersion: null,
    deviceType: null,
  };

  if (!userAgent) return empty;

  const ua = userAgent.slice(0, 512);

  if (BOT_PATTERN.test(ua)) {
    return { ...empty, deviceType: "bot" };
  }

  let browser: string | null = null;
  let browserVersion: string | null = null;

  for (const [name, pattern] of BROWSER_PATTERNS) {
    const match = pattern.exec(ua);
    if (match) {
      browser = name;
      browserVersion = match[1] ?? null;
      break;
    }
  }

  let os: string | null = null;
  let osVersion: string | null = null;

  for (const [name, pattern] of OS_PATTERNS) {
    const match = pattern.exec(ua);
    if (match) {
      os = name;
      // iOS and macOS report versions with underscores: "17_1_2".
      const version = match[1]?.replace(/_/g, ".") ?? null;
      osVersion =
        name === "Windows" && version ? WINDOWS_VERSIONS[version] ?? version : version;
      if (name === "Linux") osVersion = null;
      break;
    }
  }

  const deviceType: ParsedUserAgent["deviceType"] = TABLET_PATTERN.test(ua)
    ? "tablet"
    : MOBILE_PATTERN.test(ua)
      ? "mobile"
      : "desktop";

  return { browser, browserVersion, os, osVersion, deviceType };
}

/** Compact label for admin tables, e.g. "Chrome 120 · macOS 14.2". */
export function formatUserAgent(userAgent: string | null | undefined): string {
  const parsed = parseUserAgent(userAgent);
  if (!parsed.browser && !parsed.os) return "Unknown";

  const browser = parsed.browser
    ? `${parsed.browser}${parsed.browserVersion ? ` ${parsed.browserVersion.split(".")[0]}` : ""}`
    : "Unknown browser";

  const os = parsed.os
    ? `${parsed.os}${parsed.osVersion ? ` ${parsed.osVersion}` : ""}`
    : "Unknown OS";

  return `${browser} · ${os}`;
}
