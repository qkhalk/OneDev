/**
 * Bot Manager — Manages Telegram bot instances lifecycle.
 * Uses dynamic import for telegraf to avoid hard dependency.
 */

import { prisma } from '@/lib/db'

// Type for Telegraf instance (loosely typed to avoid import)
type TelegrafInstance = any

async function getTelegraf(): Promise<any> {
  const mod = await import(/* webpackIgnore: true */ 'telegraf')
  return mod.Telegraf
}

export class BotManager {
  private bots: Map<string, TelegrafInstance> = new Map()
  private tokens: Map<string, string> = new Map()

  /**
   * Start a bot with polling.
   */
  async startBot(botId: string, token: string): Promise<void> {
    // Already running?
    if (this.bots.has(botId)) {
      return
    }

    try {
      const Telegraf = await getTelegraf()
      const bot = new Telegraf(token)

      // Set up message handler — delegate to webhook/engine logic
      bot.on('message', async (ctx: any) => {
        try {
          await this.handleUpdate(botId, ctx)
        } catch (err) {
          console.error(`[BotManager] Error handling message for bot ${botId}:`, err)
        }
      })

      bot.on('callback_query', async (ctx: any) => {
        try {
          await this.handleUpdate(botId, ctx)
        } catch (err) {
          console.error(`[BotManager] Error handling callback for bot ${botId}:`, err)
        }
      })

      // Launch polling
      await bot.launch({
        allowedUpdates: ['message', 'callback_query', 'channel_post'],
      })

      this.bots.set(botId, bot)
      this.tokens.set(botId, token)

      console.log(`[BotManager] Bot ${botId} started`)
    } catch (err) {
      console.error(`[BotManager] Failed to start bot ${botId}:`, err)
      throw err
    }
  }

  /**
   * Stop a running bot.
   */
  async stopBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId)
    if (!bot) {
      return
    }

    try {
      bot.stop('MANUAL_STOP')
    } catch (err) {
      // Ignore stop errors
      console.warn(`[BotManager] Error stopping bot ${botId}:`, err)
    }

    this.bots.delete(botId)
    this.tokens.delete(botId)
    console.log(`[BotManager] Bot ${botId} stopped`)
  }

  /**
   * Restart a bot (useful after config change).
   */
  async restartBot(botId: string, token: string): Promise<void> {
    await this.stopBot(botId)
    await this.startBot(botId, token)
  }

  /**
   * Check if a bot is currently running.
   */
  isRunning(botId: string): boolean {
    return this.bots.has(botId)
  }

  /**
   * Get list of running bot IDs.
   */
  getRunningBots(): string[] {
    return Array.from(this.bots.keys())
  }

  /**
   * Get the token for a running bot.
   */
  getToken(botId: string): string | undefined {
    return this.tokens.get(botId)
  }

  /**
   * Handle incoming update — find matching workflows and execute.
   */
  private async handleUpdate(botId: string, ctx: any): Promise<void> {
    const { engine } = await import('./engine')

    const message = ctx.message || ctx.callbackQuery?.message
    if (!message) return

    const text = ctx.message?.text || ctx.callbackQuery?.data || ''
    const chatId = message.chat?.id
    const userId = message.from?.id
    const username = message.from?.username
    const messageType = ctx.callbackQuery ? 'callback' : 'message'

    if (!chatId || !userId) return

    // Find matching workflows
    const workflows = await prisma.workflow.findMany({
      where: {
        botId,
        enabled: true,
      },
    })

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
      }

      if (matches) {
        // Execute asynchronously (don't block other workflows)
        engine
          .execute(wf.id, {
            text,
            chatId,
            userId,
            username,
            type: messageType,
          })
          .catch((err) => {
            console.error(`[BotManager] Workflow ${wf.id} execution error:`, err)
          })
      }
    }
  }

  /**
   * Start all enabled bots from DB (called on server start).
   */
  async startAll(): Promise<void> {
    try {
      const bots = await prisma.bot.findMany({
        where: { enabled: true },
      })

      for (const bot of bots) {
        try {
          await this.startBot(bot.id, bot.token)
        } catch (err) {
          console.error(`[BotManager] Failed to auto-start bot ${bot.id}:`, err)
        }
      }

      console.log(`[BotManager] Started ${this.bots.size}/${bots.length} bots`)
    } catch (err) {
      console.error('[BotManager] Failed to start all bots:', err)
    }
  }

  /**
   * Stop all running bots (called on server shutdown).
   */
  async stopAll(): Promise<void> {
    const ids = Array.from(this.bots.keys())
    for (const id of ids) {
      await this.stopBot(id)
    }
    console.log('[BotManager] All bots stopped')
  }
}

// Singleton instance
export const botManager = new BotManager()

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.once('SIGINT', () => botManager.stopAll())
  process.once('SIGTERM', () => botManager.stopAll())
}
