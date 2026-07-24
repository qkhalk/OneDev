'use client'

import { useState } from 'react'
import { Search, ArrowLeft, ArrowLeftRight } from 'lucide-react'
import { converterTools, type ConverterTool } from '@/lib/converter-tools'
import Icon from '@/components/Icon'
import ConverterToolComponent from '@/components/converter/ConverterTool'

export default function ConverterHubPage() {
  const [activeTool, setActiveTool] = useState<ConverterTool | null>(null)
  const [search, setSearch] = useState('')

  const filteredTools = converterTools.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  )

  // Active tool view
  if (activeTool) {
    return (
      <div className="max-w-7xl mx-auto fade-in">
        <div className="flex flex-col h-[calc(100vh-7rem)]">
          {/* Tool header */}
          <div
            className="flex items-center justify-between p-3 sm:p-4 rounded-t-xl gap-2"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderBottom: 'none' }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setActiveTool(null)}
                className="p-2 rounded-lg transition-colors flex-shrink-0"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                <ArrowLeft size={18} />
              </button>
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--accent-light)', border: '1px solid var(--border)' }}
              >
                <Icon name={activeTool.icon} size={20} style={{ color: 'var(--accent-hover)' }} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {activeTool.name}
                </h2>
                <p className="text-[11px] sm:text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {activeTool.description}
                </p>
              </div>
            </div>
            {activeTool.bidirectional && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0"
                style={{ background: 'var(--accent-light)', color: 'var(--accent-hover)' }}
              >
                <ArrowLeftRight size={11} /> Bidirectional
              </div>
            )}
          </div>

          {/* Tool body */}
          <div
            className="flex-1 p-3 sm:p-4 rounded-b-xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderTop: 'none' }}
          >
            <ConverterToolComponent tool={activeTool} onClose={() => setActiveTool(null)} />
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="max-w-7xl mx-auto fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          Converter Hub
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Bộ công cụ chuyển đổi format — JSON, YAML, XML, CSV, Base64, JWT, Hash, UUID, và nhiều hơn nữa.
        </p>
      </div>

      {/* Search */}
      <div className="mb-5 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm converter tool..."
          className="w-full pl-9 pr-4 py-2 rounded-[10px] text-[13px] outline-none transition-all"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool)}
            className="card card-hover p-4 text-left group cursor-pointer"
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
              style={{ background: 'var(--accent-light)', border: '1px solid var(--border)' }}
            >
              <Icon name={tool.icon} size={20} style={{ color: 'var(--accent-hover)' }} />
            </div>
            <h3 className="font-semibold text-[13px] mb-1" style={{ color: 'var(--text-primary)' }}>
              {tool.name}
            </h3>
            <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {tool.description}
            </p>
          </button>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <p className="text-base">Không tìm thấy tool nào</p>
          <button onClick={() => setSearch('')} className="mt-2 text-sm hover:underline" style={{ color: 'var(--accent-hover)' }}>
            Xóa tìm kiếm
          </button>
        </div>
      )}
    </div>
  )
}
