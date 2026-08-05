/**
 * IP address parsing, normalisation and CIDR matching for IPv4 and IPv6.
 *
 * Enforcement compares addresses by hash for O(1) exact lookups, which only
 * works if every representation of the same address normalises identically —
 * `::ffff:192.168.1.1`, `192.168.001.1` and `192.168.1.1` must all collapse to
 * one canonical string before hashing. That is this module's main job.
 *
 * Ranges are handled separately: CIDR blocks cannot be matched by equality, so
 * they are evaluated numerically via BigInt prefix comparison. The admin-curated
 * range set is small and cached, so this stays cheap.
 */

export type IpFamily = "ipv4" | "ipv6";

export interface ParsedIp {
  /** Canonical text form, safe to hash and to display. */
  normalized: string;
  family: IpFamily;
  /** Numeric value — 32-bit for IPv4, 128-bit for IPv6. */
  value: bigint;
}

export interface ParsedCidr {
  network: bigint;
  prefixLength: number;
  family: IpFamily;
  normalized: string;
}

const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV4_BITS = 32;
const IPV6_BITS = 128;
const IPV6_GROUPS = 8;

/**
 * Headers that may carry the originating client address, most trustworthy
 * first. Platform-injected headers are preferred over `x-forwarded-for`
 * because the latter is client-writable and only trustworthy after the
 * proxy has appended to it.
 */
const CLIENT_IP_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-real-ip",
  "x-vercel-forwarded-for",
  "x-forwarded-for",
] as const;

function parseIpv4(input: string): ParsedIp | null {
  const match = IPV4_PATTERN.exec(input);
  if (!match) return null;

  let value = 0n;
  const octets: number[] = [];

  for (let i = 1; i <= 4; i++) {
    const octet = Number(match[i]);
    // Reject 256+ and leading-zero forms like "010", which some resolvers
    // interpret as octal and which would otherwise alias to a different address.
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    if (match[i].length > 1 && match[i][0] === "0") return null;
    octets.push(octet);
    value = (value << 8n) | BigInt(octet);
  }

  return { normalized: octets.join("."), family: "ipv4", value };
}

function parseIpv6(input: string): ParsedIp | null {
  let text = input.toLowerCase();

  // Strip a zone index (fe80::1%eth0) — it is link-local scope, not identity.
  const zoneIndex = text.indexOf("%");
  if (zoneIndex !== -1) text = text.slice(0, zoneIndex);

  if (!text.includes(":")) return null;

  // An IPv4-mapped or IPv4-compatible suffix (::ffff:192.168.1.1) refers to a
  // genuine IPv4 host. Collapse it to IPv4 so both spellings hash alike.
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const embedded = parseIpv4(tail);
    if (!embedded) return null;
    const prefix = text.slice(0, lastColon + 1);
    if (prefix === "::ffff:" || prefix === "::") {
      return embedded;
    }
    // Any other prefix is a real IPv6 address that merely ends in dotted quad;
    // rewrite the tail as two hex groups and carry on.
    const high = (embedded.value >> 16n) & 0xffffn;
    const low = embedded.value & 0xffffn;
    text = `${prefix}${high.toString(16)}:${low.toString(16)}`;
  }

  const doubleColonCount = (text.match(/::/g) || []).length;
  if (doubleColonCount > 1) return null;

  let groups: string[];

  if (doubleColonCount === 1) {
    const [headText, tailText] = text.split("::");
    const head = headText ? headText.split(":") : [];
    const tailGroups = tailText ? tailText.split(":") : [];
    const missing = IPV6_GROUPS - head.length - tailGroups.length;
    if (missing < 1) return null;
    groups = [...head, ...Array<string>(missing).fill("0"), ...tailGroups];
  } else {
    groups = text.split(":");
  }

  if (groups.length !== IPV6_GROUPS) return null;

  let value = 0n;
  const canonical: number[] = [];

  for (const group of groups) {
    if (group.length === 0 || group.length > 4 || !/^[0-9a-f]+$/.test(group)) {
      return null;
    }
    const parsed = parseInt(group, 16);
    canonical.push(parsed);
    value = (value << 16n) | BigInt(parsed);
  }

  return { normalized: compressIpv6(canonical), family: "ipv6", value };
}

/**
 * RFC 5952 canonical form: lowercase, leading zeros dropped, and the single
 * longest run of zero groups (length >= 2) replaced by `::`.
 */
function compressIpv6(groups: number[]): string {
  let bestStart = -1;
  let bestLength = 0;
  let runStart = -1;
  let runLength = 0;

  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === 0) {
      if (runStart === -1) runStart = i;
      runLength++;
      if (runLength > bestLength) {
        bestStart = runStart;
        bestLength = runLength;
      }
    } else {
      runStart = -1;
      runLength = 0;
    }
  }

  const hex = groups.map((g) => g.toString(16));

  if (bestLength < 2) return hex.join(":");

  const head = hex.slice(0, bestStart).join(":");
  const tail = hex.slice(bestStart + bestLength).join(":");
  return `${head}::${tail}`;
}

