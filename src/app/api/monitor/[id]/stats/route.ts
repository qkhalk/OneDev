import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/monitor/[id]/stats — Uptime stats (24h, 7d, 30d)
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const monitor = await prisma.monitor.findUnique({ where: { id } })

    if (!monitor) {
      return NextResponse.json(
        { error: 'Monitor not found' },
        { status: 404 }
      )
    }

    const now = new Date()

    // Define time ranges
    const ranges = [
      { label: '24h', hours: 24 },
      { label: '7d', hours: 24 * 7 },
      { label: '30d', hours: 24 * 30 },
    ]

    const stats = await Promise.all(
      ranges.map(async (range) => {
        const since = new Date(now.getTime() - range.hours * 60 * 60 * 1000)

        const checks = await prisma.monitorCheck.findMany({
          where: {
            monitorId: id,
            checkedAt: { gte: since },
          },
          select: {
            status: true,
            responseTime: true,
            checkedAt: true,
          },
          orderBy: { checkedAt: 'asc' },
        })

        const total = checks.length
        if (total === 0) {
          return {
            period: range.label,
            totalChecks: 0,
            uptimePercentage: 0,
            avgResponseTime: 0,
            minResponseTime: 0,
            maxResponseTime: 0,
            responseTimes: [],
          }
        }

        const upCount = checks.filter((c) => c.status === 'up').length
        const degradedCount = checks.filter((c) => c.status === 'degraded').length

        // Uptime = (up + degraded*0.5) / total * 100
        const uptimePercentage =
          ((upCount + degradedCount * 0.5) / total) * 100

        const responseTimes = checks
          .filter((c) => c.responseTime !== null)
          .map((c) => c.responseTime as number)

        const avgResponseTime =
          responseTimes.length > 0
            ? Math.round(
                responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
              )
            : 0
        const minResponseTime =
          responseTimes.length > 0 ? Math.min(...responseTimes) : 0
        const maxResponseTime =
          responseTimes.length > 0 ? Math.max(...responseTimes) : 0

        // Build response time series (bucket by hour for 24h, by day for 7d/30d)
        const buckets = new Map<string, { sum: number; count: number; statuses: Record<string, number> }>()

        const bucketFormat = range.hours <= 24 ? 'hour' : 'day'

        for (const check of checks) {
          const d = new Date(check.checkedAt)
          let key: string
          if (bucketFormat === 'hour') {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:00`
          } else {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          }

          if (!buckets.has(key)) {
            buckets.set(key, { sum: 0, count: 0, statuses: {} })
          }
          const bucket = buckets.get(key)!
          if (check.responseTime !== null) {
            bucket.sum += check.responseTime
            bucket.count++
          }
          bucket.statuses[check.status] = (bucket.statuses[check.status] || 0) + 1
        }

        const series = Array.from(buckets.entries()).map(([time, data]) => ({
          time,
          avgResponseTime: data.count > 0 ? Math.round(data.sum / data.count) : 0,
          up: data.statuses.up || 0,
          down: data.statuses.down || 0,
          degraded: data.statuses.degraded || 0,
        }))

        return {
          period: range.label,
          totalChecks: total,
          uptimePercentage: Math.round(uptimePercentage * 100) / 100,
          avgResponseTime,
          minResponseTime,
          maxResponseTime,
          series,
        }
      })
    )

    // Get current status (latest check)
    const latestCheck = await prisma.monitorCheck.findFirst({
      where: { monitorId: id },
      orderBy: { checkedAt: 'desc' },
    })

    return NextResponse.json({
      monitorId: id,
      monitorName: monitor.name,
      currentStatus: latestCheck?.status || 'unknown',
      stats,
    })
  } catch (error) {
    console.error('[GET /api/monitor/[id]/stats]', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
