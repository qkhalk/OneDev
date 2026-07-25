import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/monitor — List all monitors with latest check
export async function GET() {
  try {
    const monitors = await prisma.monitor.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        checks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { checks: true, alerts: true },
        },
      },
    })

    const result = monitors.map((monitor) => ({
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      type: monitor.type,
      interval: monitor.interval,
      timeout: monitor.timeout,
      enabled: monitor.enabled,
      createdAt: monitor.createdAt,
      updatedAt: monitor.updatedAt,
      latestCheck: monitor.checks?.[0] ?? null,
      totalChecks: (monitor as any)._count?.checks || 0,
      totalAlerts: (monitor as any)._count?.alerts || 0,
    }))

    return NextResponse.json({ monitors: result })
  } catch (error) {
    console.error('[GET /api/monitor]', error)
    return NextResponse.json(
      { error: 'Failed to fetch monitors' },
      { status: 500 }
    )
  }
}

// POST /api/monitor — Create a new monitor
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, url, type, interval, timeout, enabled } = body as {
      name?: string
      url?: string
      type?: string
      interval?: number
      timeout?: number
      enabled?: boolean
    }

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['http', 'https', 'tcp', 'dns']
    const monitorType = type || 'http'
    if (!validTypes.includes(monitorType)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate interval
    const monitorInterval = interval ?? 60
    if (monitorInterval < 10 || monitorInterval > 86400) {
      return NextResponse.json(
        { error: 'Interval must be between 10 and 86400 seconds' },
        { status: 400 }
      )
    }

    // Validate timeout
    const monitorTimeout = timeout ?? 10
    if (monitorTimeout < 1 || monitorTimeout > 60) {
      return NextResponse.json(
        { error: 'Timeout must be between 1 and 60 seconds' },
        { status: 400 }
      )
    }

    const monitor = await prisma.monitor.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        type: monitorType,
        interval: monitorInterval,
        timeout: monitorTimeout,
        enabled: enabled ?? true,
      },
    })

    return NextResponse.json({ monitor }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/monitor]', error)
    return NextResponse.json(
      { error: 'Failed to create monitor' },
      { status: 500 }
    )
  }
}
