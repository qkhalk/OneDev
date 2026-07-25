import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'

const PREFIX = 'sk_od_'
const KEY_LENGTH = 32 // random alphanumeric chars after prefix
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Generate a new API key with format: sk_od_<32 random alphanumeric chars>
 */
export function generateApiKey(): string {
  const bytes = randomBytes(KEY_LENGTH)
  let key = PREFIX
  for (let i = 0; i < KEY_LENGTH; i++) {
    key += CHARSET[bytes[i] % CHARSET.length]
  }
  return key
}

/**
 * Hash a key using SHA-256 for secure storage.
 * We never store the plaintext key — only its hash.
 */
export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Validate that a key matches the expected format: sk_od_<32 alphanumeric>
 */
export function validateKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  if (!key.startsWith(PREFIX)) return false
  const body = key.slice(PREFIX.length)
  if (body.length !== KEY_LENGTH) return false
  return /^[A-Za-z0-9]+$/.test(body)
}

/**
 * Authenticate an API key by looking up its hash in the database.
 * Returns the key record if valid & enabled, otherwise null.
 * Also updates lastUsed timestamp (best-effort, non-blocking).
 */
export async function authenticateKey(
  key: string
): Promise<{
  id: string
  name: string
  email: string | null
  scopes: string[]
  rateLimit: number
  enabled: boolean
  createdAt: Date
  lastUsed: Date | null
} | null> {
  if (!validateKeyFormat(key)) return null

  const hash = hashKey(key)
  const record = await prisma.apiKey.findUnique({
    where: { key: hash },
  })

  if (!record || !record.enabled) return null

  // Update lastUsed (fire-and-forget — don't block the request)
  prisma.apiKey
    .update({
      where: { id: record.id },
      data: { lastUsed: new Date() },
    })
    .catch(() => {
      /* ignore errors from lastUsed update */
    })

  return {
    id: record.id,
    name: record.name,
    email: record.email,
    scopes: parseScopes(record.scopes),
    rateLimit: record.rateLimit,
    enabled: record.enabled,
    createdAt: record.createdAt,
    lastUsed: record.lastUsed,
  }
}

/**
 * Parse scopes JSON string into array. Returns [] on failure.
 */
export function parseScopes(scopesJson: string): string[] {
  try {
    const parsed = JSON.parse(scopesJson)
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => typeof s === 'string')
    }
    return []
  } catch {
    return []
  }
}

/**
 * Serialize scopes array into JSON string for storage.
 */
export function serializeScopes(scopes: string[]): string {
  return JSON.stringify(scopes)
}

/**
 * Mask a key for display: show only prefix + last 4 chars.
 * Example: sk_od_****abcd
 */
export function maskKey(key: string): string {
  if (!key || key.length < 8) return '****'
  return key.slice(0, 6) + '****' + key.slice(-4)
}
