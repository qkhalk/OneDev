import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string; alertId: string }>
}

// PATCH /api/monitor/[id]/alerts/[alertId] — Enable/disable alert or update
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id, alertId } = await params
    const body = await req.json()
    const { enabled, target, type } = body as {
      enabled?: boolean
      target?: string
      type?: string
    }

    const alert = await prisma.monitorAlert.findFirst({
      where: { id: alertId, monitorId: id },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    // Validate type if provided
    if (type !== undefined) {
      const validTypes = ['email', 'telegram', 'discord', 'webhook']
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Type must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate target if provided
    if (target !== undefined && target.trim().length === 0) {
      return NextResponse.json(
        { error: 'Target cannot be empty' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (enabled !== undefined) updateData.enabled = enabled
    if (target !== undefined) updateData.target = target.trim()
    if (type !== undefined) updateData.type = type

    const updated = await prisma.monitorAlert.update({
      where: { id: alertId },
      data: updateData,
    })

    return NextResponse.json({ alert: updated })
  } catch (error) {
    console.error('[PATCH /api/monitor/[id]/alerts/[alertId]]', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}

// DELETE /api/monitor/[id]/alerts/[alertId] — Remove alert
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id, alertId } = await params

    const alert = await prisma.monitorAlert.findFirst({
      where: { id: alertId, monitorId: id },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    await prisma.monitorAlert.delete({ where: { id: alertId } })

    return NextResponse.json({ success: true, message: 'Alert deleted' })
  } catch (error) {
    console.error('[DELETE /api/monitor/[id]/alerts/[alertId]]', error)
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    )
  }
}
