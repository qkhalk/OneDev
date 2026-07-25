import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/bots/[id]/workflows — List workflows for a bot
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify bot exists
    const bot = await prisma.bot.findUnique({ where: { id } })
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const workflows = await prisma.workflow.findMany({
      where: { botId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { executions: true },
        },
      },
    })

    const result = workflows.map((wf) => ({
      id: wf.id,
      botId: wf.botId,
      name: wf.name,
      trigger: wf.trigger,
      triggerConfig: JSON.parse(wf.triggerConfig || '{}'),
      enabled: wf.enabled,
      createdAt: wf.createdAt,
      nodeCount: JSON.parse(wf.nodes || '[]').length,
      executionCount: (wf as any)._count?.executions || 0,
    }))

    return NextResponse.json({ workflows: result })
  } catch (error) {
    console.error('[GET /api/bots/[id]/workflows]', error)
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
  }
}

// POST /api/bots/[id]/workflows — Create a new workflow
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify bot exists
    const bot = await prisma.bot.findUnique({ where: { id } })
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
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

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Workflow name is required' }, { status: 400 })
    }

    // Validate trigger type
    const validTriggers = ['message', 'command', 'callback', 'webhook', 'schedule']
    const workflowTrigger = trigger || 'message'
    if (!validTriggers.includes(workflowTrigger)) {
      return NextResponse.json(
        { error: `Invalid trigger. Must be one of: ${validTriggers.join(', ')}` },
        { status: 400 }
      )
    }

    // Serialize JSON fields
    const triggerConfigStr = JSON.stringify(triggerConfig || {})
    const nodesStr = JSON.stringify(nodes || [])
    const edgesStr = JSON.stringify(edges || [])

    const workflow = await prisma.workflow.create({
      data: {
        botId: id,
        name: name.trim(),
        trigger: workflowTrigger,
        triggerConfig: triggerConfigStr,
        nodes: nodesStr,
        edges: edgesStr,
        enabled: enabled ?? true,
      },
    })

    return NextResponse.json(
      {
        workflow: {
          id: workflow.id,
          botId: workflow.botId,
          name: workflow.name,
          trigger: workflow.trigger,
          triggerConfig: JSON.parse(workflow.triggerConfig),
          nodes: JSON.parse(workflow.nodes),
          edges: JSON.parse(workflow.edges),
          enabled: workflow.enabled,
          createdAt: workflow.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/bots/[id]/workflows]', error)
    return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 })
  }
}
