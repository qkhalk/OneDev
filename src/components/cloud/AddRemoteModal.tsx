'use client'

import { useState, useEffect, useCallback } from 'react'
import { rclone } from '@/lib/rclone-api'
import type { RcloneProvider, RcloneProviderOption } from '@/lib/rclone-api'
import { PROVIDER_NAMES, PROVIDER_COLORS } from '@/lib/cloud-types'

interface AddRemoteModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

/** Cloud provider icon for the modal grid */
function ProviderIcon({ type, size = 36 }: { type: string; size?: number }) {
  const color = PROVIDER_COLORS[type] || PROVIDER_COLORS.unknown
  const letter = (PROVIDER_NAMES[type] || type).charAt(0).toUpperCase()

  return (
    <div
      className="inline-flex items-center justify-center rounded-xl flex-shrink-0"
      style={{ width: `${size}px`, height: `${size}px`, background: color }}
    >
      <span className="font-bold text-white" style={{ fontSize: `${size * 0.4}px` }}>
        {letter}
      </span>
    </div>
  )
}

export function AddRemoteModal({ isOpen, onClose, onCreated }: AddRemoteModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [providers, setProviders] = useState<RcloneProvider[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [params, setParams] = useState<Record<string, string>>({})
  const [providerFields, setProviderFields] = useState<RcloneProviderOption[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build provider list from PROVIDER_NAMES
  const allProviders = Object.keys(PROVIDER_NAMES).map((type) => ({
    type,
    name: PROVIDER_NAMES[type],
  }))

  const filteredProviders = searchQuery.trim()
    ? allProviders.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allProviders

  // Load providers from rclone when modal opens
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setLoadingProviders(true)
    rclone
      .configProviders()
      .then((res) => {
        if (!cancelled) {
          setProviders(res.providers || [])
        }
      })
      .catch(() => {
        // Silently fail - we have fallback list from PROVIDER_NAMES
      })
      .finally(() => {
        if (!cancelled) setLoadingProviders(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setName('')
      setSelectedType('')
      setSearchQuery('')
      setParams({})
      setProviderFields([])
      setError(null)
    }
  }, [isOpen])

  const handleSelectProvider = useCallback(
    (type: string) => {
      if (!name.trim()) {
        setError('Please enter a drive name first')
        return
      }

      const provider = providers.find((p) => p.Name === type)
      const fields = provider
        ? (provider.Options || []).filter((o) => !o.Advanced)
        : []

      const newParams: Record<string, string> = {}
      fields.forEach((f) => {
        newParams[f.Name] = f.Default || ''
      })

      setSelectedType(type)
      setProviderFields(fields)
      setParams(newParams)
      setStep(2)
      setError(null)
    },
    [name, providers]
  )

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !selectedType) return
    setCreating(true)
    setError(null)

    try {
      await rclone.configCreate(name.trim(), selectedType, params)
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create remote')
    } finally {
      setCreating(false)
    }
  }, [name, selectedType, params, onCreated, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            )}
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {step === 1
                ? 'Select Cloud Drive'
                : `Configure ${PROVIDER_NAMES[selectedType] || selectedType}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {step === 1 ? (
            <>
              {/* Name input */}
              <div className="mb-4">
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Drive Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-drive"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                  }}
                />
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search providers..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Provider grid */}
              {loadingProviders ? (
                <div className="flex justify-center py-8">
                  <div
                    className="w-5 h-5 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {filteredProviders.map((provider) => (
                    <button
                      key={provider.type}
                      disabled={!name.trim()}
                      onClick={() => handleSelectProvider(provider.type)}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        border: '1px solid var(--border)',
                      }}
                      onMouseEnter={(e) => {
                        if (name.trim()) {
                          e.currentTarget.style.borderColor = 'var(--accent)'
                          e.currentTarget.style.background = 'var(--accent-light)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <ProviderIcon type={provider.type} size={36} />
                      <span
                        className="text-[10px] text-center leading-tight"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {provider.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {filteredProviders.length === 0 && !loadingProviders && (
                <p
                  className="text-center text-sm py-6"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No providers found
                </p>
              )}
            </>
          ) : (
            /* Step 2: Configuration form */
            <div className="space-y-3">
              <div
                className="flex items-center gap-3 rounded-lg p-3"
                style={{ background: 'var(--accent-light)' }}
              >
                <ProviderIcon type={selectedType} size={36} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--accent)' }}>
                    Creating <b>{name}</b>
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {PROVIDER_NAMES[selectedType] || selectedType}
                  </p>
                </div>
              </div>

              {providerFields.length > 0 ? (
                providerFields.map((field) => (
                  <div key={field.Name}>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {field.Name}
                      {field.Required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <input
                      type={field.IsPassword ? 'password' : 'text'}
                      value={params[field.Name] || ''}
                      onChange={(e) =>
                        setParams((prev) => ({ ...prev, [field.Name]: e.target.value }))
                      }
                      placeholder={field.Help || ''}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    />
                    {field.Help && (
                      <p
                        className="text-[10px] mt-0.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {field.Help}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p
                  className="text-sm text-center py-4"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No configuration needed. Click &quot;Add Drive&quot; to continue.
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="mt-3 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div
            className="flex items-center justify-end p-5 border-t gap-2"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)'
              }}
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
              style={{
                background: 'var(--accent)',
                color: 'white',
              }}
            >
              {creating ? 'Creating...' : 'Add Drive'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AddRemoteModal
