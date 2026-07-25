import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runCheck } from '@/lib/monitor/checker'
import { dispatchAlert } from '@/lib/monitor/alerts'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/monitor/[id]/check — Trigger manual check
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: { alerts: { where: { enabled: true } } },
    })

    if (!monitor) {
      return NextResponse.json(
        { error: 'Monitor not found' },
        { status: 404 }
      )
    }

    // Run the check
    const result = await runCheck(monitor.type, monitor.url, monitor.timeout)

    // Save check result
    const check = await prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        status: result.status,
        responseTime: result.responseTime ?? null,
        statusCode: result.statusCode ?? null,
        message: result.message ?? null,
        sslDays: result.sslDays ?? null,
      },
    })

    // Check if status changed from up to down — trigger alerts
    const lastCheck = await prisma.monitorCheck.findFirst({
      where: {
        monitorId: monitor.id,
        id: { not: check.id },
      },
      orderBy: { checkedAt: 'desc' },
    })

    const wasUp = lastCheck?.status === 'up'
    const isDown = result.status === 'down'

    // Send alerts if monitor went down or is degraded
    if (monitor.alerts.length > 0 && (isDown || result.status === 'degraded')) {
      // Only alert if status changed or first check is down
      if (!wasUp || !lastCheck) {
        await dispatchAlert(
          monitor.name,
          monitor.url,
          result.status,
          result.message || 'No message',
          monitor.alerts
        )
      }
    }

    return NextResponse.json({ check }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/monitor/[id]/check]', error)
    return NextResponse.json(
      { error: 'Failed to run check' },
      { status: 500 }
    )
  }
}
