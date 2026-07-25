import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/bots/[id]/workflows/[wfId]/executions — Execution history (paginated)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; wfId: string }> }
) {
  try {
    const { id, wfId } = await params

    // Verify workflow exists and belongs to bot
    const workflow = await prisma.workflow.findFirst({
      where: { id: wfId, botId: id },
    })
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Parse pagination params
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const status = searchParams.get('status') || undefined

    // Build where clause
    const where: any = { workflowId: wfId }
    if (status && ['pending', 'running', 'completed', 'failed'].includes(status)) {
      where.status = status
    }

    // Get total count
    const total = await prisma.execution.count({ where })

    // Get executions
    const executions = await prisma.execution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const result = executions.map((exec) => ({
      id: exec.id,
      workflowId: exec.workflowId,
      status: exec.status,
      input: exec.input ? JSON.parse(exec.input) : null,
      output: exec.output ? JSON.parse(exec.output) : null,
      error: exec.error,
      duration: exec.duration,
      createdAt: exec.createdAt,
    }))

    return NextResponse.json({
      executions: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('[GET /api/bots/[id]/workflows/[wfId]/executions]', error)
    return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 })
  }
}
