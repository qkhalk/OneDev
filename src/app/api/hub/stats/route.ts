import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/hub/stats
 * Overall API usage statistics.
 *
 * Returns:
 *   - Total requests (all time + last 30 days)
 *   - Unique active keys
 *   - Top endpoints
 *   - Error rate
 *   - Time series: requests per day (last 30 days)
 *   - Status code distribution
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Date range (default: last 30 days)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Run all queries in parallel
    const [
      totalRequests,
      recentRequests,
      totalKeys,
      activeKeys,
      totalEnabledKeys,
      topEndpoints,
      statusCodes,
      avgResponseTime,
      errorCount,
      recentErrors,
    ] = await Promise.all([
      // Total requests (all time)
      prisma.apiUsage.count(),

      // Recent requests
      prisma.apiUsage.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Total keys
      prisma.apiKey.count(),

      // Active keys (used in last 30 days)
      prisma.apiKey.count({
        where: {
          lastUsed: { gte: startDate },
          enabled: true,
        },
      }),

      // Total enabled keys
      prisma.apiKey.count({
        where: { enabled: true },
      }),

      // Top endpoints
      prisma.apiUsage.groupBy({
        by: ['endpoint'],
        where: { createdAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { endpoint: 'desc' } },
        take: 10,
      }),

      // Status code distribution
      prisma.apiUsage.groupBy({
        by: ['statusCode'],
        where: { createdAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { statusCode: 'desc' } },
      }),

      // Average response time
      prisma.apiUsage.aggregate({
        where: { createdAt: { gte: startDate } },
        _avg: { responseTime: true },
      }),

      // Error count (4xx + 5xx)
      prisma.apiUsage.count({
        where: {
          createdAt: { gte: startDate },
          statusCode: { gte: 400 },
        },
      }),

      // Recent errors (last 10)
      prisma.apiUsage.findMany({
        where: {
          createdAt: { gte: startDate },
          statusCode: { gte: 400 },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          key: {
            select: { name: true },
          },
        },
      }),
    ])

    // Build time series: requests per day
    const timeSeriesRaw = await prisma.apiUsage.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    })

    // Group by day
    const dayMap = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dayMap.set(key, 0)
    }

    for (const record of timeSeriesRaw) {
      const dayKey = record.createdAt.toISOString().slice(0, 10)
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1)
    }

    const timeSeries = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top keys by usage
    const topKeys = await prisma.apiUsage.groupBy({
      by: ['keyId'],
      where: { createdAt: { gte: startDate } },
      _count: true,
      orderBy: { _count: { keyId: 'desc' } },
      take: 5,
    })

    const keyDetails = await prisma.apiKey.findMany({
      where: { id: { in: topKeys.map((k) => k.keyId) } },
      select: { id: true, name: true },
    })

    const topKeysWithDetails = topKeys.map((k) => {
      const detail = keyDetails.find((d) => d.id === k.keyId)
      return {
        keyId: k.keyId,
        keyName: detail?.name || 'Unknown',
        requestCount: (k as any)._count?.keyId || 0,
      }
    })

    // Status code groups
    const statusGroups = {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    }
    for (const s of statusCodes) {
      const group = `${Math.floor(s.statusCode / 100)}xx`
      if (group in statusGroups) {
        statusGroups[group as keyof typeof statusGroups] += (s as any)._count?.statusCode || 0
      }
    }

    return NextResponse.json({
      overview: {
        totalRequests,
        recentRequests,
        totalKeys,
        activeKeys,
        totalEnabledKeys,
        disabledKeys: totalKeys - totalEnabledKeys,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
        errorCount,
        errorRate:
          recentRequests > 0
            ? ((errorCount / recentRequests) * 100).toFixed(2) + '%'
            : '0%',
        period: { days, from: startDate.toISOString(), to: new Date().toISOString() },
      },
      topEndpoints: topEndpoints.map((e) => ({
        endpoint: e.endpoint,
        count: (e as any)._count?.endpoint || 0,
      })),
      topKeys: topKeysWithDetails,
      statusCodes: statusCodes.map((s) => ({
        statusCode: s.statusCode,
        count: (s as any)._count?.statusCode || 0,
      })),
      statusGroups,
      timeSeries,
      recentErrors: recentErrors.map((e) => ({
        id: e.id,
        keyName: e.key.name,
        endpoint: e.endpoint,
        method: e.method,
        statusCode: e.statusCode,
        responseTime: e.responseTime,
        createdAt: e.createdAt,
      })),
    })
  } catch (error) {
    console.error('Failed to get API stats:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve API statistics' },
      { status: 500 }
    )
  }
}
