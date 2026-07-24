'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const modules = [
  {
    name: 'Converter Hub',
    href: '/converter',
    icon: '🔄',
    desc: 'Chuyển đổi format',
    status: 'active',
  },
  {
    name: 'Link Shortener',
    href: '/shortener',
    icon: '🔗',
    desc: 'Rút gọn link',
    status: 'planned',
  },
  {
    name: 'File Transfer',
    href: '/transfer',
    icon: '📤',
    desc: 'Upload/Download',
    status: 'planned',
  },
  {
    name: 'Cloud Manager',
    href: '/cloud',
    icon: '☁️',
    desc: 'Multi-cloud quản lý',
    status: 'planned',
  },
  {
    name: 'Website Monitor',
    href: '/monitor',
    icon: '📡',
    desc: 'Uptime & SSL',
    status: 'planned',
  },
  {
    name: 'VPS Dashboard',
    href: '/vps',
    icon: '🖥️',
    desc: 'Quản lý VPS',
    status: 'planned',
  },
  {
    name: 'Temp Mail',
    href: '/tempmail',
    icon: '📧',
    desc: 'Mail tạm thời',
    status: 'planned',
  },
  {
    name: 'API Hub',
    href: '/api-hub',
    icon: '🔌',
    desc: 'API Gateway',
    status: 'planned',
  },
  {
    name: 'Bot Builder',
    href: '/bot-builder',
    icon: '🤖',
    desc: 'Telegram Bot',
    status: 'planned',
  },
  {
    name: 'Prompt Market',
    href: '/prompts',
    icon: '💡',
    desc: 'AI Prompt Marketplace',
    status: 'planned',
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } flex-shrink-0 border-r flex flex-col transition-all duration-200`}
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          O
        </div>
        {!collapsed && (
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            OneDev
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {modules.map((mod) => {
          const active = pathname?.startsWith(mod.href)
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative group`}
              style={{
                background: active ? 'var(--accent-light)' : 'transparent',
                color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
                borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
              }}
              title={collapsed ? mod.name : undefined}
            >
              <span className="text-lg flex-shrink-0">{mod.icon}</span>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{mod.name}</div>
                  <div className="text-xs opacity-60 truncate">{mod.desc}</div>
                </div>
              )}
              {!collapsed && mod.status === 'planned' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                  Soon
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 text-sm border-t flex items-center justify-center"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        {collapsed ? '→' : '← Thu gọn'}
      </button>
    </aside>
  )
}
