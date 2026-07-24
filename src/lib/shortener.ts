/**
 * Generate a random alias for short links.
 * Uses alphanumeric characters (lowercase + digits).
 */
export function generateAlias(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : require('crypto')
  const bytes = cryptoObj.randomBytes(length)
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length]
  }
  return result
}

/**
 * Validate that a string is a proper HTTP/HTTPS URL.
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validate that an alias contains only URL-safe characters.
 */
export function validateAlias(alias: string): boolean {
  return /^[a-zA-Z0-9_-]{2,50}$/.test(alias)
}

/**
 * Format click count with thousand separators / compact notation.
 */
export function formatClicks(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

/**
 * Format a date for display (relative + absolute).
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHour < 24) return `${diffHour} giờ trước`
  if (diffDay < 30) return `${diffDay} ngày trước`

  return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Check if a short link has expired.
 */
export function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false
  const d = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return d.getTime() < Date.now()
}

/**
 * Detect device type from User-Agent string.
 */
export function detectDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown'
  if (/Mobile|Android|iPhone/i.test(userAgent)) return 'Mobile'
  if (/iPad|Tablet/i.test(userAgent)) return 'Tablet'
  return 'Desktop'
}

/**
 * Build the full short URL for a given alias.
 */
export function buildShortUrl(alias: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3100')
  return `${base}/${alias}`
}
