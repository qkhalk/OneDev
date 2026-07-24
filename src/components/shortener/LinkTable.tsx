'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Trash2, BarChart3, Copy, Lock, Clock } from 'lucide-react'
import { formatDate, formatBytes } from '@/lib/utils'

interface ShortLink {
  id: string
  alias: string
  originalUrl: string
  password?: string | null
  expiresAt?: string | null
  createdAt: string
  clicks: number
  visitCount?: number
}

export default function LinkTable() {
  const [links, setLinks] = useState<ShortLink[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null)

  const fetchLinks = async () => {
    try {
      const res = await fetch('/api/shortener')
      const data = await res.json()
      setLinks(data.links || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLinks()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa link này?')) return
    await fetch(`/api/shortener/${id}`, { method: 'DELETE' })
    fetchLinks()
  }

  if (loading) {
    return (
      <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
        Đang tải...
      </div>
    )
  }

  if (links.length === 0) {
    return (
      <div className="card p-8 text-center" style={{ color: 'var(--text-muted)' }}>
        <p>Chưa có link nào. Tạo link đầu tiên!</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th className="text-left p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>SHORT URL</th>
            <th className="text-left p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>ORIGINAL</th>
            <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>CLICKS</th>
            <th className="text-left p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>CREATED</th>
            <th className="text-right p-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}></th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr
              key={link.id}
              style={{ borderBottom: '1px solid var(--border)' }}
              className="hover:opacity-80 transition-opacity"
            >
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <a
                    href={`/${link.alias}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm font-semibold"
                    style={{ color: 'var(--accent-hover)' }}
                  >
                    /{link.alias}
                  </a>
                  {link.password && <Lock size={12} style={{ color: 'var(--warning)' }} />}
                </div>
              </td>
              <td className="p-3 max-w-xs">
                <div className="flex items-center gap-1">
                  <span
                    className="text-sm truncate"
                    style={{ color: 'var(--text-secondary)' }}
                    title={link.originalUrl}
                  >
                    {link.originalUrl}
                  </span>
                  <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} className="flex-shrink-0" />
                </div>
              </td>
              <td className="p-3 text-right">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {link.visitCount || link.clicks || 0}
                </span>
              </td>
              <td className="p-3">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(link.createdAt)}
                </span>
              </td>
              <td className="p-3 text-right">
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => setSelectedLink(link)}
                    className="p-1.5 rounded hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                    title="Stats"
                  >
                    <BarChart3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-1.5 rounded hover:opacity-70"
                    style={{ color: 'var(--danger)' }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
