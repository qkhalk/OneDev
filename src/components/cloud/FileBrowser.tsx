'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { rclone } from '@/lib/rclone-api'
import type { RcloneFileItem } from '@/lib/rclone-api'
import type { FileItem, BreadcrumbPart, ContextMenuItem } from '@/lib/cloud-types'
import { FileRow } from './FileRow'
import { Breadcrumb } from './Breadcrumb'

interface FileBrowserProps {
  /** The selected remote fs, e.g. "mydrive:" */
  fs: string
  /** Callback when a toast notification should be shown */
  onToast: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void
  /** Callback to open upload panel */
  onOpenUpload: () => void
}

/** Context menu state */
interface ContextMenuState {
  x: number
  y: number
  file: FileItem | null
}

/** Sort files: folders first, then alphabetical */
function sortFiles(files: FileItem[]): FileItem[] {
  return [...files].sort((a, b) => {
    if (a.IsDir && !b.IsDir) return -1
    if (!a.IsDir && b.IsDir) return 1
    return a.Name.localeCompare(b.Name)
  })
}

/** Context menu items for files */
const FILE_CONTEXT_MENU: ContextMenuItem[] = [
  { action: 'download', label: 'Download', icon: 'download' },
  { action: 'copy', label: 'Copy', icon: 'copy' },
  { action: 'move', label: 'Move', icon: 'move' },
  { action: 'rename', label: 'Rename', icon: 'edit' },
  { action: 'delete', label: 'Delete', icon: 'trash', danger: true },
]

/** Context menu items for folders */
const FOLDER_CONTEXT_MENU: ContextMenuItem[] = [
  { action: 'open', label: 'Open', icon: 'folder' },
  { action: 'copy', label: 'Copy', icon: 'copy' },
  { action: 'move', label: 'Move', icon: 'move' },
  { action: 'rename', label: 'Rename', icon: 'edit' },
  { action: 'delete', label: 'Delete', icon: 'trash', danger: true },
]

