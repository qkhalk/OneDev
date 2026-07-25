import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { botManager } from '@/lib/bot/manager'

// POST /api/bots/[id]/stop — Stop bot polling
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

    if (!botManager.isRunning(id)) {
      return NextResponse.json(
        { message: 'Bot is not running', isRunning: false },
        { status: 200 }
      )
    }

    await botManager.stopBot(id)

    return NextResponse.json({
      success: true,
      message: 'Bot stopped',
      isRunning: false,
    })
  } catch (error) {
    console.error('[POST /api/bots/[id]/stop]', error)
    return NextResponse.json({ error: 'Failed to stop bot' }, { status: 500 })
  }
}
