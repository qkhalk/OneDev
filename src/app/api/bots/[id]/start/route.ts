import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { botManager } from '@/lib/bot/manager'

// POST /api/bots/[id]/start — Start bot polling
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const bot = await prisma.bot.findUnique({ where: { id } })
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    if (!bot.enabled) {
      return NextResponse.json(
        { error: 'Bot is disabled. Enable it first.' },
        { status: 400 }
      )
    }

    if (botManager.isRunning(id)) {
      return NextResponse.json(
        { message: 'Bot is already running', isRunning: true },
        { status: 200 }
      )
    }

    // Start the bot
    try {
      await botManager.startBot(id, bot.token)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        { error: `Failed to start bot: ${errorMsg}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bot started',
      isRunning: true,
    })
  } catch (error) {
    console.error('[POST /api/bots/[id]/start]', error)
    return NextResponse.json({ error: 'Failed to start bot' }, { status: 500 })
  }
}
