import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/bots/[id]/workflows/[wfId] — Workflow detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; wfId: string }> }
) {
  try {
    const { id, wfId } = await params

    const workflow = await prisma.workflow.findFirst({
      where: { id: wfId, botId: id },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    })

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    return NextResponse.json({
      workflow: {
        id: workflow.id,
        botId: workflow.botId,
        name: workflow.name,
        trigger: workflow.trigger,
        triggerConfig: JSON.parse(workflow.triggerConfig || '{}'),
        nodes: JSON.parse(workflow.nodes || '[]'),
        edges: JSON.parse(workflow.edges || '[]'),
        enabled: workflow.enabled,
        createdAt: workflow.createdAt,
        executionCount: (workflow as any)._count?.executions || 0,
      },
    })
  } catch (error) {
    console.error('[GET /api/bots/[id]/workflows/[wfId]]', error)
    return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 })
  }
}

// PATCH /api/bots/[id]/workflows/[wfId] — Update workflow
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; wfId: string }> }
) {
  try {
    const { id, wfId } = await params

    const workflow = await prisma.workflow.findFirst({
      where: { id: wfId, botId: id },
    })
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, trigger, triggerConfig, nodes, edges, enabled } = body as {
      name?: string
      trigger?: string
      triggerConfig?: any
      nodes?: any[]
      edges?: any[]
      enabled?: boolean
    }

    // Build update data
    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (trigger !== undefined) {
      const validTriggers = ['message', 'command', 'callback', 'webhook', 'schedule']
      if (!validTriggers.includes(trigger)) {
        return NextResponse.json(
          { error: `Invalid trigger. Must be one of: ${validTriggers.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.trigger = trigger
    }

    if (triggerConfig !== undefined) {
      updateData.triggerConfig = JSON.stringify(triggerConfig)
    }

    if (nodes !== undefined) {
      updateData.nodes = JSON.stringify(nodes)
    }

    if (edges !== undefined) {
      updateData.edges = JSON.stringify(edges)
    }

    if (enabled !== undefined) {
      updateData.enabled = Boolean(enabled)
    }

    const updated = await prisma.workflow.update({
      where: { id: wfId },
      data: updateData,
    })

    return NextResponse.json({
      workflow: {
        id: updated.id,
        botId: updated.botId,
        name: updated.name,
        trigger: updated.trigger,
        triggerConfig: JSON.parse(updated.triggerConfig),
        nodes: JSON.parse(updated.nodes),
        edges: JSON.parse(updated.edges),
        enabled: updated.enabled,
        createdAt: updated.createdAt,
      },
    })
  } catch (error) {
    console.error('[PATCH /api/bots/[id]/workflows/[wfId]]', error)
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 })
  }
}

// DELETE /api/bots/[id]/workflows/[wfId] — Delete workflow
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; wfId: string }> }
) {
  try {
    const { id, wfId } = await params

    const workflow = await prisma.workflow.findFirst({
      where: { id: wfId, botId: id },
    })
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Cascade deletes executions
    await prisma.workflow.delete({ where: { id: wfId } })

    return NextResponse.json({ success: true, message: 'Workflow deleted' })
  } catch (error) {
    console.error('[DELETE /api/bots/[id]/workflows/[wfId]]', error)
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 })
  }
}
