'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, Building2, Eye, Mail, Plus, X, Loader2, Check,
  Copy, RefreshCw, TrendingUp, FolderOpen, Users2, PenLine,
  PauseCircle, PlayCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Tenant {
  id: string
  business_name: string
  business_email: string | null
  business_logo_url: string | null
  status: string
  plan: string
  created_at: string
  owner: { email: string }[] | null
  leadCount: number
  projectCount: number
  revenueThisMonth: number
}

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--c-sage)',
  trial: 'var(--c-gold)',
  suspended: 'var(--c-danger)',
  cancelled: 'var(--c-text-4)',
}

const PLANS = ['beta', 'starter', 'pro', 'enterprise'] as const

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={ref} style={{ width: '100%', maxWidth: 440, background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--c-border)' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-4)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 11, color: 'var(--c-danger)', fontFamily: "'DM Mono', monospace" }}>{error}</span>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', borderRadius: 7,
  border: '1px solid var(--c-border)', background: 'var(--c-canvas)',
  color: 'var(--c-text-1)', fontSize: 14,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none', boxSizing: 'border-box',
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) { setError('Enter a valid email'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(data.invite_url)
      toast.success('Invite sent!')
      onSuccess()
    } catch (err: any) {
      setError(err.message ?? 'Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 8, background: 'color-mix(in srgb, var(--c-sage) 12%, transparent)', border: '1px solid var(--c-sage)' }}>
          <Check size={16} style={{ color: 'var(--c-sage)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-sage)', fontFamily: "'DM Mono', monospace" }}>Invite email sent to {email}</span>
        </div>
        <div>
          <p style={{ fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", marginBottom: 6 }}>Invite link (backup):</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, background: 'var(--c-canvas)', border: '1px solid var(--c-border)' }}>
            <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{done}</span>
            <button onClick={() => { navigator.clipboard.writeText(done); toast.success('Copied!') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-4)', flexShrink: 0, padding: 2 }}>
              <Copy size={13} />
            </button>
          </div>
        </div>
        <button onClick={onClose} style={{ height: 38, borderRadius: 7, background: 'var(--c-gold)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Done
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
        Sends an invite email with a unique signup link. The business will be created when they accept.
      </p>
      <Field label="Email address" error={error}>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="owner@theirbusiness.com" style={inputStyle} autoFocus
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--c-gold)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}
        />
      </Field>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="button" onClick={onClose} style={{ flex: 1, height: 40, borderRadius: 7, background: 'transparent', border: '1px solid var(--c-border)', cursor: 'pointer', color: 'var(--c-text-3)', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Cancel
        </button>
        <button type="submit" disabled={loading} style={{ flex: 2, height: 40, borderRadius: 7, background: 'var(--c-gold)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={14} />}
          {loading ? 'Sending…' : 'Send invite'}
        </button>
      </div>
    </form>
  )
}

// ─── Create account modal ─────────────────────────────────────────────────────

function CreateAccountModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    setPassword(Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!businessName.trim()) e.businessName = 'Required'
    if (!email.includes('@')) e.email = 'Invalid email'
    if (password.length < 8) e.password = 'Min 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name: businessName.trim(), email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      toast.success(`Account created for ${businessName}`)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 8, background: 'color-mix(in srgb, var(--c-sage) 12%, transparent)', border: '1px solid var(--c-sage)' }}>
          <Check size={16} style={{ color: 'var(--c-sage)', flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--c-sage)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Account created</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>Welcome email sent to {email}</p>
          </div>
        </div>
        <button onClick={onClose} style={{ height: 38, borderRadius: 7, background: 'var(--c-sage)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Done
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
        Creates the auth user and tenant immediately. Sends credentials by email.
      </p>
      <Field label="Business name" error={errors.businessName}>
        <input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Acme Renovations LLC" style={inputStyle} autoFocus
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--c-gold)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--c-border)')} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="owner@acme.com" style={inputStyle}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--c-gold)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--c-border)')} />
      </Field>
      <Field label="Temp password" error={errors.password}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" style={{ ...inputStyle, flex: 1 }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--c-gold)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--c-border)')} />
          <button type="button" onClick={generatePassword} title="Generate password"
            style={{ height: 40, width: 40, borderRadius: 7, border: '1px solid var(--c-border)', background: 'var(--c-canvas)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--c-text-4)' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </Field>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="button" onClick={onClose} style={{ flex: 1, height: 40, borderRadius: 7, background: 'transparent', border: '1px solid var(--c-border)', cursor: 'pointer', color: 'var(--c-text-3)', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Cancel
        </button>
        <button type="submit" disabled={loading} style={{ flex: 2, height: 40, borderRadius: 7, background: 'var(--c-sage)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </div>
    </form>
  )
}

// ─── Edit plan modal ──────────────────────────────────────────────────────────

function EditPlanModal({ tenant, onClose, onSave }: { tenant: Tenant; onClose: () => void; onSave: (id: string, plan: string) => void }) {
  const [selected, setSelected] = useState(tenant.plan)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (selected === tenant.plan) { onClose(); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tenant/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success(`Plan updated to ${selected}`)
      onSave(tenant.id, selected)
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>
        Changing plan for <strong style={{ color: 'var(--c-text-1)' }}>{tenant.business_name}</strong>
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PLANS.map(plan => (
          <button
            key={plan}
            onClick={() => setSelected(plan)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${selected === plan ? 'var(--c-gold)' : 'var(--c-border)'}`,
              background: selected === plan ? 'color-mix(in srgb, var(--c-gold) 10%, transparent)' : 'var(--c-canvas)',
              color: selected === plan ? 'var(--c-gold)' : 'var(--c-text-2)',
              fontSize: 13, fontWeight: selected === plan ? 700 : 400,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textAlign: 'left', transition: 'all 150ms',
            }}
          >
            <span style={{ textTransform: 'capitalize' }}>{plan}</span>
            {selected === plan && <Check size={14} />}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, height: 40, borderRadius: 7, background: 'transparent', border: '1px solid var(--c-border)', cursor: 'pointer', color: 'var(--c-text-3)', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={loading} style={{ flex: 2, height: 40, borderRadius: 7, background: 'var(--c-gold)', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
          {loading ? 'Saving…' : 'Save plan'}
        </button>
      </div>
    </div>
  )
}

// ─── Tenant card ──────────────────────────────────────────────────────────────

function TenantCard({
  tenant,
  onView,
  onEditPlan,
  onToggleSuspend,
}: {
  tenant: Tenant
  onView: () => void
  onEditPlan: () => void
  onToggleSuspend: () => void
}) {
  const isSuspended = tenant.status === 'suspended'
  const initials = tenant.business_name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const ownerEmail = (tenant.owner as any)?.[0]?.email ?? null

  return (
    <div style={{
      background: 'var(--c-card)',
      border: '1px solid var(--c-border)',
      borderRadius: 12,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {/* Top row: logo + name + badges */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {tenant.business_logo_url ? (
          <img
            src={tenant.business_logo_url}
            alt={tenant.business_name}
            style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: '#fff', padding: 4, border: '1px solid var(--c-border)', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--c-canvas)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800, color: 'var(--c-text-3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {initials || <Building2 size={18} style={{ color: 'var(--c-text-4)' }} />}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {tenant.business_name}
            </p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
              background: `color-mix(in srgb, ${STATUS_COLOR[tenant.status] ?? 'var(--c-text-4)'} 15%, transparent)`,
              color: STATUS_COLOR[tenant.status] ?? 'var(--c-text-4)',
              fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {tenant.status}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 8,
              background: 'var(--c-canvas)', color: 'var(--c-text-4)',
              border: '1px solid var(--c-border)', fontFamily: "'DM Mono', monospace",
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {tenant.plan}
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
            {ownerEmail ?? tenant.business_email ?? 'No email'} · {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 0, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
        {[
          { icon: Users2, label: 'Leads', value: tenant.leadCount },
          { icon: FolderOpen, label: 'Projects', value: tenant.projectCount },
          { icon: TrendingUp, label: 'Rev. this mo.', value: `$${tenant.revenueThisMonth.toLocaleString()}` },
        ].map(({ icon: Icon, label, value }, i) => (
          <div key={label} style={{
            flex: 1, padding: '10px 0', textAlign: 'center',
            borderLeft: i > 0 ? '1px solid var(--c-border)' : 'none',
            background: 'var(--c-canvas)',
          }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--c-text-1)', fontFamily: "'DM Mono', monospace" }}>
              {value}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 9, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onView}
          style={{ flex: 1, height: 34, borderRadius: 7, background: 'var(--c-gold)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
        >
          <Eye size={12} /> View CRM
        </button>
        <button
          onClick={onEditPlan}
          style={{ flex: 1, height: 34, borderRadius: 7, background: 'transparent', border: '1px solid var(--c-border)', cursor: 'pointer', color: 'var(--c-text-3)', fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 150ms' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-gold)'; e.currentTarget.style.color = 'var(--c-gold)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-text-3)' }}
        >
          <PenLine size={12} /> Edit Plan
        </button>
        <button
          onClick={onToggleSuspend}
          style={{ flex: 1, height: 34, borderRadius: 7, background: 'transparent', border: `1px solid ${isSuspended ? 'var(--c-sage)' : 'var(--c-danger)'}`, cursor: 'pointer', color: isSuspended ? 'var(--c-sage)' : 'var(--c-danger)', fontSize: 12, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 150ms' }}
        >
          {isSuspended ? <><PlayCircle size={12} /> Activate</> : <><PauseCircle size={12} /> Suspend</>}
        </button>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AdminPanel({ tenants: initialTenants }: { tenants: Tenant[] }) {
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants)
  const [modal, setModal] = useState<'invite' | 'create' | null>(null)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [suspending, setSuspending] = useState<string | null>(null)

  // Auto-refresh every 60s + realtime subscription for live tenant updates
  useEffect(() => {
    const intervalId = setInterval(() => router.refresh(), 60_000)
    return () => clearInterval(intervalId)
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin-tenants-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [router])

  const handleView = (tenantId: string) => {
    window.open(`/dashboard?admin_view=${tenantId}`, '_blank')
  }

  const handlePlanSaved = (id: string, plan: string) => {
    setTenants(prev => prev.map(t => t.id === id ? { ...t, plan } : t))
  }

  const handleToggleSuspend = async (tenant: Tenant) => {
    const newStatus = tenant.status === 'suspended' ? 'active' : 'suspended'
    setSuspending(tenant.id)
    try {
      const res = await fetch(`/api/admin/tenant/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: newStatus } : t))
      toast.success(`${tenant.business_name} ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update status')
    } finally {
      setSuspending(null)
    }
  }

  const handleModalSuccess = () => {
    setModal(null)
    router.refresh()
  }

  const activeCount = tenants.filter(t => t.status === 'active').length
  const trialCount = tenants.filter(t => t.status === 'trial').length

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} style={{ color: 'var(--c-gold)' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em' }}>
              Master Admin
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
              {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setModal('invite')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 8, background: 'transparent', border: '1px solid var(--c-gold-border)', cursor: 'pointer', color: 'var(--c-gold)', fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--c-gold) 10%, transparent)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <Mail size={14} />
            Invite Business
          </button>
          <button
            onClick={() => setModal('create')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 8, background: 'var(--c-sage)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <Plus size={14} />
            Create Account
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Tenants', value: tenants.length },
          { label: 'Active', value: activeCount },
          { label: 'Trial', value: trialCount },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '16px 20px' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--c-text-1)', fontFamily: "'DM Mono', monospace" }}>{stat.value}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tenant cards grid */}
      {tenants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tenants.map(tenant => (
            <div key={tenant.id} style={{ opacity: suspending === tenant.id ? 0.6 : 1, transition: 'opacity 200ms', pointerEvents: suspending === tenant.id ? 'none' : 'auto' }}>
              <TenantCard
                tenant={tenant}
                onView={() => handleView(tenant.id)}
                onEditPlan={() => setEditingTenant(tenant)}
                onToggleSuspend={() => handleToggleSuspend(tenant)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Building2 size={40} style={{ color: 'var(--c-text-4)', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
            No tenants yet — create your first account above.
          </p>
        </div>
      )}

      {/* Modals */}
      {modal === 'invite' && (
        <Modal title="Invite Business" onClose={() => setModal(null)}>
          <InviteModal onClose={() => setModal(null)} onSuccess={handleModalSuccess} />
        </Modal>
      )}
      {modal === 'create' && (
        <Modal title="Create Account" onClose={() => setModal(null)}>
          <CreateAccountModal onClose={() => setModal(null)} onSuccess={handleModalSuccess} />
        </Modal>
      )}
      {editingTenant && (
        <Modal title="Edit Plan" onClose={() => setEditingTenant(null)}>
          <EditPlanModal tenant={editingTenant} onClose={() => setEditingTenant(null)} onSave={handlePlanSaved} />
        </Modal>
      )}
    </div>
  )
}
