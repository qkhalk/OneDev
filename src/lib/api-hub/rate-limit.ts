/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Stores request timestamps per key in a Map. On each check:
 *  1. Removes timestamps older than the window
 *  2. Counts requests in the current window
 *  3. Allows if count < limit
 *
 * Note: This is per-process. In a multi-instance deployment,
 * use Redis or another shared store instead.
 */

interface RateEntry {
  timestamps: number[]
}

interface RateCheckResult {
  allowed: boolean
  remaining: number
  resetAt: number // epoch ms when the oldest request in window expires
}

export class RateLimiter {
  private limit: number
  private windowMs: number
  private store = new Map<string, RateEntry>()
  /** Periodic cleanup interval (ms) */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.windowMs = windowMs

    // Auto-cleanup stale entries every 5 minutes to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
      // Allow process to exit even if interval is active
      if (this.cleanupInterval && typeof this.cleanupInterval.unref === 'function') {
        this.cleanupInterval.unref()
      }
    }
  }

  /**
   * Check if a request should be allowed for the given key.
   * Side effect: records the current timestamp if allowed.
   */
  check(key: string): RateCheckResult {
    const now = Date.now()
    const windowStart = now - this.windowMs

    let entry = this.store.get(key)
    if (!entry) {
      entry = { timestamps: [] }
      this.store.set(key, entry)
    }

    // Prune old timestamps (sliding window)
    while (entry.timestamps.length > 0 && entry.timestamps[0] < windowStart) {
      entry.timestamps.shift()
    }

    const currentCount = entry.timestamps.length

    if (currentCount >= this.limit) {
      // Rate limited — don't record this request
      const resetAt = entry.timestamps.length > 0
        ? entry.timestamps[0] + this.windowMs
        : now + this.windowMs
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      }
    }

    // Record this request
    entry.timestamps.push(now)

    return {
      allowed: true,
      remaining: this.limit - entry.timestamps.length,
      resetAt: entry.timestamps[0] + this.windowMs,
    }
  }

  /**
   * Peek at current usage without recording a new request.
   */
  peek(key: string): { count: number; remaining: number; resetAt: number } {
    const now = Date.now()
    const windowStart = now - this.windowMs

    const entry = this.store.get(key)
    if (!entry) {
      return { count: 0, remaining: this.limit, resetAt: now + this.windowMs }
    }

    // Prune old timestamps
    while (entry.timestamps.length > 0 && entry.timestamps[0] < windowStart) {
      entry.timestamps.shift()
    }

    return {
      count: entry.timestamps.length,
      remaining: Math.max(0, this.limit - entry.timestamps.length),
      resetAt: entry.timestamps.length > 0
        ? entry.timestamps[0] + this.windowMs
        : now + this.windowMs,
    }
  }

  /**
   * Reset the counter for a specific key (e.g., after key revocation).
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Remove stale entries to prevent unbounded memory growth.
   */
  private cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.windowMs

    for (const [key, entry] of this.store) {
      // Prune old timestamps
      while (entry.timestamps.length > 0 && entry.timestamps[0] < windowStart) {
        entry.timestamps.shift()
      }
      // Remove entry entirely if empty
      if (entry.timestamps.length === 0) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Stop the cleanup interval (useful for tests).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }
}

/**
 * Default limiter: 100 requests per minute.
 * Individual keys may override this via their `rateLimit` field.
 */
export const limiter = new RateLimiter(100, 60_000)

/**
 * Map of per-key limiters for keys with custom rate limits.
 * Keyed by ApiKey.id.
 */
const customLimiters = new Map<string, RateLimiter>()

/**
 * Get or create a rate limiter for a specific key with a custom limit.
 */
export function getKeyLimiter(keyId: string, rateLimit: number): RateLimiter {
  let l = customLimiters.get(keyId)
  if (!l) {
    l = new RateLimiter(rateLimit, 60_000)
    customLimiters.set(keyId, l)
  }
  return l
}

/**
 * Remove a key's custom limiter (call on key revocation).
 */
export function removeKeyLimiter(keyId: string): void {
  const l = customLimiters.get(keyId)
  if (l) {
    l.destroy()
    customLimiters.delete(keyId)
  }
}
