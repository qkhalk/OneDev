'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Github, Loader2, AlertCircle } from 'lucide-react'
import AuthInput from '@/components/auth/AuthInput'

// Google icon SVG (Lucide doesn't have a Chrome-branded Google icon)
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.7663 12.2244C23.7663 11.2413 23.6824 10.5237 23.5004 9.77954H12.2395V14.2176H18.8566C18.7164 15.3842 18.0029 17.1488 16.4199 18.3367L16.3976 18.4851L19.9528 21.2393L20.1985 21.2638C22.4496 19.1826 23.7663 15.9795 23.7663 12.2244Z" fill="#4285F4"/>
      <path d="M12.2395 24.15C15.5517 24.15 18.3394 23.0425 20.1985 21.2638L16.4199 18.3367C15.4679 19.0004 14.1932 19.4616 12.2395 19.4616C9.00134 19.4616 6.25568 17.3805 5.27559 14.4318L5.13606 14.4437L1.44127 17.2949L1.39319 17.4285C3.23832 21.0935 7.04047 24.15 12.2395 24.15Z" fill="#34A853"/>
      <path d="M5.27559 14.4318C5.02349 13.6876 4.87832 12.8907 4.87832 12.0675C4.87832 11.2442 5.02349 10.4473 5.26159 9.70314L5.25459 9.54436L1.51368 6.65137L1.39319 6.70648C0.586523 8.31358 0.122559 10.1351 0.122559 12.0675C0.122559 13.9998 0.586523 15.8213 1.39319 17.4285L5.27559 14.4318Z" fill="#FBBC05"/>
      <path d="M12.2395 4.67334C14.6924 4.67334 16.3484 5.73107 17.2925 6.61466L20.2825 3.70467C18.3254 1.88315 15.5517 0.984985 12.2395 0.984985C7.04047 0.984985 3.23832 4.04143 1.39319 7.70648L5.26159 10.7031C6.25568 7.75445 9.00134 5.67334 12.2395 4.67334Z" fill="#EB4335"/>
    </svg>
  )
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  const validate = (): boolean => {
    const e: FormErrors = {}

    if (!email) {
      e.email = 'Vui lòng nhập email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Email không hợp lệ'
    }

    if (!password) {
      e.password = 'Vui lòng nhập mật khẩu'
    } else if (password.length < 6) {
      e.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!validate()) return

    setLoading(true)
    setErrors({})

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrors({ general: data.error || 'Đăng nhập thất bại' })
        return
      }

      // Success — redirect to dashboard
      router.push('/')
      router.refresh()
    } catch {
      setErrors({ general: 'Không thể kết nối đến server. Vui lòng thử lại.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-3"
          style={{
            background: 'var(--gradient-accent)',
            boxShadow: '0 4px 16px rgba(94,106,210,0.35)',
          }}
        >
          <Zap size={24} className="text-white" strokeWidth={2.5} />
        </div>
        <h1
          className="text-[22px] font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          Đăng nhập
        </h1>
        <p
          className="text-[14px] mt-1"
          style={{ color: 'var(--text-muted)' }}
        >
          Chào mừng trở lại
        </p>
      </div>

      {/* Card */}
      <div
        className="p-7"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* General error */}
        {errors.general && (
          <div
            className="flex items-start gap-2 p-3 mb-4 text-[13px] rounded-[10px] fade-in"
            style={{
              background: 'var(--danger-light)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: 'var(--danger)',
            }}
          >
            <AlertCircle size={16} strokeWidth={2.5} className="flex-shrink-0 mt-0.5" />
            <span>{errors.general}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AuthInput
            label="Email"
            type="email"
            icon="Mail"
            value={email}
            onChange={(v) => { setEmail(v); if (errors.email) setErrors({ ...errors, email: undefined }) }}
            placeholder="email@example.com"
            error={errors.email}
            required
            autoComplete="email"
          />

          <AuthInput
            label="Mật khẩu"
            type="password"
            icon="Lock"
            value={password}
            onChange={(v) => { setPassword(v); if (errors.password) setErrors({ ...errors, password: undefined }) }}
            placeholder="••••••••"
            error={errors.password}
            required
            autoComplete="current-password"
          />

          {/* Remember + forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className="w-[16px] h-[16px] rounded-[5px] flex items-center justify-center transition-all"
                  style={{
                    background: remember ? 'var(--accent)' : 'var(--bg-tertiary)',
                    border: `1.5px solid ${remember ? 'var(--accent)' : 'var(--border-hover)'}`,
                  }}
                >
                  {remember && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span
                className="text-[13px] select-none group-hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                Ghi nhớ đăng nhập
              </span>
            </label>

            <Link
              href="/forgot-password"
              className="text-[13px] font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--accent-hover)' }}
            >
              Quên mật khẩu?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-[12px] rounded-[10px] text-[14px] font-semibold transition-all duration-200 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'var(--gradient-accent)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(94,106,210,0.3)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(94,106,210,0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(94,106,210,0.3)'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                <span>Đang đăng nhập...</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>hoặc</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Social buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2.5 py-[11px] rounded-[10px] text-[13px] font-medium transition-all duration-150 hover:bg-white/[0.03]"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <Github size={17} />
            <span>Đăng nhập với GitHub</span>
          </button>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-2.5 py-[11px] rounded-[10px] text-[13px] font-medium transition-all duration-150 hover:bg-white/[0.03]"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <GoogleIcon size={17} />
            <span>Đăng nhập với Google</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <p
        className="text-center text-[14px] mt-6"
        style={{ color: 'var(--text-muted)' }}
      >
        Chưa có tài khoản?{' '}
        <Link
          href="/register"
          className="font-semibold transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-hover)' }}
        >
          Đăng ký
        </Link>
      </p>
    </div>
  )
}
