import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  generateApiKey,
  hashKey,
  maskKey,
  parseScopes,
  serializeScopes,
} from '@/lib/api-hub/keys'

/**
 * GET /api/hub/keys
 * List all API keys (masked, never showing full key).
 */
export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usage: true },
        },
      },
    })

    const result = keys.map((k) => ({
      id: k.id,
      name: k.name,
      email: k.email,
      keyPreview: maskKey(k.key), // hash-based preview, but consistent
      scopes: parseScopes(k.scopes),
      rateLimit: k.rateLimit,
      enabled: k.enabled,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed,
      usageCount: (k as any)._count?.usage || 0,
    }))

    return NextResponse.json({ keys: result, total: result.length })
  } catch (error) {
    console.error('Failed to list API keys:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve API keys' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/hub/keys
 * Create a new API key.
 * Returns the full plaintext key ONCE (never again).
 *
 * Body: { name: string, email?: string, scopes?: string[], rateLimit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    if (!body || !body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Field "name" is required and must be a string.' },
        { status: 400 }
      )
    }

    // Validate scopes
    let scopes: string[] = []
    if (body.scopes) {
      if (!Array.isArray(body.scopes)) {
        return NextResponse.json(
          { error: 'Field "scopes" must be an array of strings.' },
          { status: 400 }
        )
      }
      scopes = body.scopes.filter((s: unknown) => typeof s === 'string')
    }

    // Validate rateLimit
    let rateLimit = 100
    if (body.rateLimit !== undefined) {
      if (typeof body.rateLimit !== 'number' || body.rateLimit < 1 || body.rateLimit > 10000) {
        return NextResponse.json(
          { error: 'Field "rateLimit" must be a number between 1 and 10000.' },
          { status: 400 }
        )
      }
      rateLimit = body.rateLimit
    }

    // Validate email
    let email: string | null = null
    if (body.email) {
      if (typeof body.email !== 'string' || !body.email.includes('@')) {
        return NextResponse.json(
          { error: 'Field "email" must be a valid email address.' },
          { status: 400 }
        )
      }
      email = body.email
    }

    // Generate new key
    const plaintextKey = generateApiKey()
    const hashedKey = hashKey(plaintextKey)

    // Store hash only
    const record = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        name: body.name.trim(),
        email,
        scopes: serializeScopes(scopes),
        rateLimit,
        enabled: true,
      },
    })

    // Return full key — this is the ONLY time it will be visible
    return NextResponse.json(
      {
        id: record.id,
        name: record.name,
        email: record.email,
        key: plaintextKey, // FULL KEY — save this, it won't be shown again
        keyPreview: maskKey(plaintextKey),
        scopes,
        rateLimit: record.rateLimit,
        enabled: record.enabled,
        createdAt: record.createdAt,
        warning:
          'Store this key securely. It will not be shown again. If lost, you must generate a new key.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create API key:', error)
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}
