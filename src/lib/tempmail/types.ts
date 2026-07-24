// Temp Mail types

export interface TempMailMessage {
  id: string
  from: string
  subject: string
  date: string
  read: boolean
  hasAttachment?: boolean
}

export interface TempMailDetail extends TempMailMessage {
  bodyHtml: string
  bodyText: string
  attachments?: TempMailAttachment[]
}

export interface TempMailAttachment {
  filename: string
  contentType: string
  size: number
  data?: string
}

export interface TempMailAccount {
  email: string
  token: string
  provider: string
  createdAt: string
}

export interface TempMailProvider {
  id: string
  name: string
  domains: string[]
  icon: string
}

export const PROVIDERS: TempMailProvider[] = [
  {
    id: 'hangout',
    name: 'Hangout Inbox',
    domains: ['mail.hangout.io.vn'],
    icon: '📬',
  },
  {
    id: '2b4d',
    name: '2b4d.org',
    domains: ['2b4d.org'],
    icon: '📧',
  },
]
