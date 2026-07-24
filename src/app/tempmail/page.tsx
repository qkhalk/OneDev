'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Trash2, Copy, Plus, Mail, Clock, AlertCircle } from 'lucide-react'
import { PROVIDERS } from '@/lib/tempmail/types'
import { timeAgo, copyToClipboard, truncate } from '@/lib/utils'

interface Email {
  email: string
  token: string
  provider: string
  createdAt: string
}

interface Message {
  id: string
  from: string
  subject: string
  date: string
  read: boolean
}

export default function TempMailPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [activeEmail, setActiveEmail] = useState<Email | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const createEmail = async (provider: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tempmail/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      if (!res.ok) throw new Error('Failed to create email')
      const data = await res.json()
      const newEmail: Email = {
        email: data.email,
        token: data.token,
        provider,
        createdAt: data.createdAt,
      }
      setEmails((prev) => [...prev, newEmail])
      setActiveEmail(newEmail)
      setMessages([])
      setSelectedMessage(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchInbox = useCallback(async () => {
    if (!activeEmail) return
    try {
      const res = await fetch('/api/tempmail/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: activeEmail.provider,
          email: activeEmail.email,
          token: activeEmail.token,
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {
      // silent fail
    }
  }, [activeEmail])

  useEffect(() => {
    if (activeEmail && autoRefresh) {
      fetchInbox()
      intervalRef.current = setInterval(fetchInbox, 10000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [activeEmail, autoRefresh, fetchInbox])

  const deleteEmail = async (email: Email) => {
    await fetch('/api/tempmail/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: email.provider,
        email: email.email,
        token: email.token,
      }),
    })
    setEmails((prev) => prev.filter((e) => e.email !== email.email))
    if (activeEmail?.email === email.email) {
      setActiveEmail(null)
      setMessages([])
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Temp Mail 📧
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Email tạm thời — nhận OTP, tránh spam
          </p>
        </div>
        <div className="flex gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => createEmail(p.id)}
              disabled={loading}
              className="btn btn-primary"
            >
              <Plus size={16} />
              {p.icon} {p.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg flex items-center gap-2"
          style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Email List */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
            EMAIL ADDRESSES
          </h3>
          {emails.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <Mail size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chưa có email nào</p>
              <p className="text-xs mt-1">Tạo email mới ở trên</p>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.email}
                  onClick={() => {
                    setActiveEmail(email)
                    setSelectedMessage(null)
                  }}
                  className="p-3 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background:
                      activeEmail?.email === email.email
                        ? 'var(--accent-light)'
                        : 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-mono truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {email.email}
                      </div>
                      <div
                        className="text-xs flex items-center gap-1 mt-0.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Clock size={10} />
                        {timeAgo(email.createdAt)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(email.email)
                        }}
                        className="p-1.5 rounded hover:opacity-70"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteEmail(email)
                        }}
                        className="p-1.5 rounded hover:opacity-70"
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inbox */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              INBOX
            </h3>
            {activeEmail && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="text-xs"
                  style={{ color: autoRefresh ? 'var(--success)' : 'var(--text-muted)' }}
                >
                  {autoRefresh ? '● Auto' : '○ Manual'}
                </button>
                <button
                  onClick={fetchInbox}
                  className="p-1 rounded hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            )}
          </div>
          {!activeEmail ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <p className="text-sm">Chọn email để xem inbox</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <p className="text-sm">Inbox trống</p>
              <p className="text-xs mt-1">Đợi email đến...</p>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className="p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: selectedMessage?.id === msg.id ? 'var(--accent-light)' : 'transparent',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm ${!msg.read ? 'font-bold' : ''}`}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {truncate(msg.from, 30)}
                    </span>
                    {!msg.read && (
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {msg.subject}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message View */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
            MESSAGE
          </h3>
          {!selectedMessage ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <p className="text-sm">Chọn email để đọc</p>
            </div>
          ) : (
            <div>
              <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <h4 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {selectedMessage.subject}
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  From: {selectedMessage.from}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {timeAgo(selectedMessage.date)}
                </p>
              </div>
              <div
                className="text-sm prose-invert max-w-none"
                style={{ color: 'var(--text-secondary)' }}
                dangerouslySetInnerHTML={{
                  __html: selectedMessage.bodyHtml || selectedMessage.bodyText || 'No content',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
