import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { botManager } from '@/lib/bot/manager'

// GET /api/bots/[id]/status — Bot running status + Telegram webhook info
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const bot = await prisma.bot.findUnique({ where: { id } })
    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const isRunning = botManager.isRunning(id)

    // Get webhook info from Telegram
    let webhookInfo: any = null
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${bot.token}/getWebhookInfo`
      )
      const data = await response.json()
      if (data.ok) {
        webhookInfo = {
          url: data.result.url || null,
          hasCustomCertificate: data.result.has_custom_certificate || false,
          pendingUpdateCount: data.result.pending_update_count || 0,
          lastErrorDate: data.result.last_error_date || null,
          lastErrorMessage: data.result.last_error_message || null,
          maxConnections: data.result.max_connections || null,
          allowedUpdates: data.result.allowed_updates || [],
        }
      }
    } catch {
      // Ignore webhook info errors
    }

    // Get bot info from Telegram
    let botInfo: any = null
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${bot.token}/getMe`
      )
      const data = await response.json()
      if (data.ok) {
        botInfo = {
          id: data.result.id,
          username: data.result.username,
          firstName: data.result.first_name,
          canJoinGroups: data.result.can_join_groups,
          canReadAllGroupMessages: data.result.can_read_all_group_messages,
          supportsInlineQueries: data.result.supports_inline_queries,
        }
      }
    } catch {
      // Ignore bot info errors
    }

    return NextResponse.json({
      status: {
        id: bot.id,
        name: bot.name,
        enabled: bot.enabled,
        isRunning,
        webhookInfo,
        botInfo,
      },
    })
  } catch (error) {
    console.error('[GET /api/bots/[id]/status]', error)
    return NextResponse.json({ error: 'Failed to get bot status' }, { status: 500 })
  }
}
