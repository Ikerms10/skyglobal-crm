'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

// 6-digit OTP input with auto-advance
function OTPInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const refs = useRef<Array<HTMLInputElement | null>>([])

  const handleChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = digit
    setDigits(next)
    if (digit && i < 5) refs.current[i + 1]?.focus()
    if (next.every(d => d !== '') && digit) {
      onComplete(next.join(''))
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setDigits(text.split(''))
      onComplete(text)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          style={{
            width: 44, height: 52, textAlign: 'center',
            fontSize: 20, fontWeight: 700,
            background: 'var(--bg-input)',
            border: `1px solid ${d ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'border-color 150ms',
          }}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [otpScreen, setOtpScreen] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('draft:login')
      if (saved) {
        const { email } = JSON.parse(saved)
        if (email) reset({ email, password: '' })
      }
    } catch {}
  }, [reset])

  useEffect(() => {
    const sub = watch((vals) => {
      try { localStorage.setItem('draft:login', JSON.stringify({ email: vals.email })) } catch {}
    })
    return () => sub.unsubscribe()
  }, [watch])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
      if (error) throw new Error(error.message)

      // Check if 2FA enabled in user metadata
      const twoFaEnabled = authData.user?.user_metadata?.two_factor_enabled
      if (twoFaEnabled) {
        // Sign out temporarily, send OTP
        await supabase.auth.signOut()
        const { error: otpError } = await supabase.auth.signInWithOtp({ email: data.email })
        if (otpError) throw new Error(otpError.message)
        setPendingEmail(data.email)
        setOtpScreen(true)
        setResendCooldown(30)
        toast.success('Check your email for the 6-digit code')
      } else {
        localStorage.removeItem('draft:login')
        toast.success('Welcome back!')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async (code: string) => {
    setOtpLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'email',
      })
      if (error) throw new Error(error.message)
      localStorage.removeItem('draft:login')
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setOtpLoading(false)
    }
  }

  const resendOTP = async () => {
    if (resendCooldown > 0) return
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOtp({ email: pendingEmail })
      setResendCooldown(30)
      toast.success('New code sent')
    } catch {
      toast.error('Failed to resend code')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: 15,
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 150ms, box-shadow 150ms',
  }

  if (otpScreen) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Two-factor verification</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
            Enter the 6-digit code sent to <strong>{pendingEmail}</strong>
          </p>
        </div>

        {otpLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--gold)' }} />
          </div>
        ) : (
          <OTPInput onComplete={verifyOTP} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setOtpScreen(false)}
            style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            ← Back to login
          </button>
          <button
            onClick={resendOTP}
            disabled={resendCooldown > 0}
            style={{
              fontSize: 13, color: resendCooldown > 0 ? 'var(--text-tertiary)' : 'var(--gold)',
              background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', padding: 0,
            }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Sign in</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Access your CRM dashboard</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Email</label>
        <input
          {...register('email')}
          type="email"
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--gold-light)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        {errors.email && <p style={{ fontSize: 12, color: 'var(--error)' }}>{errors.email.message}</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
        <input
          {...register('password')}
          type="password"
          placeholder="••••••••"
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--gold-light)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        {errors.password && <p style={{ fontSize: 12, color: 'var(--error)' }}>{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', height: 44, borderRadius: 'var(--radius-md)',
          background: 'var(--gold)', color: 'var(--gold-text)',
          fontSize: 15, fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 150ms, transform 100ms',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = loading ? '0.6' : '1' }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign in'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
        SkyGlobal Renovations — Internal Access Only
      </p>
    </form>
  )
}