export function FileBrowser({ fs, onToast, onOpenUpload }: FileBrowserProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Load files when fs or path changes
  const loadFiles = useCallback(async () => {
    if (!fs) return
    setLoading(true)
    setSelectedFiles(new Set())
    try {
      const result = await rclone.operationsList(fs, currentPath)
      const fileList = (result.list || []) as FileItem[]
      setFiles(sortFiles(fileList))
    } catch (err) {
      onToast(
        `Failed to load files: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'error'
      )
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [fs, currentPath, onToast])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Reset path when fs changes
  useEffect(() => {
    setCurrentPath('')
  }, [fs])

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  // Build breadcrumb parts
  const breadcrumbs: BreadcrumbPart[] = useMemo(() => {
    const parts: BreadcrumbPart[] = [
      {
        name: fs || 'Home',
        fs,
        path: '',
        isLast: currentPath === '',
      },
    ]

    if (currentPath) {
      const segments = currentPath.split('/').filter(Boolean)
      segments.forEach((seg, i) => {
        parts.push({
          name: seg,
          fs,
          path: segments.slice(0, i + 1).join('/'),
          isLast: i === segments.length - 1,
        })
      })
    }

    return parts
  }, [fs, currentPath])

  // Navigate to a path
  const navigateTo = useCallback((path: string) => {
    setCurrentPath(path)
  }, [])

  // Open a file or folder
  const handleOpen = useCallback(
    (file: FileItem) => {
      if (file.IsDir) {
        setCurrentPath((prev) => (prev ? `${prev}/${file.Name}` : file.Name))
      }
    },
    []
  )

  // Select a file (supports multi-select with Ctrl/Cmd)
  const handleSelect = useCallback((file: FileItem, multi: boolean) => {
    setSelectedFiles((prev) => {
      if (multi) {
        const next = new Set(prev)
        if (next.has(file.Name)) {
          next.delete(file.Name)
        } else {
          next.add(file.Name)
        }
        return next
      }
      return new Set([file.Name])
    })
  }, [])

  // Context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, file: FileItem) => {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, file })
      if (!selectedFiles.has(file.Name)) {
        setSelectedFiles(new Set([file.Name]))
      }
    },
    [selectedFiles]
  )

  // Toolbar actions
  const handleNewFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      setShowNewFolderInput(false)
      return
    }

    try {
      const remote = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim()
      await rclone.operationsMkdir(fs, remote)
      onToast(`Folder "${newFolderName.trim()}" created`, 'success')
      setNewFolderName('')
      setShowNewFolderInput(false)
      loadFiles()
    } catch (err) {
      onToast(
        `Failed to create folder: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'error'
      )
    }
  }, [fs, currentPath, newFolderName, onToast, loadFiles])

  const handleDownload = useCallback(async (file: FileItem) => {
    if (file.IsDir) {
      return // Can't download directories directly
    }
    try {
      const { url } = await rclone.downloadFile(fs, file.Path || file.Name)
      if (typeof window !== 'undefined') {
        const a = document.createElement('a')
        a.href = url
        a.download = file.Name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      onToast(
        `Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        'error'
      )
    }
  }, [fs, onToast])

  const handleDelete = useCallback(
    async (file: FileItem) => {
      if (!confirm(`Delete "${file.Name}"? This cannot be undone.`)) return

      try {
        if (file.IsDir) {
          await rclone.operationsPurge(fs, file.Path || file.Name)
        } else {
          await rclone.operationsDeletefile(fs, file.Path || file.Name)
        }
        onToast(`"${file.Name}" deleted`, 'success')
        loadFiles()
      } catch (err) {
        onToast(
          `Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          'error'
        )
      }
    },
    [fs, onToast, loadFiles]
  )

  // Context menu action handler
  const handleContextAction = useCallback(
    (action: string, file: FileItem | null) => {
      setContextMenu(null)
      if (!file) return

      switch (action) {
        case 'open':
          handleOpen(file)
          break
        case 'download':
          handleDownload(file)
          break
        case 'delete':
          handleDelete(file)
          break
        case 'copy':
          onToast('Copy feature: select destination in transfer panel', 'info')
          break
        case 'move':
          onToast('Move feature: select destination in transfer panel', 'info')
          break
        case 'rename':
          onToast('Rename feature coming soon', 'info')
          break
      }
    },
    [handleOpen, handleDownload, handleDelete, onToast]
  )

  // Toolbar button component
  const ToolbarButton = ({
    onClick,
    icon,
    label,
    disabled,
  }: {
    onClick: () => void
    icon: React.ReactNode
    label: string
    disabled?: boolean
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.color = 'var(--accent)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )

  // Icon SVGs
  const iconPlus = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
  const iconUpload = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
  const iconDownload = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
  const iconTrash = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
  const iconCopy = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
  const iconMove = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 9 2 12 5 15" />
      <polyline points="9 5 12 2 15 5" />
      <polyline points="15 19 12 22 9 19" />
      <polyline points="19 9 22 12 19 15" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  )

  const selectedFile = files.find((f) => selectedFiles.has(f.Name)) || null
  const hasSelection = selectedFiles.size > 0

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b flex-wrap"
        style={{ borderColor: 'var(--border)' }}
      >
        <ToolbarButton
          onClick={() => setShowNewFolderInput(true)}
          icon={iconPlus}
          label="New Folder"
        />
        <ToolbarButton onClick={onOpenUpload} icon={iconUpload} label="Upload" />
        <ToolbarButton
          onClick={() => selectedFile && !selectedFile.IsDir && handleDownload(selectedFile)}
          icon={iconDownload}
          label="Download"
          disabled={!selectedFile || selectedFile.IsDir}
        />
        <ToolbarButton
          onClick={() => selectedFile && handleDelete(selectedFile)}
          icon={iconTrash}
          label="Delete"
          disabled={!hasSelection}
        />
        <ToolbarButton
          onClick={() => onToast('Copy: select destination remote', 'info')}
          icon={iconCopy}
          label="Copy"
          disabled={!hasSelection}
        />
        <ToolbarButton
          onClick={() => onToast('Move: select destination remote', 'info')}
          icon={iconMove}
          label="Move"
          disabled={!hasSelection}
        />
      </div>

      {/* Breadcrumb */}
      <div className="px-4 pt-3">
        <Breadcrumb parts={breadcrumbs} onNavigate={navigateTo} />
      </div>

      {/* New folder input */}
      {showNewFolderInput && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNewFolder()
                if (e.key === 'Escape') {
                  setShowNewFolderInput(false)
                  setNewFolderName('')
                }
              }}
              placeholder="Folder name..."
              autoFocus
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--accent)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleNewFolder}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFolderInput(false)
                setNewFolderName('')
              }}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="rounded-xl mx-4 mb-4 overflow-hidden"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-2"
              >
                <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l1.81 2.7a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Empty folder
              </p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div
                className="hidden sm:grid gap-2 px-4 py-2.5 border-b text-xs font-medium uppercase tracking-wide"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                  gridTemplateColumns: '1fr 90px 130px',
                }}
              >
                <span>Name</span>
                <span className="text-right">Size</span>
                <span className="text-right">Modified</span>
              </div>

              {/* Up button */}
              {currentPath && (
                <button
                  onClick={() => {
                    const parts = currentPath.split('/').filter(Boolean)
                    parts.pop()
                    navigateTo(parts.join('/'))
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  <span style={{ color: 'var(--text-muted)' }}>..</span>
                </button>
              )}

              {/* File rows */}
              {files.map((file) => (
                <FileRow
                  key={file.Name}
                  file={file}
                  isSelected={selectedFiles.has(file.Name)}
                  onOpen={handleOpen}
                  onSelect={handleSelect}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 py-1 rounded-lg shadow-xl min-w-[160px]"
          style={{
            left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`,
            top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px`,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          {(contextMenu.file?.IsDir ? FOLDER_CONTEXT_MENU : FILE_CONTEXT_MENU).map((item) => (
            <button
              key={item.action}
              onClick={() => handleContextAction(item.action, contextMenu.file)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
              style={{
                color: item.danger ? 'var(--danger)' : 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = item.danger
                  ? 'rgba(239,68,68,0.1)'
                  : 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileBrowser
