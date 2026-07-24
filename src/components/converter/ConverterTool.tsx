'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  ArrowRight, ArrowLeftRight, Copy, Check, Trash2, Loader2, Zap, AlertCircle, RefreshCw,
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
      if (opt.default !== undefined) defaults[opt.name] = opt.default
    })
    return defaults
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'input' | 'output' | null>(null)
  const [autoConvert, setAutoConvert] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUuidTool = tool.id === 'uuid'

  const doConvert = useCallback(async () => {
    if (!input.trim() && !isUuidTool) { setError(null); setOutput(''); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch(tool.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, ...options }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
      setOutput(data.output ?? data.result ?? JSON.stringify(data, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
      setOutput('')
    } finally {
      setLoading(false)
    }
  }, [input, options, tool.endpoint, isUuidTool])

  useEffect(() => {
    if (!autoConvert) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => doConvert(), 500)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [input, options, autoConvert, doConvert])

  const handleSwap = () => { if (tool.bidirectional) { const t = input; setInput(output); setOutput(t) } }
  const handleCopy = (which: 'input' | 'output') => {
    const text = which === 'input' ? input : output
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(which); setTimeout(() => setCopied(null), 2000)
  }
  const handleClear = () => { setInput(''); setOutput(''); setError(null) }

  const Panel = ({ label, value, onChange, readOnly, placeholder, copyTarget }: {
    label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean
    placeholder: string; copyTarget: 'input' | 'output'
  }) => (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3 py-2 rounded-t-[10px]"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderBottom: 'none' }}>
        <span className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <button onClick={() => handleCopy(copyTarget)} disabled={!value}
          className="p-1.5 rounded transition-colors disabled:opacity-30 cursor-pointer"
          style={{ color: copied === copyTarget ? 'var(--success)' : 'var(--text-muted)' }}>
          {copied === copyTarget ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <textarea
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        spellCheck={false}
        className="flex-1 rounded-b-[10px] p-3 text-[13px] font-mono outline-none resize-none min-h-[200px] lg:min-h-[300px] transition-all"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderTop: 'none', color: 'var(--text-primary)' }}
      />
    </div>
  )

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Options */}
      {tool.options && tool.options.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-[10px]"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          {tool.options.map((opt) => (
            <div key={opt.name} className="flex items-center gap-1.5">
              <label className="text-[11px] font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{opt.label}</label>
              {opt.type === 'select' ? (
                <select
                  value={options[opt.name] ?? opt.default ?? ''}
                  onChange={(e) => setOptions((p) => ({ ...p, [opt.name]: e.target.value }))}
                  className="px-2 py-1 rounded text-[11px] outline-none cursor-pointer"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {opt.choices?.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              ) : (
                <input type="text" value={options[opt.name] ?? opt.default ?? ''}
                  onChange={(e) => setOptions((p) => ({ ...p, [opt.name]: e.target.value }))}
                  className="px-2 py-1 rounded text-[11px] outline-none w-16"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Split view: stacked on mobile, side-by-side on desktop */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-2 lg:gap-3 min-h-0">
        <Panel label={tool.inputLabel} value={input} onChange={setInput} placeholder={`Enter ${tool.inputLabel.toLowerCase()}...`} copyTarget="input" />

        {/* Toolbar */}
        <div className="flex lg:flex-col items-center justify-center gap-2 order-3 lg:order-none">
          <div className="flex lg:flex-col gap-2">
            {tool.bidirectional && (
              <button onClick={handleSwap} title="Swap"
                className="p-2 rounded-[8px] transition-all hover:scale-110 cursor-pointer"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <ArrowLeftRight size={16} />
              </button>
            )}
            <button onClick={isUuidTool ? doConvert : doConvert} disabled={loading || (!isUuidTool && !input.trim())}
              title="Convert"
              className="p-2.5 rounded-[8px] transition-all hover:scale-105 disabled:opacity-40 cursor-pointer"
              style={{ background: 'var(--gradient-accent)', color: 'white' }}>
              {loading ? <Loader2 size={16} className="animate-spin' /> : isUuidTool ? <RefreshCw size={16} /> : <ArrowRight size={16} />}
            </button>
            {!isUuidTool && (
              <button onClick={() => setAutoConvert(!autoConvert)} title="Auto convert"
                className="p-2 rounded-[8px] transition-all cursor-pointer"
                style={{ background: autoConvert ? 'var(--accent-light)' : 'var(--bg-tertiary)', border: '1px solid var(--border)', color: autoConvert ? 'var(--accent-hover)' : 'var(--text-muted)' }}>
                <Zap size={14} fill={autoConvert ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        </div>

        <Panel label={tool.outputLabel} value={output} readOnly placeholder="Output..." copyTarget="output" />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-[8px] text-[13px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)' }}>
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Hints */}
      <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span>{autoConvert ? '⚡ Auto-convert đang bật' : 'Nhấn Convert hoặc bật auto'}</span>
        {tool.bidirectional && <span className="hidden sm:inline">↔ Có thể swap input/output</span>}
      </div>
    </div>
  )
}
