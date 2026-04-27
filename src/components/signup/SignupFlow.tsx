'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Building2, ImageIcon, ChevronRight, Check, Loader2, Upload } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignupData {
  email: string
  password: string
  businessName: string
  businessPhone: string
  industry: string
  logoFile: File | null
}

interface Props {
  /** Pre-fills and locks the email field (invite flow). */
  prefillEmail?: string
  /** Called when user clicks Finish on step 3. */
  onFinish: (data: SignupData) => Promise<void>
  /** External loading flag — disables Finish button while parent does async work. */
  loading: boolean
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const accountSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

const businessSchema = z.object({
  businessName: z.string().min(2, 'Required'),
  businessPhone: z.string().optional(),
  industry: z.string().optional(),
})

type AccountFields = z.infer<typeof accountSchema>
type BusinessFields = z.infer<typeof businessSchema>

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Account', icon: User },
  { label: 'Business', icon: Building2 },
  { label: 'Logo', icon: ImageIcon },
] as const

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
      {STEPS.map((s, i) => {
        const Icon = s.icon
        const done = i < current
        const active = i === current
        return (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? 'var(--c-sage)' : active ? 'var(--c-gold)' : 'var(--c-card)',
                border: `2px solid ${done ? 'var(--c-sage)' : active ? 'var(--c-gold)' : 'var(--c-border)'}`,
                transition: 'all 250ms',
              }}>
                {done
                  ? <Check size={15} style={{ color: '#fff' }} />
                  : <Icon size={15} style={{ color: active ? '#fff' : 'var(--c-text-4)' }} />
                }
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                fontFamily: "'DM Mono', monospace",
                color: done ? 'var(--c-sage)' : active ? 'var(--c-gold)' : 'var(--c-text-4)',
              }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                width: 52, height: 2, margin: '0 6px 18px',
                background: i < current ? 'var(--c-sage)' : 'var(--c-border)',
                transition: 'background 300ms',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em' }}>
        {label}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 11, color: 'var(--c-danger)', fontFamily: "'DM Mono', monospace" }}>{error}</span>
      )}
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 14px',
  borderRadius: 9, border: '1px solid var(--c-border)',
  background: 'var(--c-canvas)', color: 'var(--c-text-1)',
  fontSize: 16, fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 150ms',
}

const primaryBtn: React.CSSProperties = {
  flex: 1, height: 44, borderRadius: 9, border: 'none',
  background: 'var(--c-gold)', cursor: 'pointer', color: '#fff',
  fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}

const backBtn: React.CSSProperties = {
  height: 44, padding: '0 18px', borderRadius: 9,
  background: 'transparent', border: '1px solid var(--c-border)',
  cursor: 'pointer', color: 'var(--c-text-3)',
  fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif",
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SignupFlow({ prefillEmail, onFinish, loading }: Props) {
  const [step, setStep] = useState(0)
  const [accountData, setAccountData] = useState<AccountFields | null>(null)
  const [businessData, setBusinessData] = useState<BusinessFields | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const accountForm = useForm<AccountFields>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: prefillEmail ?? '' },
  })

  const businessForm = useForm<BusinessFields>({ resolver: zodResolver(businessSchema) })

  const onAccountSubmit = (data: AccountFields) => {
    setAccountData(data)
    setStep(1)
  }

  const onBusinessSubmit = (data: BusinessFields) => {
    setBusinessData(data)
    setStep(2)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleFinish = () => {
    if (!accountData || !businessData) return
    onFinish({
      email: accountData.email,
      password: accountData.password,
      businessName: businessData.businessName,
      businessPhone: businessData.businessPhone ?? '',
      industry: businessData.industry ?? '',
      logoFile,
    })
  }

  const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--c-gold)' }
  const blur  = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor = 'var(--c-border)' }

  return (
    <>
      <StepIndicator current={step} />

      <div style={{ width: '100%', maxWidth: 420, background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 14, padding: '28px 24px' }}>

        {/* ── Step 0: Account ── */}
        {step === 0 && (
          <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Create your account
            </h2>
            <Field label="Email" error={accountForm.formState.errors.email?.message}>
              <input
                type="email"
                placeholder="you@example.com"
                style={{ ...inputStyle, opacity: prefillEmail ? 0.6 : 1 }}
                readOnly={!!prefillEmail}
                {...accountForm.register('email')}
                onFocus={focus} onBlur={blur}
              />
            </Field>
            <Field label="Password" error={accountForm.formState.errors.password?.message}>
              <input type="password" placeholder="Min 8 characters" style={inputStyle} {...accountForm.register('password')} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Confirm password" error={accountForm.formState.errors.confirmPassword?.message}>
              <input type="password" placeholder="Repeat password" style={inputStyle} {...accountForm.register('confirmPassword')} onFocus={focus} onBlur={blur} />
            </Field>
            <button type="submit" style={primaryBtn}>
              Continue <ChevronRight size={16} />
            </button>
          </form>
        )}

        {/* ── Step 1: Business Info ── */}
        {step === 1 && (
          <form onSubmit={businessForm.handleSubmit(onBusinessSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Your business
            </h2>
            <Field label="Business name *" error={businessForm.formState.errors.businessName?.message}>
              <input placeholder="Acme Renovations LLC" style={inputStyle} {...businessForm.register('businessName')} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Phone" error={businessForm.formState.errors.businessPhone?.message}>
              <input type="tel" placeholder="(407) 555-0100" style={inputStyle} {...businessForm.register('businessPhone')} onFocus={focus} onBlur={blur} />
            </Field>
            <Field label="Industry" error={businessForm.formState.errors.industry?.message}>
              <input placeholder="Painting & Renovations" style={inputStyle} {...businessForm.register('industry')} onFocus={focus} onBlur={blur} />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep(0)} style={backBtn}>Back</button>
              <button type="submit" style={primaryBtn}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Logo ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Add your logo
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>
                Optional — you can upload or change this later in Settings.
              </p>
            </div>

            <label
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '28px 24px', border: '2px dashed var(--c-border)', borderRadius: 12, cursor: 'pointer', transition: 'border-color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-gold-border)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" style={{ width: 84, height: 84, objectFit: 'contain', borderRadius: 10, background: '#fff', padding: 6 }} />
              ) : (
                <div style={{ width: 84, height: 84, borderRadius: 10, background: 'var(--c-canvas)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={28} style={{ color: 'var(--c-text-4)' }} />
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: logoPreview ? 'var(--c-sage)' : 'var(--c-text-3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {logoPreview ? 'Logo selected — click to change' : 'Click to upload'}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
                  PNG, JPG, or SVG
                </p>
              </div>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={handleLogoChange} />
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep(1)} style={backBtn}>Back</button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                style={{ ...primaryBtn, background: 'var(--c-sage)', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading
                  ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</>
                  : <><Check size={15} /> Finish setup</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
