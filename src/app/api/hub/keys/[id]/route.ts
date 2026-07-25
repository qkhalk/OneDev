import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseScopes, serializeScopes, maskKey } from '@/lib/api-hub/keys'
import { removeKeyLimiter } from '@/lib/api-hub/rate-limit'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/hub/keys/[id]
 * Get key details + usage statistics.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const key = await prisma.apiKey.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usage: true },
        },
      },
    })

    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Get usage stats
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const usageStats = await prisma.apiUsage.aggregate({
      where: {
        keyId: id,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
      _avg: { responseTime: true },
      _min: { responseTime: true },
      _max: { responseTime: true },
    })

    const errorCount = await prisma.apiUsage.count({
      where: {
        keyId: id,
        createdAt: { gte: thirtyDaysAgo },
        statusCode: { gte: 400 },
      },
    })

    // Top endpoints used
    const topEndpoints = await prisma.apiUsage.groupBy({
      by: ['endpoint'],
      where: {
        keyId: id,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
      orderBy: { _count: { endpoint: 'desc' } },
      take: 10,
    })

    return NextResponse.json({
      key: {
        id: key.id,
        name: key.name,
        email: key.email,
        keyPreview: maskKey(key.key),
        scopes: parseScopes(key.scopes),
        rateLimit: key.rateLimit,
        enabled: key.enabled,
        createdAt: key.createdAt,
        lastUsed: key.lastUsed,
        totalUsage: (key as any)._count?.usage || 0,
      },
      stats: {
        last30Days: {
          totalRequests: usageStats._count,
          avgResponseTime: Math.round(usageStats._avg.responseTime || 0),
          minResponseTime: usageStats._min.responseTime || 0,
          maxResponseTime: usageStats._max.responseTime || 0,
          errorCount,
          errorRate:
            usageStats._count > 0
              ? ((errorCount / usageStats._count) * 100).toFixed(2) + '%'
              : '0%',
        },
        topEndpoints: topEndpoints.map((e: any) => ({
          endpoint: e.endpoint,
          count: e._count?.endpoint || 0,
        })),
      },
    })
  } catch (error) {
    console.error('Failed to get API key details:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve API key' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/hub/keys/[id]
 * Update key fields (name, email, scopes, rateLimit, enabled).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ error: 'Request body is required' }, { status: 400 })
    }

    // Check existence
    const existing = await prisma.apiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Field "name" must be a non-empty string.' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.email !== undefined) {
      if (body.email !== null && (typeof body.email !== 'string' || !body.email.includes('@'))) {
        return NextResponse.json(
          { error: 'Field "email" must be a valid email or null.' },
          { status: 400 }
        )
      }
      updateData.email = body.email
    }

    if (body.scopes !== undefined) {
      if (!Array.isArray(body.scopes)) {
        return NextResponse.json(
          { error: 'Field "scopes" must be an array of strings.' },
          { status: 400 }
        )
      }
      updateData.scopes = serializeScopes(
        body.scopes.filter((s: unknown) => typeof s === 'string')
      )
    }

    if (body.rateLimit !== undefined) {
      if (typeof body.rateLimit !== 'number' || body.rateLimit < 1 || body.rateLimit > 10000) {
        return NextResponse.json(
          { error: 'Field "rateLimit" must be a number between 1 and 10000.' },
          { status: 400 }
        )
      }
      updateData.rateLimit = body.rateLimit
    }

    if (body.enabled !== undefined) {
      if (typeof body.enabled !== 'boolean') {
        return NextResponse.json(
          { error: 'Field "enabled" must be a boolean.' },
          { status: 400 }
        )
      }
      updateData.enabled = body.enabled
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: updateData,
    })

    // If key was disabled, remove its rate limiter
    if (body.enabled === false) {
      removeKeyLimiter(id)
    }

    return NextResponse.json({
      key: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        keyPreview: maskKey(updated.key),
        scopes: parseScopes(updated.scopes),
        rateLimit: updated.rateLimit,
        enabled: updated.enabled,
        createdAt: updated.createdAt,
        lastUsed: updated.lastUsed,
      },
      message: 'API key updated successfully',
    })
  } catch (error) {
    console.error('Failed to update API key:', error)
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/hub/keys/[id]
 * Revoke (permanently delete) an API key.
 * All associated usage logs are also deleted (cascade).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    const existing = await prisma.apiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Remove rate limiter for this key
    removeKeyLimiter(id)

    // Delete key (cascade deletes usage logs)
    await prisma.apiKey.delete({ where: { id } })

    return NextResponse.json({
      message: 'API key revoked successfully',
      id,
    })
  } catch (error) {
    console.error('Failed to delete API key:', error)
    return NextResponse.json(
      { error: 'Failed to revoke API key' },
      { status: 500 }
    )
  }
}
