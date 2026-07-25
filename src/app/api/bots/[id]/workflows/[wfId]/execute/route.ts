import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { engine } from '@/lib/bot/engine'

// POST /api/bots/[id]/workflows/[wfId]/execute — Manual execute workflow
export async function POST(
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

    if (!workflow.enabled) {
      return NextResponse.json(
        { error: 'Workflow is disabled' },
        { status: 400 }
      )
    }

    // Parse input from body
    const body = await req.json().catch(() => ({}))
    const input = body.input || body.message || {
      text: body.text || 'manual_trigger',
      chatId: body.chatId || 0,
      userId: body.userId || 0,
      username: body.username,
      type: 'manual',
    }

    // Execute the workflow
    const ctx = await engine.execute(wfId, input)

    // Get the execution record
    const execution = await prisma.execution.findFirst({
      where: { workflowId: wfId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    return NextResponse.json({
      success: true,
      execution: execution
        ? {
            id: execution.id,
            status: execution.status,
            input: execution.input ? JSON.parse(execution.input) : null,
            output: execution.output ? JSON.parse(execution.output) : null,
            error: execution.error,
            duration: execution.duration,
            createdAt: execution.createdAt,
          }
        : null,
      variables: ctx.variables,
      steps: ctx.steps,
    })
  } catch (error) {
    console.error('[POST /api/bots/[id]/workflows/[wfId]/execute]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute workflow' },
      { status: 500 }
    )
  }
}
