'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronLeft, Zap, Menu, X } from 'lucide-react'
import Icon from '@/components/Icon'

const modules = [
  { name: 'Converter', href: '/converter', icon: 'FileJson', status: 'active' },
  { name: 'Shortener', href: '/shortener', icon: 'Link2', status: 'active' },
  { name: 'Transfer', href: '/transfer', icon: 'Upload', status: 'soon' },
  { name: 'Cloud', href: '/cloud', icon: 'Cloud', status: 'active' },
  { name: 'Monitor', href: '/monitor', icon: 'Activity', status: 'soon' },
  { name: 'VPS', href: '/vps', icon: 'Server', status: 'soon' },
  { name: 'Temp Mail', href: '/tempmail', icon: 'Mail', status: 'active' },
  { name: 'API Hub', href: '/api-hub', icon: 'Database', status: 'soon' },
  { name: 'Bot Builder', href: '/bot-builder', icon: 'Bot', status: 'soon' },
  { name: 'Prompts', href: '/prompts', icon: 'Sparkles', status: 'soon' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const content = (
    <>
      <div className="h-14 flex items-center gap-2.5 px-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--text)', color: 'var(--bg-base)' }}>
            <Zap size={16} strokeWidth={2.5} />
          </div>
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>OneDev</span>}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {modules.map((mod) => {
          const active = pathname?.startsWith(mod.href)
          return (
            <Link key={mod.href} href={mod.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all mb-0.5"
              style={{
                background: active ? 'var(--bg-hover)' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-secondary)',
                fontWeight: active ? 500 : 400,
              }}
              title={collapsed ? mod.name : undefined}
            >
              <Icon name={mod.icon} size={17} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0, color: active ? 'var(--text)' : 'var(--text-muted)' }} />
              {!collapsed && <span className="truncate">{mod.name}</span>}
              {!collapsed && mod.status === 'active' && (
                <div className="w-1.5 h-1.5 rounded-full ml-auto" style={{ background: 'var(--success)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      <button onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex h-10 items-center justify-center border-t transition-colors hover:bg-white/5 flex-shrink-0"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <ChevronLeft size={16} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </>
  )

  return (
    <>
      <button onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        <Menu size={20} />
      </button>

      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)} style={{ background: 'rgba(0,0,0,0.6)' }} />}

      <aside className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[220px] flex flex-col transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 p-1.5 z-10" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        {content}
      </aside>

      <aside className={`hidden lg:flex ${collapsed ? 'w-[56px]' : 'w-[220px]'} flex-shrink-0 flex-col transition-all duration-200`}
        style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
        {content}
      </aside>
    </>
  )
}
