'use client'

import { memo } from 'react'
import type { BreadcrumbPart } from '@/lib/cloud-types'

interface BreadcrumbProps {
  parts: BreadcrumbPart[]
  onNavigate: (path: string) => void
}

/**
 * Breadcrumb navigation for the file browser.
 * Shows: [remote:] / folder1 / folder2 / current
 */
function BreadcrumbBase({ parts, onNavigate }: BreadcrumbProps) {
  if (parts.length === 0) return null

  return (
    <nav
      className="flex items-center gap-1 mb-3 text-sm flex-wrap"
      aria-label="Breadcrumb"
    >
      {parts.map((part, i) => (
        <div key={`${part.fs}-${i}`} className="flex items-center gap-1">
          {i > 0 && (
            <span style={{ color: 'var(--text-muted)' }} className="text-xs">
              /
            </span>
          )}
          {part.isLast ? (
            <span
              className="font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {part.name}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(part.path)}
              className="hover:underline transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              {part.name}
            </button>
          )}
        </div>
      ))}
    </nav>
  )
}

export const Breadcrumb = memo(BreadcrumbBase)
export default Breadcrumb
