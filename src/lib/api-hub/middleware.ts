import { NextResponse } from 'next/server'
import { authenticateKey, validateKeyFormat } from './keys'
import { limiter, getKeyLimiter } from './rate-limit'
import { prisma } from '@/lib/db'

export interface AuthenticatedKey {
  id: string
  name: string
  email: string | null
  scopes: string[]
  rateLimit: number
  enabled: boolean
  createdAt: Date
  lastUsed: Date | null
}

export interface AuthResult {
  authenticated: boolean
  key?: AuthenticatedKey
  error?: string
  statusCode?: number
  headers?: Record<string, string>
}

/**
 * Extract API key from request headers.
 * Supports:
 *   - Authorization: Bearer sk_od_xxx
 *   - X-API-Key: sk_od_xxx
 */
export function extractApiKey(request: Request): string | null {
  // Try X-API-Key header first
  const xApiKey = request.headers.get('x-api-key')
  if (xApiKey) return xApiKey.trim()

  // Try Authorization: Bearer <key>
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (match) return match[1].trim()
  }

  return null
}

/**
 * Authenticate and rate-limit an incoming API request.
 *
 * Steps:
 *  1. Extract key from headers
 *  2. Validate format
 *  3. Look up in DB (hash match)
 *  4. Check rate limit
 *  5. Log usage to DB
 *
 * Returns auth result with key info if successful.
 */
export async function withApiKey(request: Request): Promise<AuthResult> {
  const startTime = Date.now()

  // Step 1: Extract key
  const rawKey = extractApiKey(request)
  if (!rawKey) {
    return {
      authenticated: false,
      error: 'Missing API key. Provide it via "Authorization: Bearer sk_od_xxx" or "X-API-Key: sk_od_xxx" header.',
      statusCode: 401,
    }
  }

  // Step 2: Validate format
  if (!validateKeyFormat(rawKey)) {
    return {
      authenticated: false,
      error: 'Invalid API key format. Keys must start with "sk_od_" followed by 32 alphanumeric characters.',
      statusCode: 401,
    }
  }

  // Step 3: Authenticate
  const key = await authenticateKey(rawKey)
  if (!key) {
    return {
      authenticated: false,
      error: 'Invalid or disabled API key.',
      statusCode: 401,
    }
  }

  // Step 4: Rate limit check
  // Use per-key limiter if custom rate limit, else default
  let rateResult
  if (key.rateLimit !== 100) {
    const keyLimiter = getKeyLimiter(key.id, key.rateLimit)
    rateResult = keyLimiter.check(key.id)
  } else {
    rateResult = limiter.check(key.id)
  }

  if (!rateResult.allowed) {
    const retryAfter = Math.ceil((rateResult.resetAt - Date.now()) / 1000)
    return {
      authenticated: false,
      key,
      error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      statusCode: 429,
      headers: {
        'X-RateLimit-Limit': String(key.rateLimit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(rateResult.resetAt / 1000)),
        'Retry-After': String(retryAfter),
      },
    }
  }

  // Step 5: Log usage (best-effort, non-blocking)
  const endpoint = new URL(request.url).pathname
  const method = request.method
  const responseTime = Date.now() - startTime

  prisma.apiUsage
    .create({
      data: {
        keyId: key.id,
        endpoint,
        method,
        statusCode: 200,
        responseTime,
      },
    })
    .catch(() => {
      /* ignore logging errors */
    })

  return {
    authenticated: true,
    key,
    headers: {
      'X-RateLimit-Limit': String(key.rateLimit),
      'X-RateLimit-Remaining': String(rateResult.remaining),
      'X-RateLimit-Reset': String(Math.floor(rateResult.resetAt / 1000)),
    },
  }
}

/**
 * Create a JSON error response with proper status code and headers.
 */
export function createErrorResponse(
  error: string,
  statusCode: number,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error },
    { status: statusCode, headers: headers || {} }
  )
}

/**
 * Wrapper for API route handlers that require authentication.
 * Usage:
 *   export async function POST(request: Request) {
 *     const auth = await withApiKey(request)
 *     if (!auth.authenticated) return createErrorResponse(auth.error!, auth.statusCode!)
 *     // . handler logic
 *   }
 */
export async function requireApiKey(
  request: Request,
  handler: (key: AuthenticatedKey, request: Request) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await withApiKey(request)

  if (!auth.authenticated) {
    return createErrorResponse(
      auth.error || 'Unauthorized',
      auth.statusCode || 401,
      auth.headers
    )
  }

  try {
    const response = await handler(auth.key!, request)
    // Add rate limit headers to successful responses
    if (auth.headers) {
      for (const [k, v] of Object.entries(auth.headers)) {
        response.headers.set(k, v)
      }
    }
    return response
  } catch (error) {
    console.error('API handler error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
