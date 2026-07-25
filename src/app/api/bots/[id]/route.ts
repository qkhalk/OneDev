import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { botManager } from '@/lib/bot/manager'

// GET /api/bots/[id] — Bot detail with workflow count
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const bot = await prisma.bot.findUnique({
      where: { id },
      include: {
        _count: {
          select: { workflows: true },
        },
      },
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    return NextResponse.json({
      bot: {
        id: bot.id,
        name: bot.name,
        username: bot.username,
        enabled: bot.enabled,
        createdAt: bot.createdAt,
        isRunning: botManager.isRunning(bot.id),
        workflowCount: (bot as any)._count?.workflows || 0,
      },
    })
  } catch (error) {
    console.error('[GET /api/bots/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch bot' }, { status: 500 })
  }
}

// PATCH /api/bots/[id] — Update bot (name, enabled)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, enabled, token } = body as {
      name?: string
      enabled?: boolean
      token?: string
    }

    const bot = await prisma.bot.findUnique({ where: { id } })
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (enabled !== undefined) {
      updateData.enabled = Boolean(enabled)
    }

    // Token update requires re-validation
    if (token !== undefined && token !== bot.token) {
      const tokenTrimmed = token.trim()
      if (!/^\d+:[A-Za-z0-9_-]+$/.test(tokenTrimmed)) {
        return NextResponse.json(
          { error: 'Invalid token format' },
          { status: 400 }
        )
      }

      // Validate with Telegram
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${tokenTrimmed}/getMe`
        )
        const data = await response.json()
        if (!data.ok) {
          return NextResponse.json(
            { error: `Invalid bot token: ${data.description || 'Token rejected'}` },
            { status: 400 }
          )
        }
        updateData.token = tokenTrimmed
        updateData.username = data.result?.username
      } catch {
        return NextResponse.json(
          { error: 'Failed to validate token with Telegram API' },
          { status: 400 }
        )
      }

      // Restart bot if running
      if (botManager.isRunning(id)) {
        await botManager.restartBot(id, updateData.token)
      }
    }

    const updated = await prisma.bot.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      bot: {
        id: updated.id,
        name: updated.name,
        username: updated.username,
        enabled: updated.enabled,
        createdAt: updated.createdAt,
      },
    })
  } catch (error) {
    console.error('[PATCH /api/bots/[id]]', error)
    return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 })
  }
}

// DELETE /api/bots/[id] — Delete bot (stop if running)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const bot = await prisma.bot.findUnique({ where: { id } })
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    // Stop bot if running
    if (botManager.isRunning(id)) {
      await botManager.stopBot(id)
    }

    // Delete bot (cascade deletes workflows and executions)
    await prisma.bot.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Bot deleted' })
  } catch (error) {
    console.error('[DELETE /api/bots/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 })
  }
}
