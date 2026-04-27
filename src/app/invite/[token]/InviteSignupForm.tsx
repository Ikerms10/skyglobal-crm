'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Check } from 'lucide-react'

// When admin invites a new business, business_name is "Pending Setup" and we collect it here.
const schema = z.object({
  businessName: z.string().optional(),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

interface Props {
  inviteId: string
  tenantId: string
  prefillEmail: string
  role: string
  isNewBusiness: boolean
}

export function InviteSignupForm({ inviteId, tenantId, prefillEmail, role, isNewBusiness }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (isNewBusiness && !data.businessName?.trim()) {
      toast.error('Enter your business name')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: prefillEmail,
        password: data.password,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Signup failed')

      const res = await fetch('/api/tenant/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_id: inviteId,
          user_id: authData.user.id,
          tenant_id: tenantId,
          role,
          business_name: data.businessName?.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to accept invite')
      }

      toast.success('Welcome! Your account is ready.')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 400, background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '28px 24px' }}>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>Signing up as</p>
      <p style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{prefillEmail}</p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isNewBusiness && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>Business name *</label>
            <input placeholder="Acme Renovations LLC" style={inputStyle} {...register('businessName')} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>Set your password</label>
          <input type="password" placeholder="Min 8 characters" style={inputStyle} {...register('password')} />
          {errors.password && <span style={{ fontSize: 11, color: 'var(--c-danger)', fontFamily: "'DM Mono', monospace" }}>{errors.password.message}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>Confirm password</label>
          <input type="password" placeholder="Repeat password" style={inputStyle} {...register('confirmPassword')} />
          {errors.confirmPassword && <span style={{ fontSize: 11, color: 'var(--c-danger)', fontFamily: "'DM Mono', monospace" }}>{errors.confirmPassword.message}</span>}
        </div>
        <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 8, background: 'var(--c-sage)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: loading ? 0.7 : 1 }}>
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
          {loading ? 'Setting up…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid var(--c-border)',
  background: 'var(--c-canvas)',
  color: 'var(--c-text-1)',
  fontSize: 16,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
}
