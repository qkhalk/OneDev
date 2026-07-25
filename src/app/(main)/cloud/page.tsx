'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { rclone } from '@/lib/rclone-api'
import type { Remote, Toast } from '@/lib/cloud-types'
import { RemoteList } from '@/components/cloud/RemoteList'
import { FileBrowser } from '@/components/cloud/FileBrowser'
import { UploadPanel } from '@/components/cloud/UploadPanel'
import { AddRemoteModal } from '@/components/cloud/AddRemoteModal'

/**
 * Cloud Manager Page
 *
 * Two-panel layout:
 * - Left: Remote list (cloud accounts) with Add/Refresh buttons
 * - Right: File browser with breadcrumb, toolbar, and file list
 *
 * Converted from rclone-webui Svelte app to Next.js/TypeScript.
 */
export default function CloudPage() {
  const [remotes, setRemotes] = useState<Remote[]>([])
  const [configDump, setConfigDump] = useState<Record<string, { type: string }>>({})
  const [selectedRemote, setSelectedRemote] = useState<string | null>(null)
  const [selectedFs, setSelectedFs] = useState('')
  const [loadingRemotes, setLoadingRemotes] = useState(true)
  const [connected, setConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showAddRemote, setShowAddRemote] = useState(false)
  const toastIdRef = useRef(0)

  // Toast helper
  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = ++toastIdRef.current
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 4000)
    },
    []
  )

  // Load remotes from rclone
  const loadRemotes = useCallback(async () => {
    setLoadingRemotes(true)
    setConnectionError(null)
    try {
      const [list, dump] = await Promise.all([
        rclone.listRemotes(),
        rclone.configDump().catch(() => ({})),
      ])

      const remoteNames = list.remotes || []
      const dumpData = dump as Record<string, { type: string }>
      setConfigDump(dumpData)

      const remoteList: Remote[] = remoteNames.map((name) => {
        const cleanName = name.replace(/:$/, '')
        const type = dumpData[cleanName]?.type || 'unknown'
        return { name: cleanName, type }
      })

      setRemotes(remoteList)
      setConnected(true)
    } catch (err) {
      setConnected(false)
      setConnectionError(
        err instanceof Error ? err.message : 'Cannot connect to rclone'
      )
    } finally {
      setLoadingRemotes(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadRemotes()
  }, [loadRemotes])

  // Select a remote
  const handleSelectRemote = useCallback((remote: Remote) => {
    setSelectedRemote(remote.name)
    setSelectedFs(`${remote.name}:`)
  }, [])

  // Refresh handler
  const handleRefresh = useCallback(() => {
    loadRemotes()
  }, [loadRemotes])

  // Upload complete handler
  const handleUploadComplete = useCallback(() => {
    addToast('Upload complete', 'success')
  }, [addToast])

  // Remote created handler
  const handleRemoteCreated = useCallback(() => {
    addToast('Remote added successfully', 'success')
    loadRemotes()
  }, [addToast, loadRemotes])

  // Toast colors
  const toastColors: Record<Toast['type'], string> = {
    info: 'var(--accent)',
    success: 'var(--success)',
    error: 'var(--danger)',
    warning: 'var(--warning)',
  }

  // Not connected state
  if (!connected && !loadingRemotes) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-20">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--danger)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h.01M2 8.82a15 15 0 0 1 20 0M5 12.859a10 10 0 0 1 14 0M8.5 16.429a5 5 0 0 1 7 0" />
            </svg>
          </div>
          <h2
            className="text-lg font-semibold mb-1.5"
            style={{ color: 'var(--text-primary)' }}
          >
            Cannot connect to rclone
          </h2>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            Make sure rclone rcd is running on the configured endpoint.
          </p>
          {connectionError && (
            <p
              className="text-xs mb-4 font-mono"
              style={{ color: 'var(--danger)' }}
            >
              {connectionError}
            </p>
          )}
          <button
            onClick={loadRemotes}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Retry
          </button>
        </div>

        {/* Toasts */}
        <ToastContainer toasts={toasts} colors={toastColors} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="mb-4">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          ☁️ Cloud Manager
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage multi-cloud storage with rclone
        </p>
      </div>

      {/* Main content - 2 panel layout */}
      <div
        className="flex-1 flex overflow-hidden rounded-xl"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Left panel: Remotes */}
        <div className="w-[260px] flex-shrink-0">
          <RemoteList
            remotes={remotes}
            selectedRemote={selectedRemote}
            loading={loadingRemotes}
            onSelect={handleSelectRemote}
            onRefresh={handleRefresh}
            onAddRemote={() => setShowAddRemote(true)}
          />
        </div>

        {/* Right panel: File browser */}
        <div className="flex-1 overflow-hidden">
          {selectedFs ? (
            <FileBrowser
              key={selectedFs}
              fs={selectedFs}
              onToast={addToast}
              onOpenUpload={() => setShowUpload(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.5 19a4.5 4.5 0 1 0 0-9h-1.8A7 7 0 1 0 4 14.9" />
                  </svg>
                </div>
                <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                  {remotes.length > 0
                    ? 'Select a cloud drive to browse'
                    : 'No cloud drives connected'}
                </p>
                {remotes.length === 0 && (
                  <button
                    onClick={() => setShowAddRemote(true)}
                    className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    + Add Your First Cloud
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload panel */}
      <UploadPanel
        isOpen={showUpload}
        fs={selectedFs}
        currentPath=""
        onClose={() => setShowUpload(false)}
        onComplete={handleUploadComplete}
      />

      {/* Add remote modal */}
      <AddRemoteModal
        isOpen={showAddRemote}
        onClose={() => setShowAddRemote(false)}
        onCreated={handleRemoteCreated}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} colors={toastColors} />
    </div>
  )
}

/** Toast notification container */
function ToastContainer({
  toasts,
  colors,
}: {
  toasts: Toast[]
  colors: Record<Toast['type'], string>
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-bottom-2"
          style={{
            background: 'var(--bg-secondary)',
            border: `1px solid ${colors[toast.type]}`,
            color: 'var(--text-primary)',
            borderLeft: `3px solid ${colors[toast.type]}`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: colors[toast.type] }}
          />
          {toast.message}
        </div>
      ))}
    </div>
  )
}
