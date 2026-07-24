'use client'

import { useState } from 'react'
import { Copy, Check, Link2, Lock, Clock, QrCode } from 'lucide-react'
import { copyToClipboard, isValidUrl } from '@/lib/utils'

export default function CreateLinkForm() {
  const [url, setUrl] = useState('')
  const [customAlias, setCustomAlias] = useState('')
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ alias: string; shortUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || !isValidUrl(url)) {
      setError('URL không hợp lệ')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/shortener', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalUrl: url,
          customAlias: customAlias || undefined,
          password: password || undefined,
          expiresAt: expiresAt || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create link')
      const shortUrl = `${window.location.origin}/${data.link.alias}`
      setResult({ alias: data.link.alias, shortUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (result) {
      copyToClipboard(result.shortUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const reset = () => {
    setUrl('')
    setCustomAlias('')
    setPassword('')
    setExpiresAt('')
    setResult(null)
    setError(null)
  }

  if (result) {
    return (
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Check size={20} style={{ color: 'var(--success)' }} />
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Link đã tạo!
          </h3>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <input
            value={result.shortUrl}
            readOnly
            className="input flex-1 font-mono"
            style={{ fontSize: '16px' }}
          />
          <button onClick={handleCopy} className="btn btn-primary">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Đã copy!' : 'Copy'}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="btn btn-secondary">
            <Link2 size={16} /> Tạo link mới
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 mb-6">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/very-long-url..."
            className="input flex-1"
            style={{ fontSize: '16px' }}
            required
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            <Link2 size={18} />
            {loading ? 'Đang tạo...' : 'Rút gọn'}
          </button>
        </div>

        {error && (
          <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs self-start"
          style={{ color: 'var(--text-muted)' }}
        >
          {showAdvanced ? '▼ Tùy chọn nâng cao' : '▶ Tùy chọn nâng cao'}
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>
                Custom Alias
              </label>
              <input
                type="text"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                placeholder="my-link"
                className="input"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Lock size={10} /> Password
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="optional"
                className="input"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Clock size={10} /> Expiry
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
