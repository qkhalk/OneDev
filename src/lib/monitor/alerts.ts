/**
 * Send Telegram alert via Bot API
 * Requires TELEGRAM_BOT_TOKEN environment variable
 */
export async function sendTelegramAlert(chatId: string, message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) {
    console.error('[sendTelegramAlert] TELEGRAM_BOT_TOKEN is not set')
    return
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[sendTelegramAlert] Failed: ${response.status} ${errorBody}`)
    }
  } catch (error) {
    console.error('[sendTelegramAlert] Error:', error)
  }
}

/**
 * Send generic webhook alert (POST JSON)
 */
export async function sendWebhookAlert(url: string, payload: any): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[sendWebhookAlert] Failed: ${response.status} ${errorBody}`)
    }
  } catch (error) {
    console.error('[sendWebhookAlert] Error:', error)
  }
}

/**
 * Send Discord alert via webhook URL
 */
export async function sendDiscordAlert(webhookUrl: string, message: string): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        // username: 'OneDev Monitor',
        // avatar_url: 'https://your-avatar-url.png',
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`[sendDiscordAlert] Failed: ${response.status} ${errorBody}`)
    }
  } catch (error) {
    console.error('[sendDiscordAlert] Error:', error)
  }
}

/**
 * Send email alert (placeholder - requires SMTP configuration)
 * TODO: Implement with nodemailer if needed
 */
export async function sendEmailAlert(email: string, message: string): Promise<void> {
  console.log(`[sendEmailAlert] To: ${email}, Message: ${message}`)
  // Implementation would use nodemailer or similar
  // For now, this is a placeholder
}

/**
 * Dispatch alert to all configured channels for a monitor
 */
export async function dispatchAlert(
  monitorName: string,
  monitorUrl: string,
  status: string,
  message: string,
  alerts: Array<{ type: string; target: string }>
): Promise<void> {
  const alertMessage = `🚨 <b>${monitorName}</b> is <b>${status.toUpperCase()}</b>\n\n` +
    `URL: ${monitorUrl}\n` +
    `Status: ${status}\n` +
    `Message: ${message}\n` +
    `Time: ${new Date().toISOString()}`

  const discordMessage = `🚨 **${monitorName}** is **${status.toUpperCase()}**\n\n` +
    `URL: ${monitorUrl}\n` +
    `Status: ${status}\n` +
    `Message: ${message}\n` +
    `Time: ${new Date().toISOString()}`

  const webhookPayload = {
    monitor: monitorName,
    url: monitorUrl,
    status,
    message,
    timestamp: new Date().toISOString(),
  }

  const promises = alerts.map((alert) => {
    switch (alert.type) {
      case 'telegram':
        return sendTelegramAlert(alert.target, alertMessage)

      case 'discord':
        return sendDiscordAlert(alert.target, discordMessage)

      case 'webhook':
        return sendWebhookAlert(alert.target, webhookPayload)

      case 'email':
        return sendEmailAlert(alert.target, discordMessage)

      default:
        console.warn(`[dispatchAlert] Unknown alert type: ${alert.type}`)
        return Promise.resolve()
    }
  })

  await Promise.allSettled(promises)
}
