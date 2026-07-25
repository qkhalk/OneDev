import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OneDev — Developer Platform',
  description: 'All-in-one developer toolkit: Converter, Shortener, Cloud, Mail, Monitor, VPS',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0B0F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
