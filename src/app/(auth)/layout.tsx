'use client'

import { Zap } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'var(--bg-primary)',
      }}
    >
      {/* Subtle radial glow — top right */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-200px',
          right: '-150px',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(94,106,210,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Subtle radial glow — bottom left */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-200px',
          left: '-150px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(94,106,210,0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Logo watermark — very subtle */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.015,
        }}
      >
        <Zap size={400} strokeWidth={1} className="text-white" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[420px] px-4 py-8">
        {children}
      </div>
    </div>
  )
}
