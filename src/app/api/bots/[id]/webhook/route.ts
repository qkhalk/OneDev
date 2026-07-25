import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { engine } from '@/lib/bot/engine'

// POST /api/bots/[id]/webhook — Webhook receiver for Telegram updates
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

    // Parse Telegram update
    const update = await req.json()

    // Extract message data from update
    const message = update.message || update.callback_query?.message || update.channel_post
    if (!message) {
      // Not a message update, acknowledge
      return NextResponse.json({ ok: true, message: 'No message in update' })
    }

    const text = update.message?.text || update.callback_query?.data || message.text || ''
    const chatId = message.chat?.id
    const userId = message.from?.id
    const username = message.from?.username
    const messageType = update.callback_query ? 'callback' : 'message'

    if (!chatId || !userId) {
      return NextResponse.json({ ok: true, message: 'Missing chat/user info' })
    }

    // Find matching workflows
    const workflows = await prisma.workflow.findMany({
      where: {
        botId: id,
        enabled: true,
      },
    })

    const matchedWorkflows: string[] = []

    for (const wf of workflows) {
      const triggerConfig = JSON.parse(wf.triggerConfig || '{}')

      // Check if workflow matches this update
      let matches = false

      if (wf.trigger === 'message') {
        matches = true
      } else if (wf.trigger === 'command') {
        const cmd = triggerConfig.command
        if (cmd && text.startsWith(cmd)) {
          matches = true
        }
      } else if (wf.trigger === 'callback') {
        const callbackData = triggerConfig.callbackData
        if (!callbackData || text === callbackData) {
          matches = true
        }
      } else if (wf.trigger === 'webhook') {
        // Webhook trigger matches all incoming updates
        matches = true
      }

      if (matches) {
        matchedWorkflows.push(wf.id)
      }
    }

    // Execute matched workflows asynchronously
    const executionPromises = matchedWorkflows.map((wfId) =>
      engine.execute(wfId, {
        text,
        chatId,
        userId,
        username,
        type: messageType,
      })
    )

    // Don't wait for all executions to complete (respond quickly to Telegram)
    // But we can await with a short timeout
    if (executionPromises.length > 0) {
      // Execute in background
      Promise.allSettled(executionPromises).catch((err) => {
        console.error('[Webhook] Execution error:', err)
      })
    }

    return NextResponse.json({
      ok: true,
      matchedWorkflows: matchedWorkflows.length,
    })
  } catch (error) {
    console.error('[POST /api/bots/[id]/webhook]', error)
    // Still return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true, error: 'Internal error' })
  }
}
