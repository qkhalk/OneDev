import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/monitor/[id]/alerts — List alerts for monitor
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

    const alerts = await prisma.monitorAlert.findMany({
      where: { monitorId: id },
      orderBy: { type: 'asc' },
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('[GET /api/monitor/[id]/alerts]', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

// POST /api/monitor/[id]/alerts — Add alert
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await req.json()
    const { type, target, enabled } = body as {
      type?: string
      target?: string
      enabled?: boolean
    }

    const monitor = await prisma.monitor.findUnique({ where: { id } })
    if (!monitor) {
      return NextResponse.json(
        { error: 'Monitor not found' },
        { status: 404 }
      )
    }

    // Validate type
    const validTypes = ['email', 'telegram', 'discord', 'webhook']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate target
    if (!target || typeof target !== 'string' || target.trim().length === 0) {
      return NextResponse.json(
        { error: 'Target is required' },
        { status: 400 }
      )
    }

    // Type-specific validation
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(target)) {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 }
        )
      }
    }

    if (type === 'webhook' || type === 'discord') {
      try {
        const parsed = new URL(target)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Invalid protocol')
        }
      } catch {
        return NextResponse.json(
          { error: 'Target must be a valid HTTP/HTTPS URL' },
          { status: 400 }
        )
      }
    }

    const alert = await prisma.monitorAlert.create({
      data: {
        monitorId: id,
        type,
        target: target.trim(),
        enabled: enabled ?? true,
      },
    })

    return NextResponse.json({ alert }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/monitor/[id]/alerts]', error)
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}
