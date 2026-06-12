'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
      if (error) throw new Error(error.message)
      localStorage.removeItem('draft:login')
      toast.success('Welcome back!')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      const isRateLimit = /rate.?limit|over_email|too many|exceeded|security purposes/i.test(msg)
      if (isRateLimit) {
        toast.error('Please wait a moment and try again')
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--c-card)',
    border: '1px solid var(--c-border)',
    borderRadius: 'var(--r-sm)',
    padding: '10px 14px',
    fontSize: 15,
    color: 'var(--c-text-1)',
    outline: 'none',
    transition: 'border-color 150ms, box-shadow 150ms',
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-text-1)', margin: 0 }}>Sign in</h2>
        <p style={{ fontSize: 14, color: 'var(--c-text-3)', marginTop: 4 }}>Access your CRM dashboard</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-3)' }}>Email</label>
        <input
          {...register('email')}
          type="email"
          placeholder="you@example.com"
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-sage-soft)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(122,158,126,0.18)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        {errors.email && <p style={{ fontSize: 12, color: 'var(--c-danger)' }}>{errors.email.message}</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-3)' }}>Password</label>
        <input
          {...register('password')}
          type="password"
          placeholder="••••••••"
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-sage-soft)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(122,158,126,0.18)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.boxShadow = 'none' }}
        />
        {errors.password && <p style={{ fontSize: 12, color: 'var(--c-danger)' }}>{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', height: 44, borderRadius: 'var(--radius-md)',
          background: 'var(--c-gold)', color: 'var(--c-text-on-dark)',
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
    </form>
  )
}
