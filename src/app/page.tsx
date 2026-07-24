import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

const stats = [
  { label: 'Modules', value: '10', icon: '📦', trend: '+2 this week' },
  { label: 'Active', value: '4', icon: '✅', trend: 'Converter, Links, Cloud, Mail' },
  { label: 'Coming Soon', value: '6', icon: '🚀', trend: 'In development' },
]

const modules = [
  { name: 'Converter Hub', href: '/converter', icon: '🔄', desc: 'Chuyển đổi JSON, YAML, XML, CSV, Base64, JWT, UUID, Hash, và nhiều hơn nữa', status: 'active', tag: 'v1.0' },
  { name: 'Link Shortener', href: '/shortener', icon: '🔗', desc: 'Rút gọn URL với QR code, password, analytics', status: 'active', tag: 'v1.0' },
  { name: 'File Transfer', href: '/transfer', icon: '📤', desc: 'Upload/Download file lớn với resume support', status: 'soon', tag: 'Q2' },
  { name: 'Cloud Manager', href: '/cloud', icon: '☁️', desc: 'Quản lý multi-cloud với rclone', status: 'active', tag: 'v1.0' },
  { name: 'Website Monitor', href: '/monitor', icon: '📡', desc: 'Giám sát uptime, SSL, DNS, response time', status: 'soon', tag: 'Q2' },
  { name: 'VPS Dashboard', href: '/vps', icon: '🖥️', desc: 'SSH Terminal, Docker, Nginx, Firewall', status: 'soon', tag: 'Q3' },
  { name: 'Temp Mail', href: '/tempmail', icon: '📧', desc: 'Email tạm thời với OTP, API, Webhook', status: 'active', tag: 'v1.0' },
  { name: 'API Hub', href: '/api-hub', icon: '🔌', desc: 'API Gateway với key management', status: 'soon', tag: 'Q3' },
  { name: 'Bot Builder', href: '/bot-builder', icon: '🤖', desc: 'Visual workflow builder cho Telegram bot', status: 'soon', tag: 'Q3' },
  { name: 'Prompt Market', href: '/prompts', icon: '💡', desc: 'Marketplace cho AI prompts', status: 'soon', tag: 'Q4' },
]

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto fade-in relative z-10">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5"
            style={{ background: 'var(--accent-light)', color: 'var(--accent-hover)', border: '1px solid rgba(94, 106, 210, 0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full pulse-glow" style={{ background: 'var(--accent)' }} />
            v1.0 — Early Access
          </div>
        </div>
        <h1 className="text-[32px] font-bold tracking-tight leading-tight mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Bộ công cụ <span className="gradient-text">developer</span> toàn diện
        </h1>
        <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          10 module — Converter, Shortener, Cloud, Mail, Monitor, VPS, API, Bot, và hơn thế nữa.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{stat.icon}</span>
                <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="text-[28px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </div>
            <div className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {stat.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Modules
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="card card-hover p-5 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-11 h-11 rounded-[12px] flex items-center justify-center text-[22px] transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
              >
                {mod.icon}
              </div>
              <div className="flex items-center gap-1.5">
                {mod.status === 'active' ? (
                  <>
                    <span className="badge badge-success">Active</span>
                  </>
                ) : (
                  <span className="badge badge-warning">Soon</span>
                )}
              </div>
            </div>
            <h3 className="font-semibold text-[14px] mb-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {mod.name}
            </h3>
            <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {mod.desc}
            </p>
            <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px] font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
                {mod.tag}
              </span>
              <ArrowUpRight
                size={14}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'var(--accent-hover)' }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
