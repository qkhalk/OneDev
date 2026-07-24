'use client'

import { memo, useCallback } from 'react'
import type { FileItem } from '@/lib/cloud-types'
import { FILE_ICON_MAP, FILE_ICON_COLORS } from '@/lib/cloud-types'

interface FileRowProps {
  file: FileItem
  isSelected: boolean
  onOpen: (file: FileItem) => void
  onSelect: (file: FileItem, multi: boolean) => void
  onContextMenu: (e: React.MouseEvent, file: FileItem) => void
}

/** SVG path data for file/folder icons */
const ICON_PATHS: Record<string, string> = {
  folder:
    '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  'folder-open':
    '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l1.81 2.7a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  image:
    '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  video:
    '<path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/>',
  music:
    '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  archive:
    '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
  'file-text':
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  file:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
}

/** Get icon type for a file based on extension */
function getFileIconType(name: string, isDir: boolean): string {
  if (isDir) return 'folder'
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return FILE_ICON_MAP[ext] || 'file'
}

/** Format bytes to human-readable string */
function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

/** Format ISO date to localized date string */
function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function FileRowBase({
  file,
  isSelected,
  onOpen,
  onSelect,
  onContextMenu,
}: FileRowProps) {
  const iconType = getFileIconType(file.Name, file.IsDir)
  const iconColor = FILE_ICON_COLORS[iconType] || FILE_ICON_COLORS.file
  const iconPath = ICON_PATHS[iconType] || ICON_PATHS.file

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(file, e.ctrlKey || e.metaKey)
    },
    [file, onSelect]
  )

  const handleDoubleClick = useCallback(() => {
    onOpen(file)
  }, [file, onOpen])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(e, file)
    },
    [file, onContextMenu]
  )

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className="flex items-center gap-3 px-4 py-2.5 text-sm border-b transition-colors cursor-pointer outline-none"
      style={{
        borderColor: 'var(--border)',
        background: isSelected ? 'var(--accent-light)' : 'transparent',
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
      {/* Icon */}
      <span className="flex-shrink-0 flex items-center">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: iconPath }}
        />
      </span>

      {/* Name */}
      <span
        className="flex-1 truncate"
        style={{
          color: 'var(--text-primary)',
          fontWeight: file.IsDir ? 600 : 400,
        }}
      >
        {file.Name}
      </span>

      {/* Size */}
      <span
        className="hidden sm:block text-xs text-right"
        style={{
          color: 'var(--text-muted)',
          width: '90px',
        }}
      >
        {file.IsDir ? '—' : formatSize(file.Size)}
      </span>

      {/* Modified */}
      <span
        className="hidden sm:block text-xs text-right"
        style={{
          color: 'var(--text-muted)',
          width: '130px',
        }}
      >
        {formatDate(file.ModTime)}
      </span>
    </div>
  )
}

export const FileRow = memo(FileRowBase)
export default FileRow
