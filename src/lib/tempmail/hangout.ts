import type { ITempMailProvider } from './base'
import type { TempMailMessage, TempMailDetail } from './types'

/**
 * Provider cho mail.hangout.io.vn
 * Sử dụng API proxy server-side để bypass Cloudflare Turnstile
 */
export class HangoutProvider implements ITempMailProvider {
  id = 'hangout'
  name = 'Hangout Inbox'
  private baseUrl = 'https://mail.hangout.io.vn'

  async createEmail(domain?: string): Promise<{ email: string; token: string }> {
    // Proxy qua Next.js API route để tránh CORS và Cloudflare
    const res = await fetch('/api/tempmail/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'hangout', domain }),
    })
    if (!res.ok) throw new Error('Failed to create email')
    const data = await res.json()
    return { email: data.email, token: data.token }
  }

  async getInbox(email: string, token: string): Promise<TempMailMessage[]> {
    const res = await fetch('/api/tempmail/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'hangout', email, token }),
    })
    if (!res.ok) throw new Error('Failed to fetch inbox')
    const data = await res.json()
    return data.messages || []
  }

  async getMessage(email: string, token: string, msgId: string): Promise<TempMailDetail> {
    const res = await fetch(`/api/tempmail/inbox/${msgId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'hangout', email, token }),
    })
    if (!res.ok) throw new Error('Failed to fetch message')
    return res.json()
  }

  async deleteEmail(email: string, token: string): Promise<void> {
    await fetch('/api/tempmail/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'hangout', email, token }),
    })
  }
}
