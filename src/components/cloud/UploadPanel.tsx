'use client'

import { useState, useCallback, useRef } from 'react'
import type { UploadEntry } from '@/lib/cloud-types'
import { rclone } from '@/lib/rclone-api'

interface UploadPanelProps {
  isOpen: boolean
  fs: string
  currentPath: string
  onClose: () => void
  onComplete: () => void
}

/**
 * Upload dialog with drag-and-drop and file picker.
 * Uploads files to the current rclone remote path.
 */
export function UploadPanel({
  isOpen,
  fs,
  currentPath,
  onClose,
  onComplete,
}: UploadPanelProps) {
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadOne = useCallback(
    async (entry: UploadEntry, file: File) => {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: 'uploading' as const } : e
        )
      )

      try {
        const remote = currentPath ? `${currentPath}/${file.name}` : file.name
        await rclone.uploadFile(fs, remote, file)
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? { ...e, status: 'done' as const, progress: 100 }
              : e
          )
        )
      } catch (err) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? {
                  ...e,
                  status: 'error' as const,
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : e
          )
        )
      }
    },
    [fs, currentPath]
  )

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList)
      const newEntries: UploadEntry[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        fileName: file.name,
        size: file.size,
        progress: 0,
        status: 'pending' as const,
      }))

      setEntries((prev) => [...prev, ...newEntries])

      // Upload sequentially
      newEntries.forEach((entry, i) => {
        uploadOne(entry, files[i])
      })
    },
    [uploadOne]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClose = useCallback(() => {
    const allDone = entries.every((e) => e.status === 'done' || e.status === 'error')
    if (allDone && entries.length > 0) {
      onComplete()
    }
    setEntries([])
    onClose()
  }, [entries, onClose, onComplete])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}
    >
      <div
        className="rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Upload Files
          </h3>
          <button
            onClick={handleClose}
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
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
            style={{
              borderColor: isDragging ? 'var(--accent)' : 'var(--border)',
              background: isDragging ? 'var(--accent-light)' : 'var(--bg-primary)',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Drop files here or{' '}
              <span style={{ color: 'var(--accent)' }}>browse</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Upload to: {fs}
              {currentPath ? `/${currentPath}` : ''}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {/* Upload entries */}
          {entries.length > 0 && (
            <div className="mt-4 space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg"
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {entry.fileName}
                    </p>
                    <div
                      className="mt-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--bg-hover)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${entry.progress}%`,
                          background:
                            entry.status === 'error'
                              ? 'var(--danger)'
                              : entry.status === 'done'
                              ? 'var(--success)'
                              : 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {entry.status === 'uploading' && 'Uploading...'}
                    {entry.status === 'done' && '✓ Done'}
                    {entry.status === 'error' && '✗ Failed'}
                    {entry.status === 'pending' && 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end p-4 border-t gap-2"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'white',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadPanel
