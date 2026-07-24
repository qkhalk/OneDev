'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ArrowRight,
  ArrowLeftRight,
  Copy,
  Check,
  Trash2,
  Loader2,
  Zap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import type { ConverterTool } from '@/lib/converter-tools'

interface ConverterToolProps {
  tool: ConverterTool
  onClose?: () => void
}

export default function ConverterToolComponent({ tool }: ConverterToolProps) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [options, setOptions] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    tool.options?.forEach((opt) => {
      if (opt.default !== undefined) {
        defaults[opt.name] = opt.default
      }
    })
    return defaults
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'input' | 'output' | null>(null)
  const [autoConvert, setAutoConvert] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUuidTool = tool.id === 'uuid'
  const isQrTool = tool.id === 'qr'

  // ── API call ──────────────────────────────────────────────
  const doConvert = useCallback(async () => {
    if (!input.trim() && !isUuidTool) {
      setError(null)
      setOutput('')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(tool.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, ...options }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || data.details || `HTTP ${res.status}`)
      }

      setOutput(data.output ?? data.result ?? data.data ?? JSON.stringify(data, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setOutput('')
    } finally {
      setLoading(false)
    }
  }, [input, options, tool.endpoint, isUuidTool])

  // ── Auto-convert (debounced) ──────────────────────────────
  useEffect(() => {
    if (!autoConvert) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      doConvert()
    }, 500)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [input, options, autoConvert, doConvert])

  // ── Actions ───────────────────────────────────────────────
  const handleSwap = () => {
    if (!tool.bidirectional) return
    const tmp = input
    setInput(output)
    setOutput(tmp)
  }

  const handleCopy = async (which: 'input' | 'output') => {
    const text = which === 'input' ? input : output
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // fallback
    }
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
    setError(null)
  }

  const handleOptionChange = (name: string, value: string) => {
    setOptions((prev) => ({ ...prev, [name]: value }))
  }

  const handleGenerate = () => {
    // For UUID, trigger convert with empty input
    doConvert()
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Options bar */}
      {tool.options && tool.options.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-4 p-3 rounded-lg"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          {tool.options.map((opt) => (
            <div key={opt.name} className="flex items-center gap-2">
              <label
                className="text-xs font-medium whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
              >
                {opt.label}
              </label>
              {opt.type === 'select' ? (
                <select
                  value={options[opt.name] ?? opt.default ?? ''}
                  onChange={(e) => handleOptionChange(opt.name, e.target.value)}
                  className="px-2 py-1 rounded text-xs outline-none cursor-pointer"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {opt.choices?.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={options[opt.name] ?? opt.default ?? ''}
                  onChange={(e) => handleOptionChange(opt.name, e.target.value)}
                  className="px-2 py-1 rounded text-xs outline-none w-20"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Split view */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-3 min-h-0">
        {/* Input panel */}
        <div className="flex flex-col min-h-0">
          <div
            className="flex items-center justify-between px-3 py-2 rounded-t-lg"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderBottom: 'none' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {tool.inputLabel}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopy('input')}
                title="Copy input"
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                {copied === 'input' ? (
                  <Check size={14} style={{ color: 'var(--success)' }} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
              <button
                onClick={handleClear}
                title="Clear all"
                className="p-1.5 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Enter ${tool.inputLabel.toLowerCase()}...`}
            className="flex-1 rounded-b-lg p-3 text-sm font-mono outline-none resize-none min-h-[300px]"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderTop: 'none',
              color: 'var(--text-primary)',
            }}
            spellCheck={false}
          />
        </div>

        {/* Toolbar */}
        <div className="flex lg:flex-col items-center justify-center gap-2 py-2">
          {tool.bidirectional && (
            <button
              onClick={handleSwap}
              title="Swap input/output"
              className="p-2 rounded-lg transition-all hover:scale-110"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <ArrowLeftRight size={18} />
            </button>
          )}

          <button
            onClick={isUuidTool ? handleGenerate : doConvert}
            disabled={loading || (!isUuidTool && !input.trim())}
            title={isUuidTool ? 'Generate' : 'Convert'}
            className="p-2.5 rounded-lg transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color: 'white',
            }}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isUuidTool ? (
              <RefreshCw size={18} />
            ) : (
              <ArrowRight size={18} />
            )}
          </button>

          {/* Auto-convert toggle */}
          {!isUuidTool && (
            <button
              onClick={() => setAutoConvert(!autoConvert)}
              title="Auto convert (debounce 500ms)"
              className="p-2 rounded-lg transition-all"
              style={{
                background: autoConvert ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: autoConvert ? 'var(--accent-hover)' : 'var(--text-muted)',
              }}
            >
              <Zap size={16} fill={autoConvert ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* Output panel */}
        <div className="flex flex-col min-h-0">
          <div
            className="flex items-center justify-between px-3 py-2 rounded-t-lg"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderBottom: 'none' }}
          >
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {tool.outputLabel}
            </span>
            <button
              onClick={() => handleCopy('output')}
              title="Copy output"
              disabled={!output}
              className="p-1.5 rounded transition-colors disabled:opacity-30"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => !output || (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              {copied === 'output' ? (
                <Check size={14} style={{ color: 'var(--success)' }} />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
          {isQrTool && output && output.startsWith('data:image') ? (
            <div
              className="flex-1 rounded-b-lg p-4 flex items-center justify-center min-h-[300px]"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderTop: 'none',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={output} alt="QR Code" className="max-w-full max-h-[400px] rounded" />
            </div>
          ) : (
            <textarea
              value={output}
              readOnly
              placeholder="Output sẽ hiển thị ở đây..."
              className="flex-1 rounded-b-lg p-3 text-sm font-mono outline-none resize-none min-h-[300px]"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderTop: 'none',
                color: 'var(--text-primary)',
              }}
              spellCheck={false}
            />
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg text-sm"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--danger)',
          }}
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Footer hint */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>
          {autoConvert ? '⚡ Auto-convert đang bật' : 'Nhấn nút Convert hoặc bật auto-convert'}
        </span>
        {tool.bidirectional && (
          <span>↔ Bidirectional — có thể swap input/output</span>
        )}
      </div>
    </div>
  )
}
