import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import Icon from '@/components/Icon'

const stats = [
  { label: 'Modules', value: '10' },
  { label: 'Hoạt động', value: '4' },
  { label: 'Sắp ra mắt', value: '6' },
]

const modules = [
  { name: 'Converter Hub', href: '/converter', icon: 'FileJson', desc: 'JSON, YAML, XML, CSV, Base64, JWT, Hash', status: 'active' },
  { name: 'Link Shortener', href: '/shortener', icon: 'Link2', desc: 'Rút gọn URL với QR, password, analytics', status: 'active' },
  { name: 'File Transfer', href: '/transfer', icon: 'Upload', desc: 'Upload/Download file lớn', status: 'soon' },
  { name: 'Cloud Manager', href: '/cloud', icon: 'Cloud', desc: 'Quản lý multi-cloud với rclone', status: 'active' },
  { name: 'Website Monitor', href: '/monitor', icon: 'Activity', desc: 'Uptime, SSL, DNS monitoring', status: 'soon' },
  { name: 'VPS Dashboard', href: '/vps', icon: 'Server', desc: 'SSH, Docker, Nginx, Firewall', status: 'soon' },
  { name: 'Temp Mail', href: '/tempmail', icon: 'Mail', desc: 'Email tạm thời, nhận OTP', status: 'active' },
  { name: 'API Hub', href: '/api-hub', icon: 'Database', desc: 'API Gateway, key management', status: 'soon' },
  { name: 'Bot Builder', href: '/bot-builder', icon: 'Bot', desc: 'Visual workflow cho Telegram', status: 'soon' },
  { name: 'Prompt Market', href: '/prompts', icon: 'Sparkles', desc: 'Marketplace cho AI prompts', status: 'soon' },
]

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-1" style={{ color: 'var(--text)' }}>
          Tổng quan
        </h1>
        <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          Bộ công cụ developer — 10 module trong một nền tảng.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>{s.value}</div>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Modules */}
      <h2 className="text-[15px] font-medium mb-3" style={{ color: 'var(--text)' }}>Modules</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="card card-hover p-4 group">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <Icon name={mod.icon} size={18} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>{mod.name}</span>
                  {mod.status === 'active'
                    ? <span className="badge badge-success">Active</span>
                    : <span className="badge badge-warning">Soon</span>}
                </div>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{mod.desc}</p>
              </div>
              <ArrowUpRight size={15} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
