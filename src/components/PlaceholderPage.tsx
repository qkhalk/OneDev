'use client'

interface PlaceholderPageProps {
  icon: string
  name: string
  description: string
}

export default function PlaceholderPage({ icon, name, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-4 opacity-50">{icon}</div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        {name}
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
      <span className="badge badge-warning">Coming Soon</span>
    </div>
  )
}
