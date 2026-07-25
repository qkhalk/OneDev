import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/hub/keys/[id]/usage
 * Get paginated usage logs for a specific API key.
 *
 * Query params:
 *   - page: page number (default 1)
 *   - limit: items per page (default 50, max 200)
 *   - endpoint: filter by endpoint pattern (supports * wildcard)
 *   - method: filter by HTTP method
 *   - status: filter by status code group (2xx, 4xx, 5xx)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const skip = (page - 1) * limit

    // Check key exists
    const keyExists = await prisma.apiKey.findUnique({
      where: { id },
      select: { id: true, name: true },
    })

    if (!keyExists) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Build where clause
    const where: Record<string, unknown> = { keyId: id }

    // Endpoint filter (supports wildcard with *)
    const endpointFilter = searchParams.get('endpoint')
    if (endpointFilter) {
      if (endpointFilter.includes('*')) {
        // Convert glob to SQL LIKE pattern
        const pattern = endpointFilter.replace(/\*/g, '%')
        where.endpoint = { contains: pattern.replace(/%/g, '') }
      } else {
        where.endpoint = endpointFilter
      }
    }

    // Method filter
    const methodFilter = searchParams.get('method')
    if (methodFilter) {
      where.method = methodFilter.toUpperCase()
    }

    // Status code filter
    const statusFilter = searchParams.get('status')
    if (statusFilter) {
      const statusGroup = statusFilter.charAt(0)
      if (statusGroup === '2') {
        where.statusCode = { gte: 200, lt: 300 }
      } else if (statusGroup === '3') {
        where.statusCode = { gte: 300, lt: 400 }
      } else if (statusGroup === '4') {
        where.statusCode = { gte: 400, lt: 500 }
      } else if (statusGroup === '5') {
        where.statusCode = { gte: 500, lt: 600 }
      }
    }

    // Date range filter
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate || endDate) {
      const dateRange: Record<string, Date> = {}
      if (startDate) dateRange.gte = new Date(startDate)
      if (endDate) dateRange.lte = new Date(endDate)
      where.createdAt = dateRange
    }

    // Fetch usage logs
    const [usage, total] = await Promise.all([
      prisma.apiUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.apiUsage.count({ where }),
    ])

    // Summary stats for current filter
    const summary = await prisma.apiUsage.aggregate({
      where,
      _count: true,
      _avg: { responseTime: true },
    })

    const errorCount = await prisma.apiUsage.count({
      where: {
        ...where,
        statusCode: { gte: 400 },
      },
    })

    return NextResponse.json({
      key: { id: keyExists.id, name: keyExists.name },
      usage,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      summary: {
        totalRequests: summary._count,
        avgResponseTime: Math.round(summary._avg.responseTime || 0),
        errorCount,
        errorRate:
          summary._count > 0
            ? ((errorCount / summary._count) * 100).toFixed(2) + '%'
            : '0%',
      },
    })
  } catch (error) {
    console.error('Failed to get usage logs:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve usage logs' },
      { status: 500 }
    )
  }
}
