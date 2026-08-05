/**
 * Cache layer for security decisions.
 *
 * The enforcement path runs on every authenticated request, so it must not
 * issue a fresh query each time. This module defines a minimal async interface
 * and ships an in-process TTL+LRU implementation.
 *
 * The interface is intentionally Redis-shaped (async, string keys, namespaced,
 * TTL per entry) so that swapping in a shared store later is a single-file
 * change with no call-site edits.
 *
 * Trade-off of the in-memory implementation: each serverless instance holds its
 * own copy, so an entry written on instance A is invisible to instance B. This
 * is bounded, not unbounded — entries expire after SECURITY_CACHE_TTL_MS
 * (5 seconds), which is the worst-case ban propagation delay across instances.
 * Within a single instance, invalidation on write is immediate. A shared store
 * removes the delay entirely; until one exists, the enforcement path treats
 * cached "allowed" as provisional and re-checks on privileged actions.
 */

import {
  SECURITY_CACHE_MAX_ENTRIES,
  SECURITY_CACHE_TTL_MS,
} from "@/config/security";

export interface SecurityCache {
  get<T>(namespace: string, key: string): Promise<T | undefined>;
  set<T>(namespace: string, key: string, value: T, ttlMs?: number): Promise<void>;
  delete(namespace: string, key: string): Promise<void>;
  /** Drop every entry in a namespace — used after bulk moderation writes. */
  clearNamespace(namespace: string): Promise<void>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function compositeKey(namespace: string, key: string): string {
  return `${namespace}::${key}`;
}

/**
 * TTL + LRU map. Map preserves insertion order, so the oldest key is always
 * the first one iteration yields — that is the eviction victim. Re-inserting
 * on read is what promotes an entry to most-recently-used.
 */
class InMemorySecurityCache implements SecurityCache {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(namespace: string, key: string): Promise<T | undefined> {
    const composite = compositeKey(namespace, key);
    const entry = this.store.get(composite);

    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(composite);
      return undefined;
    }

    // Promote to most-recently-used.
    this.store.delete(composite);
    this.store.set(composite, entry);

    return entry.value as T;
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    ttlMs: number = SECURITY_CACHE_TTL_MS
  ): Promise<void> {
    const composite = compositeKey(namespace, key);

    // Delete first so re-setting an existing key moves it to the tail.
    this.store.delete(composite);

    if (this.store.size >= SECURITY_CACHE_MAX_ENTRIES) {
      this.evictOldest();
    }

    this.store.set(composite, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(namespace: string, key: string): Promise<void> {
    this.store.delete(compositeKey(namespace, key));
  }

  async clearNamespace(namespace: string): Promise<void> {
    const prefix = `${namespace}::`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  private evictOldest(): void {
    // Expired entries are cheaper to drop than live ones, so sweep first and
    // only fall back to LRU eviction if the sweep freed nothing.
    const now = Date.now();
    let freed = false;

    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
        freed = true;
      }
    }

    if (freed) return;

    const oldest = this.store.keys().next();
    if (!oldest.done) this.store.delete(oldest.value);
  }
}

/**
 * Held on globalThis so Next.js dev-mode hot reloads reuse one instance
 * instead of leaking a new cache per reload — the same pattern the Prisma
 * client uses in this codebase.
 */
const globalForCache = globalThis as unknown as {
  securityCache: SecurityCache | undefined;
};

export const securityCache: SecurityCache =
  globalForCache.securityCache ?? new InMemorySecurityCache();

if (process.env.NODE_ENV !== "production") {
  globalForCache.securityCache = securityCache;
}

/**
 * Read-through helper. Collapses the get/compute/set dance that every caller
 * would otherwise repeat.
 *
 * Note: `undefined` results are not cached, since the cache cannot distinguish
 * a cached `undefined` from a miss. Callers needing to cache absence should
 * store an explicit null.
 */
export async function cached<T>(
  namespace: string,
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const hit = await securityCache.get<T>(namespace, key);
  if (hit !== undefined) return hit;

  const value = await compute();
  if (value !== undefined) {
    await securityCache.set(namespace, key, value, ttlMs);
  }

  return value;
}
