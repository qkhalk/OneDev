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
            className="flex items-center justify-between p-4 rounded-t-xl gap-3"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setActiveTool(null)}
                className="p-2 rounded-lg transition-all hover:bg-white/5 active:scale-95 flex-shrink-0"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <ArrowLeft size={18} />
              </button>
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--accent-light)',
                  border: '1px solid var(--border)',
                }}
              >
                <Icon
                  name={activeTool.icon}
                  size={20}
                  style={{ color: 'var(--accent-hover)' }}
                />
              </div>
              <div className="min-w-0">
                <h2
                  className="text-[16px] font-bold truncate leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {activeTool.name}
                </h2>
                <p
                  className="text-[12px] truncate leading-tight mt-0.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {activeTool.description}
                </p>
              </div>
            </div>
            {activeTool.bidirectional && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0"
                style={{
                  background: 'var(--accent-light)',
                  color: 'var(--accent-hover)',
                }}
              >
                <ArrowLeftRight size={11} />
                Bidirectional
              </div>
            )}
          </div>

          {/* Tool body */}
          <div
            className="flex-1 p-4 rounded-b-xl overflow-hidden flex flex-col"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderTop: 'none',
            }}
          >
            <ConverterToolComponent
              tool={activeTool}
              onClose={() => setActiveTool(null)}
            />
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="max-w-7xl mx-auto fade-in">
      <div className="mb-6">
        <h1
          className="text-2xl sm:text-[28px] font-bold tracking-tight mb-1 leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Converter Hub
        </h1>
        <p
          className="text-[14px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          Bộ công cụ chuyển đổi format — JSON, YAML, XML, CSV, Base64, JWT, Hash,
          UUID, và nhiều hơn nữa.
        </p>
      </div>

      {/* Search — flex layout for perfect icon alignment */}
      <div className="mb-5">
        <div
          className="flex items-center gap-2 px-3 rounded-[10px] transition-all"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          <Search
            size={16}
            className="flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm converter tool..."
            className="flex-1 bg-transparent py-2 text-[13px] outline-none min-w-0"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Tools grid — uniform height with flex */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool)}
            className="card card-hover p-4 text-left group cursor-pointer flex flex-col"
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
              style={{
                background: 'var(--accent-light)',
                border: '1px solid var(--border)',
              }}
            >
              <Icon
                name={tool.icon}
                size={20}
                style={{ color: 'var(--accent-hover)' }}
              />
            </div>
            <h3
              className="font-semibold text-[13px] mb-1 tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {tool.name}
            </h3>
            <p
              className="text-[11px] leading-relaxed line-clamp-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              {tool.description}
            </p>
          </button>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div
          className="text-center py-20"
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="text-base">Không tìm thấy tool nào</p>
          <button
            onClick={() => setSearch('')}
            className="mt-2 text-sm hover:underline transition-colors"
            style={{ color: 'var(--accent-hover)' }}
          >
            Xóa tìm kiếm
          </button>
        </div>
      )}
    </div>
  )
}
