"use client";

/**
 * Client-side device fingerprinting.
 *
 * Produces a stable identifier for the browser+device combination, used as a
 * correlation signal for ban evasion and multi-account detection.
 *
 * WHAT THIS IS NOT: proof of identity. Everything here is client-controlled and
 * defeatable — a fresh profile, incognito, or an anti-detect browser produces a
 * new id. It is a *cost* imposed on evasion, not a wall. Server-side code must
 * weight it, never treat it as conclusive. See lib/security/devices.ts.
 *
 * Two components are combined:
 *
 *  1. A random persistent id in localStorage. Strong while it survives, but
 *     cleared by the user wiping site data.
 *  2. A derived fingerprint from stable device characteristics. Weaker
 *     individually, but survives storage clearing and reconnects a returning
 *     device to its history.
 *
 * Deliberately excluded: canvas and WebGL fingerprinting, and audio-context
 * probing. They raise entropy but are the techniques anti-fingerprinting
 * measures target first, are unreliable across browser versions, and carry
 * privacy implications disproportionate to the gain here.
 */

const STORAGE_KEY = "__dvc_id";
const HEADER_NAME = "x-device-id";

/** FNV-1a — small, fast, dependency-free, and sufficient for a non-cryptographic id. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts, avoiding float precision loss.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

/**
 * Characteristics that are stable for a given device but vary across devices.
 * Chosen for stability: anything that changes when a user resizes a window,
 * rotates a phone, or travels would produce a new id every session and make
 * the signal useless.
 */
function collectSignals(): string {
  if (typeof window === "undefined") return "";

  const nav = window.navigator;
  const screen = window.screen;

  const signals: (string | number | undefined)[] = [
    nav.userAgent,
    nav.language,
    // Language *list* is more distinctive than the primary language alone.
    Array.isArray(nav.languages) ? nav.languages.join(",") : "",
    nav.hardwareConcurrency,
    // Not exposed by Safari or Firefox; contributes entropy where present.
    (nav as Navigator & { deviceMemory?: number }).deviceMemory,
    nav.maxTouchPoints,
    nav.platform,
    // Screen dimensions, not window dimensions — these do not change on resize.
    screen.width,
    screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Offset alone would shift with daylight saving; the IANA zone above is
    // stable, so this is only a secondary signal.
    new Date().getTimezoneOffset(),
  ];

  return signals.map((s) => String(s ?? "")).join("|");
}

/**
 * Read the persistent id, generating and storing one on first visit.
 * Returns null when storage is unavailable (private mode, blocked cookies), in
 * which case the derived fingerprint alone carries the signal.
 */
function getPersistentId(): string | null {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

    window.localStorage.setItem(STORAGE_KEY, generated);
    return generated;
  } catch {
    return null;
  }
}

let cachedDeviceId: string | null = null;

/**
 * The device identifier for this browser. Computed once per page load and
 * memoised — the inputs cannot change without a reload.
 */
export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  if (typeof window === "undefined") return "";

  const persistent = getPersistentId();
  const derived = fnv1a(collectSignals());

  // Both parts are included so the server can still correlate on the derived
  // half after a user clears storage and the persistent half is regenerated.
  cachedDeviceId = persistent ? `${persistent}.${derived}` : `anon.${derived}`;

  return cachedDeviceId;
}

/** Header object to merge into a fetch call. Empty on the server. */
export function deviceHeader(): Record<string, string> {
  const id = getDeviceId();
  return id ? { [HEADER_NAME]: id } : {};
}

/**
 * fetch wrapper that attaches the device header.
 * Use for any request whose server handler participates in enforcement.
 */
export function fetchWithDevice(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...deviceHeader() },
  });
}
