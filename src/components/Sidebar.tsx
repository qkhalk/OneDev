'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronLeft, Zap, Menu, X } from 'lucide-react'

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

import Icon from '@/components/Icon'

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--gradient-accent)', boxShadow: '0 2px 8px rgba(94,106,210,0.3)' }}>
          <Zap size={18} className="text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>OneDev</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Developer Platform</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {modules.map((mod) => {
          const active = pathname?.startsWith(mod.href)
          return (
            <Link key={mod.href} href={mod.href}
              className="flex items-center gap-3 px-3 py-2 rounded-[10px] text-[13px] transition-all duration-200 relative group mb-0.5"
              style={{
                background: active ? 'var(--accent-light)' : 'transparent',
                color: active ? 'var(--accent-hover)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 450,
              }}
              title={collapsed ? mod.name : undefined}
            >
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: 'var(--accent)' }} />}
              <Icon name={mod.icon} size={18} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
              {!collapsed && <span className="truncate">{mod.name}</span>}
              {!collapsed && mod.status === 'active' && (
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 ml-auto"
                  style={{ background: 'var(--success)', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse - desktop only */}
      <button onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex h-10 items-center justify-center border-t transition-colors hover:bg-white/5 flex-shrink-0"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <ChevronLeft size={16} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </>
  )

  return (
    <>
      {/* Mobile top bar button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-[8px]"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      )}

      {/* Mobile drawer */}
      <aside className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-[240px] flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'rgba(10,11,15,0.95)', backdropFilter: 'blur(20px)', borderRight: '1px solid var(--border)' }}>
        <button onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg z-10"
          style={{ color: 'var(--text-muted)' }}>
          <X size={18} />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex ${collapsed ? 'w-[60px]' : 'w-[240px]'} flex-shrink-0 flex-col transition-all duration-300 relative z-10`}
        style={{ background: 'rgba(10,11,15,0.8)', backdropFilter: 'blur(20px)', borderRight: '1px solid var(--border)' }}>
        {sidebarContent}
      </aside>
    </>
  )
}
