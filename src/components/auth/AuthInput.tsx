'use client'

import { useState, forwardRef } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Mail, Lock, User, KeyRound, Globe, Hash, Fingerprint, FileJson,
  Link2, Table, Binary, Clock, QrCode, Search, Shield, Server,
} from 'lucide-react'

// Icon registry — maps string names to Lucide components
const iconRegistry: Record<string, LucideIcon> = {
  Mail, Lock, User, KeyRound, Globe, Hash, Fingerprint, FileJson,
  Link2, Table, Binary, Clock, QrCode, Search, Shield, Server,
}

export interface AuthInputProps {
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  icon?: string
  required?: boolean
  autoComplete?: string
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, type = 'text', value, onChange, placeholder, error, icon, required, autoComplete }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [focused, setFocused] = useState(false)

    const isPassword = type === 'password'
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type
    const IconComp = icon ? iconRegistry[icon] : null

    return (
      <div className="w-full">
        <label
          className="block text-[13px] font-medium mb-1.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
          {required && <span style={{ color: 'var(--accent-hover)' }}> *</span>}
        </label>

        <div className="relative">
          {/* Icon */}
          {IconComp && (
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
              style={{
                color: focused ? 'var(--accent-hover)' : error ? 'var(--danger)' : 'var(--text-muted)',
              }}
            >
              <IconComp size={17} strokeWidth={2} />
            </div>
          )}

          <input
            ref={ref}
            type={effectiveType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            required={required}
            autoComplete={autoComplete}
            className="w-full text-[14px] outline-none transition-all duration-150 font-normal"
            style={{
              padding: icon ? '12px 44px 12px 40px' : isPassword ? '12px 44px 12px 14px' : '12px 14px',
              background: 'var(--bg-tertiary)',
              border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              boxShadow: focused && !error ? '0 0 0 3px var(--accent-light)' : error && focused ? '0 0 0 3px var(--danger-light)' : 'none',
              caretColor: 'var(--accent-hover)',
            }}
          />

          {/* Show/hide password toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              {showPassword ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div
            className="flex items-center gap-1.5 mt-1.5 text-[12px] fade-in"
            style={{ color: 'var(--danger)' }}
          >
            <AlertCircle size={13} strokeWidth={2.5} />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }
)

AuthInput.displayName = 'AuthInput'

export default AuthInput
