'use client'

import { Bell, Search, Settings, Command } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 lg:px-5 relative z-10 pl-14 lg:pl-5"
      style={{ background: 'rgba(10,11,15,0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
      {/* Search - hidden on small screens */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-12 py-1.5 rounded-[8px] text-[13px] outline-none transition-all"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            <Command size={9} /> K
          </div>
        </div>
      </div>

      {/* Spacer for mobile */}
      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-1.5">
        <button className="p-2 rounded-[8px] transition-all hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <button className="p-2 rounded-[8px] transition-all hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          <Settings className="w-[18px] h-[18px]" />
        </button>
        <div className="w-px h-5 mx-1" style={{ background: 'var(--border)' }} />
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold cursor-pointer transition-transform hover:scale-105"
          style={{ background: 'var(--gradient-accent)', color: 'white' }}>
          K
        </div>
      </div>
    </header>
  )
}