/**
 * Parse an address of either family into canonical form.
 * Returns null for anything unparseable — callers must treat that as
 * "no usable address" rather than as a match.
 */
export function parseIp(input: string | null | undefined): ParsedIp | null {
  if (!input) return null;

  let text = input.trim();
  if (!text) return null;

  // Unwrap the bracketed form used in authority components: [::1]:443
  if (text.startsWith("[")) {
    const closing = text.indexOf("]");
    if (closing === -1) return null;
    text = text.slice(1, closing);
  } else {
    // Strip a trailing port from IPv4 only — a bare IPv6 address is all colons,
    // so splitting on ":" would corrupt it.
    const colonCount = (text.match(/:/g) || []).length;
    if (colonCount === 1 && text.includes(".")) {
      text = text.slice(0, text.indexOf(":"));
    }
  }

  return parseIpv4(text) ?? parseIpv6(text);
}

/** Canonical text form, or null when the input is not an address. */
export function normalizeIp(input: string | null | undefined): string | null {
  return parseIp(input)?.normalized ?? null;
}

export function isIpv6(input: string | null | undefined): boolean {
  return parseIp(input)?.family === "ipv6";
}

/**
 * Parse CIDR notation ("10.0.0.0/8", "2001:db8::/32"). A bare address is
 * accepted and treated as a single-host range.
 */
export function parseCidr(input: string | null | undefined): ParsedCidr | null {
  if (!input) return null;

  const text = input.trim();
  const slash = text.lastIndexOf("/");

  if (slash === -1) {
    const single = parseIp(text);
    if (!single) return null;
    return {
      network: single.value,
      prefixLength: single.family === "ipv4" ? IPV4_BITS : IPV6_BITS,
      family: single.family,
      normalized: single.normalized,
    };
  }

  const address = parseIp(text.slice(0, slash));
  if (!address) return null;

  const prefixLength = Number(text.slice(slash + 1));
  const maxBits = address.family === "ipv4" ? IPV4_BITS : IPV6_BITS;

  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > maxBits) {
    return null;
  }

  // Zero out host bits so equivalent spellings of the same block
  // (10.0.0.5/8 and 10.0.0.0/8) produce an identical network value.
  const hostBits = BigInt(maxBits - prefixLength);
  const network = (address.value >> hostBits) << hostBits;

  return {
    network,
    prefixLength,
    family: address.family,
    normalized: `${address.normalized}/${prefixLength}`,
  };
}

/** True when `ip` falls inside `cidr`. Families must match. */
export function ipInCidr(ip: ParsedIp, cidr: ParsedCidr): boolean {
  if (ip.family !== cidr.family) return false;

  const maxBits = ip.family === "ipv4" ? IPV4_BITS : IPV6_BITS;
  const hostBits = BigInt(maxBits - cidr.prefixLength);

  return (ip.value >> hostBits) === (cidr.network >> hostBits);
}

/**
 * Extract the originating client address from request headers.
 *
 * `x-forwarded-for` is a comma-separated chain where the leftmost entry is the
 * client as reported by the first proxy. On Vercel the edge rewrites this
 * header, so the leftmost value is trustworthy; behind an arbitrary reverse
 * proxy it is client-spoofable and should be treated as advisory.
 */
export function getClientIp(headers: Headers): string | null {
  for (const header of CLIENT_IP_HEADERS) {
    const raw = headers.get(header);
    if (!raw) continue;

    for (const candidate of raw.split(",")) {
      const parsed = parseIp(candidate);
      if (parsed) return parsed.normalized;
    }
  }

  return null;
}

/**
 * Approximate geolocation from platform-injected headers.
 * Vercel populates these at the edge at no cost; other hosts may not, in
 * which case every field is null and the risk engine simply skips geo rules.
 */
export interface RequestGeo {
  country: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function getRequestGeo(headers: Headers): RequestGeo {
  const decode = (value: string | null): string | null => {
    if (!value) return null;
    try {
      // Vercel percent-encodes city names containing non-ASCII characters.
      return decodeURIComponent(value) || null;
    } catch {
      return value;
    }
  };

  const toCoord = (value: string | null): number | null => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    country: headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || null,
    city: decode(headers.get("x-vercel-ip-city")),
    region: headers.get("x-vercel-ip-country-region") || null,
    latitude: toCoord(headers.get("x-vercel-ip-latitude")),
    longitude: toCoord(headers.get("x-vercel-ip-longitude")),
  };
}
