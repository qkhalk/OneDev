import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { botManager } from '@/lib/bot/manager'

// GET /api/bots — List all bots
export async function GET() {
  try {
    const bots = await prisma.bot.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { workflows: true },
        },
      },
    })

    const result = bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      username: bot.username,
      enabled: bot.enabled,
      createdAt: bot.createdAt,
      isRunning: botManager.isRunning(bot.id),
      workflowCount: (bot as any)._count?.workflows || 0,
    }))

    return NextResponse.json({ bots: result })
  } catch (error) {
    console.error('[GET /api/bots]', error)
    return NextResponse.json({ error: 'Failed to fetch bots' }, { status: 500 })
  }
}

// POST /api/bots — Create a new bot (validates token with Telegram API)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, token } = body as { name?: string; token?: string }

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json({ error: 'Bot token is required' }, { status: 400 })
    }

    // Validate token format (basic check)
    const tokenTrimmed = token.trim()
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(tokenTrimmed)) {
      return NextResponse.json(
        { error: 'Invalid token format. Expected format: 123456:ABC-DEF...' },
        { status: 400 }
      )
    }

    // Validate token with Telegram API
    let botUsername: string | undefined
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${tokenTrimmed}/getMe`
      )
      const data = await response.json()

      if (!data.ok) {
        return NextResponse.json(
          { error: `Invalid bot token: ${data.description || 'Telegram rejected this token'}` },
          { status: 400 }
        )
      }

      botUsername = data.result?.username
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to validate token with Telegram API. Check your network connection.' },
        { status: 400 }
      )
    }

    // Check for duplicate token
    const existing = await prisma.bot.findFirst({
      where: { token: tokenTrimmed },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A bot with this token already exists' },
        { status: 409 }
      )
    }

    // Create bot
    const bot = await prisma.bot.create({
      data: {
        name: name.trim(),
        token: tokenTrimmed,
        username: botUsername,
      },
    })

    return NextResponse.json(
      {
        bot: {
          id: bot.id,
          name: bot.name,
          username: bot.username,
          enabled: bot.enabled,
          createdAt: bot.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/bots]', error)
    return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 })
  }
}
