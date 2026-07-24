import Link from 'next/link'

const stats = [
  { label: 'Modules', value: '10', icon: '📦' },
  { label: 'Active', value: '1', icon: '✅' },
  { label: 'Coming Soon', value: '9', icon: '🚀' },
]

const modules = [
  { name: 'Converter Hub', href: '/converter', icon: '🔄', desc: 'Chuyển đổi JSON, YAML, XML, CSV, Base64, JWT, UUID, Hash, và nhiều hơn nữa', status: 'active' },
  { name: 'Link Shortener', href: '/shortener', icon: '🔗', desc: 'Rút gọn URL với QR code, password, analytics', status: 'soon' },
  { name: 'File Transfer', href: '/transfer', icon: '📤', desc: 'Upload/Download file lớn với resume support', status: 'soon' },
  { name: 'Cloud Manager', href: '/cloud', icon: '☁️', desc: 'Quản lý multi-cloud với rclone', status: 'soon' },
  { name: 'Website Monitor', href: '/monitor', icon: '📡', desc: 'Giám sát uptime, SSL, DNS, response time', status: 'soon' },
  { name: 'VPS Dashboard', href: '/vps', icon: '🖥️', desc: 'SSH terminal, Docker, Nginx, Firewall', status: 'soon' },
  { name: 'Temp Mail', href: '/tempmail', icon: '📧', desc: 'Email tạm thời với OTP, API, Webhook', status: 'soon' },
  { name: 'API Hub', href: '/api-hub', icon: '🔌', desc: 'API Gateway với key management', status: 'soon' },
  { name: 'Bot Builder', href: '/bot-builder', icon: '🤖', desc: 'Visual workflow builder cho Telegram bot', status: 'soon' },
  { name: 'Prompt Market', href: '/prompts', icon: '💡', desc: 'Marketplace cho AI prompts', status: 'soon' },
]

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Chào mừng đến <span style={{ color: 'var(--accent)' }}>OneDev</span> 🦊
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Bộ công cụ developer toàn diện — tất cả trong một nền tảng.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stat.value}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {stat.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Modules
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="card card-hover p-5 transition-all group"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl">{mod.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {mod.name}
                  </h3>
                  {mod.status === 'active' ? (
                    <span className="badge badge-success">Active</span>
                  ) : (
                    <span className="badge badge-warning">Soon</span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {mod.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
