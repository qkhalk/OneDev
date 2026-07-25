'use client'

import CreateLinkForm from '@/components/shortener/CreateLinkForm'
import LinkTable from '@/components/shortener/LinkTable'

export default function ShortenerPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Link Shortener 🔗
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Rút gọn URL với QR code, password, analytics
        </p>
      </div>

      <CreateLinkForm />
      <LinkTable />
    </div>
  )
}
