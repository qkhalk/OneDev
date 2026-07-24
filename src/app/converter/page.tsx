'use client'

import { useState } from 'react'
import { X, Search, ArrowLeft } from 'lucide-react'
import { converterTools, type ConverterTool } from '@/lib/converter-tools'
import ConverterToolComponent from '@/components/converter/ConverterTool'

export default function ConverterHubPage() {
  const [activeTool, setActiveTool] = useState<ConverterTool | null>(null)
  const [search, setSearch] = useState('')

  const filteredTools = converterTools.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      {!activeTool && (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Converter Hub 🔄
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Bộ công cụ chuyển đổi format — JSON, YAML, XML, CSV, Base64, JWT, Hash, UUID, và nhiều hơn nữa.
            </p>
          </div>

          {/* Search */}
          <div className="mb-6 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm converter tool..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Tools grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool)}
                className="card card-hover p-5 text-left transition-all group cursor-pointer"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {tool.name}
                      </h3>
                      {tool.bidirectional && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--accent-light)', color: 'var(--accent-hover)' }}
                        >
                          ↔
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {tool.description}
                </p>
              </button>
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
              <p className="text-lg">Không tìm thấy tool nào</p>
              <button
                onClick={() => setSearch('')}
                className="mt-2 text-sm hover:underline"
                style={{ color: 'var(--accent-hover)' }}
              >
                Xóa tìm kiếm
              </button>
            </div>
          )}
        </>
      )}

      {/* Active tool view */}
      {activeTool && (
        <div className="flex flex-col h-[calc(100vh-7rem)]">
          {/* Tool header */}
          <div
            className="flex items-center justify-between p-4 rounded-t-xl"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderBottom: 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTool(null)}
                className="p-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
                title="Quay lại danh sách"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="text-2xl">{activeTool.icon}</span>
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {activeTool.name}
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {activeTool.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTool(null)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="Đóng"
            >
              <X size={20} />
            </button>
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
            <ConverterToolComponent tool={activeTool} onClose={() => setActiveTool(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
