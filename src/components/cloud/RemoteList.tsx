'use client'

import { memo } from 'react'
import type { Remote } from '@/lib/cloud-types'
import { PROVIDER_NAMES, PROVIDER_COLORS } from '@/lib/cloud-types'

interface RemoteListProps {
  remotes: Remote[]
  selectedRemote: string | null
  loading: boolean
  onSelect: (remote: Remote) => void
  onRefresh: () => void
  onAddRemote: () => void
}

/** Cloud provider brand icon (inline SVG) */
function CloudProviderIcon({ type, size = 40 }: { type: string; size?: number }) {
  const color = PROVIDER_COLORS[type] || PROVIDER_COLORS.unknown

  // Simple letter-based icon as fallback
  const letter = (PROVIDER_NAMES[type] || type).charAt(0).toUpperCase()

  return (
    <div
      className="inline-flex items-center justify-center rounded-xl flex-shrink-0"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: color,
      }}
    >
      <span
        className="font-bold text-white"
        style={{ fontSize: `${size * 0.4}px` }}
      >
        {letter}
      </span>
    </div>
  )
}

function RemoteListBase({
  remotes,
  selectedRemote,
  loading,
  onSelect,
  onRefresh,
  onAddRemote,
}: RemoteListProps) {
  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Cloud Drives
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh"
            className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? 'animate-spin' : ''}
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
          </button>
          <button
            onClick={onAddRemote}
            title="Add Remote"
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--accent)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-light)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && remotes.length === 0 ? (
          <div className="flex justify-center py-8">
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: 'var(--accent)',
                borderTopColor: 'transparent',
              }}
            />
          </div>
        ) : remotes.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              No cloud drives connected
            </p>
            <button
              onClick={onAddRemote}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'white',
              }}
            >
              + Add Cloud
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {remotes.map((remote) => {
              const isSelected = selectedRemote === remote.name
              const displayName = PROVIDER_NAMES[remote.type] || remote.type

              return (
                <button
                  key={remote.name}
                  onClick={() => onSelect(remote)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: isSelected ? 'var(--accent-light)' : 'transparent',
                    border: isSelected
                      ? '1px solid var(--accent)'
                      : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'var(--bg-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <CloudProviderIcon type={remote.type} size={36} />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {remote.name}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {displayName}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export const RemoteList = memo(RemoteListBase)
export default RemoteList
