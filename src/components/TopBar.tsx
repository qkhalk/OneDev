'use client'

import { Bell, Search, Settings } from 'lucide-react'

export default function TopBar() {
  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 lg:px-5 pl-14 lg:pl-5"
      style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex-1 max-w-sm hidden sm:block">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>
      </div>
      <div className="flex-1 sm:hidden" />
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          <Bell size={18} />
        </button>
        <button className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}>
          <Settings size={18} />
        </button>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ml-1" style={{ background: 'var(--text)', color: 'var(--bg-base)' }}>K</div>
      </div>
    </header>
  )
}
