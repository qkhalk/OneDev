'use client'

import { Bell, Search, Settings, Command } from 'lucide-react'

export default function TopBar() {
  return (
    <header
      className="h-14 flex-shrink-0 flex items-center justify-between px-4 lg:px-5 relative z-10 pl-14 lg:pl-5"
      style={{
        background: 'rgba(10,11,15,0.6)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Search — hidden on mobile, flex layout for perfect icon alignment */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div
          className="flex items-center gap-2 px-3 rounded-[10px] transition-all"
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
          }}
        >
          <Search
            className="w-4 h-4 flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="flex-1 bg-transparent py-1.5 text-[13px] outline-none min-w-0"
            style={{ color: 'var(--text-primary)' }}
          />
          <div
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
            }}
          >
            <Command size={9} />K
          </div>
        </div>
      </div>

      {/* Spacer for mobile */}
      <div className="flex-1 sm:hidden" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <button
          className="p-2 rounded-[8px] transition-all hover:bg-white/5 active:scale-95"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <button
          className="p-2 rounded-[8px] transition-all hover:bg-white/5 active:scale-95"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>
        <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'var(--gradient-accent)', color: 'white' }}
        >
          K
        </div>
      </div>
    </header>
  )
}
