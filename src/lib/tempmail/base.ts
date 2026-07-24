import type { TempMailMessage, TempMailDetail } from './types'

export interface ITempMailProvider {
  id: string
  name: string
  createEmail(domain?: string): Promise<{ email: string; token: string }>
  getInbox(email: string, token: string): Promise<TempMailMessage[]>
  getMessage(email: string, token: string, msgId: string): Promise<TempMailDetail>
  deleteEmail(email: string, token: string): Promise<void>
}
