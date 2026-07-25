import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/monitor/[id] — Monitor detail with recent checks (paginated)
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        checks: {
          orderBy: { checkedAt: 'desc' },
          take: limit,
          skip: offset,
        },
        alerts: true,
        _count: {
          select: { checks: true, alerts: true },
        },
      },
    })

    if (!monitor) {
      return NextResponse.json(
        { error: 'Monitor not found' },
        { status: 404 }
      )
    }

    const totalChecks = (monitor as any)._count?.checks || 0
    const totalPages = Math.ceil(totalChecks / limit)

    return NextResponse.json({
      monitor: {
        ...monitor,
        pagination: {
          page,
          limit,
          total: totalChecks,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    })
  } catch (error) {
    console.error('[GET /api/monitor/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to fetch monitor' },
      { status: 500 }
    )
  }
}

// PATCH /api/monitor/[id] — Update monitor
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, url, type, interval, timeout, enabled } = body as {
      name?: string
      url?: string
      type?: string
      interval?: number
      timeout?: number
      enabled?: boolean
    }

    // Check if monitor exists
    const existing = await prisma.monitor.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Monitor not found' },
        { status: 404 }
      )
    }

    // Validate type if provided
    if (type !== undefined) {
      const validTypes = ['http', 'https', 'tcp', 'dns']
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate interval if provided
    if (interval !== undefined && (interval < 10 || interval > 86400)) {
      return NextResponse.json(
        { error: 'Interval must be between 10 and 86400 seconds' },
        { status: 400 }
      )
    }

    // Validate timeout if provided
    if (timeout !== undefined && (timeout < 1 || timeout > 60)) {
      return NextResponse.json(
        { error: 'Timeout must be between 1 and 60 seconds' },
        { status: 400 }
      )
    }

    // Build update data (only provided fields)
    const updateData: any = { updatedAt: new Date() }
    if (name !== undefined) updateData.name = name.trim()
    if (url !== undefined) updateData.url = url.trim()
    if (type !== undefined) updateData.type = type
    if (interval !== undefined) updateData.interval = interval
    if (timeout !== undefined) updateData.timeout = timeout
    if (enabled !== undefined) updateData.enabled = enabled

    const monitor = await prisma.monitor.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ monitor })
  } catch (error) {
    console.error('[PATCH /api/monitor/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to update monitor' },
      { status: 500 }
    )
  }
}

// DELETE /api/monitor/[id] — Delete monitor (cascade deletes checks and alerts)
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.monitor.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Monitor not found' },
        { status: 404 }
      )
    }

    await prisma.monitor.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Monitor deleted' })
  } catch (error) {
    console.error('[DELETE /api/monitor/[id]]', error)
    return NextResponse.json(
      { error: 'Failed to delete monitor' },
      { status: 500 }
    )
  }
}
