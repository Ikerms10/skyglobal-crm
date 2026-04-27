'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Building2, User, Image, ChevronRight, Check } from 'lucide-react'
import Link from 'next/link'

const accountSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

const businessSchema = z.object({
  business_name: z.string().min(2, 'Required'),
  business_email: z.string().email('Invalid email').optional().or(z.literal('')),
  business_phone: z.string().optional(),
  business_address: z.string().optional(),
  industry: z.string().optional(),
})

type AccountData = z.infer<typeof accountSchema>
type BusinessData = z.infer<typeof businessSchema>

const STEPS = [
  { label: 'Account', icon: User },
  { label: 'Business', icon: Building2 },
  { label: 'Logo', icon: Image },
] as const

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [businessData, setBusinessData] = useState<BusinessData | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const accountForm = useForm<AccountData>({ resolver: zodResolver(accountSchema) })
  const businessForm = useForm<BusinessData>({ resolver: zodResolver(businessSchema) })

  const handleAccountSubmit = (data: AccountData) => {
    setAccountData(data)
    setStep(1)
  }

  const handleBusinessSubmit = (data: BusinessData) => {
    setBusinessData(data)
    setStep(2)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleFinish = async () => {
    if (!accountData || !businessData) return
    setLoading(true)
    try {
      const supabase = createClient()

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Signup failed')

      // 2. Upload logo if provided
      let logoUrl: string | null = null
      let logoPath: string | null = null
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${authData.user.id}/logo.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('business-logos')
          .upload(path, logoFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('business-logos').getPublicUrl(path)
          logoUrl = urlData.publicUrl
          logoPath = path
        }
      }

      // 3. Create tenant via API route (uses service role to bypass RLS on new user)
      const res = await fetch('/api/tenant/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: authData.user.id,
          business_name: businessData.business_name,
          business_email: businessData.business_email || accountData.email,
          business_phone: businessData.business_phone || null,
          business_address: businessData.business_address || null,
          industry: businessData.industry || null,
          business_logo_url: logoUrl,
          business_logo_path: logoPath,
        }),
      })
      if (!res.ok) throw new Error('Failed to create business account')

      toast.success('Account created! Welcome aboard.')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--c-canvas)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.04em', margin: 0 }}>
          SkyGlobal CRM
        </p>
        <p style={{ fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", margin: '4px 0 0' }}>
          Create your business account
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const done = i < step
          const active = i === step
          return (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? 'var(--c-sage)' : active ? 'var(--c-gold)' : 'var(--c-card)',
                  border: `2px solid ${done ? 'var(--c-sage)' : active ? 'var(--c-gold)' : 'var(--c-border)'}`,
                  transition: 'all 250ms',
                }}>
                  {done
                    ? <Check size={16} style={{ color: '#fff' }} />
                    : <Icon size={16} style={{ color: active ? '#fff' : 'var(--c-text-4)' }} />
                  }
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--c-gold)' : done ? 'var(--c-sage)' : 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 48, height: 2, background: i < step ? 'var(--c-sage)' : 'var(--c-border)', margin: '0 4px 20px', transition: 'background 250ms' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '28px 24px' }}>

        {/* Step 0: Account */}
        {step === 0 && (
          <form onSubmit={accountForm.handleSubmit(handleAccountSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create your account</h2>
            <Field label="Email" error={accountForm.formState.errors.email?.message}>
              <input type="email" placeholder="you@example.com" style={inputStyle} {...accountForm.register('email')} />
            </Field>
            <Field label="Password" error={accountForm.formState.errors.password?.message}>
              <input type="password" placeholder="Min 8 characters" style={inputStyle} {...accountForm.register('password')} />
            </Field>
            <Field label="Confirm password" error={accountForm.formState.errors.confirmPassword?.message}>
              <input type="password" placeholder="Repeat password" style={inputStyle} {...accountForm.register('confirmPassword')} />
            </Field>
            <SubmitButton label="Continue" icon={<ChevronRight size={16} />} />
          </form>
        )}

        {/* Step 1: Business Info */}
        {step === 1 && (
          <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your business</h2>
            <Field label="Business name *" error={businessForm.formState.errors.business_name?.message}>
              <input placeholder="Acme Renovations LLC" style={inputStyle} {...businessForm.register('business_name')} />
            </Field>
            <Field label="Business email" error={businessForm.formState.errors.business_email?.message}>
              <input type="email" placeholder="hello@acme.com" style={inputStyle} {...businessForm.register('business_email')} />
            </Field>
            <Field label="Phone" error={businessForm.formState.errors.business_phone?.message}>
              <input placeholder="(407) 555-0100" style={inputStyle} {...businessForm.register('business_phone')} />
            </Field>
            <Field label="Address" error={businessForm.formState.errors.business_address?.message}>
              <input placeholder="123 Main St, Orlando FL" style={inputStyle} {...businessForm.register('business_address')} />
            </Field>
            <Field label="Industry" error={undefined}>
              <input placeholder="Painting & Renovations" style={inputStyle} {...businessForm.register('industry')} />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep(0)} style={{ ...secondaryBtn }}>Back</button>
              <SubmitButton label="Continue" icon={<ChevronRight size={16} />} />
            </div>
          </form>
        )}

        {/* Step 2: Logo */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add your logo</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>
              Optional — you can add or change this later in Settings.
            </p>

            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24, border: '2px dashed var(--c-border)', borderRadius: 10, cursor: 'pointer', transition: 'border-color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-gold-border)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, background: '#fff', padding: 4 }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: 8, background: 'var(--c-canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image size={32} style={{ color: 'var(--c-text-4)' }} />
                </div>
              )}
              <span style={{ fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>
                {logoPreview ? 'Click to change' : 'Click to upload (PNG, JPG, SVG)'}
              </span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep(1)} style={{ ...secondaryBtn }}>Back</button>
              <button
                onClick={handleFinish}
                disabled={loading}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 8, background: 'var(--c-sage)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                {loading ? 'Creating account…' : 'Finish setup'}
              </button>
            </div>
          </div>
        )}
      </div>

      <p style={{ marginTop: 20, fontSize: 13, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--c-gold)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
      </p>
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

const secondaryBtn: React.CSSProperties = {
  height: 42,
  padding: '0 16px',
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid var(--c-border)',
  cursor: 'pointer',
  color: 'var(--c-text-3)',
  fontSize: 14,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 11, color: 'var(--c-danger)', fontFamily: "'DM Mono', monospace" }}>{error}</span>}
    </div>
  )
}

function SubmitButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button type="submit" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, borderRadius: 8, background: 'var(--c-gold)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {label}
      {icon}
    </button>
  )
}
