'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Building2, Users, ExternalLink, LogOut, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Tenant {
  id: string
  business_name: string
  business_email: string | null
  status: string
  plan: string
  created_at: string
  tenant_users: { count: number }[]
  owner: { email: string }[] | null
}

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--c-sage)',
  trial: 'var(--c-gold)',
  suspended: 'var(--c-danger)',
  cancelled: 'var(--c-text-4)',
}

export function AdminPanel({ tenants, currentUserId }: { tenants: Tenant[]; currentUserId: string }) {
  const router = useRouter()
  const [impersonating, setImpersonating] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('admin_viewing_tenant')
    return null
  })

  const handleImpersonate = (tenantId: string, name: string) => {
    sessionStorage.setItem('admin_viewing_tenant', tenantId)
    setImpersonating(tenantId)
    router.push('/dashboard')
  }

  const handleExitImpersonation = () => {
    sessionStorage.removeItem('admin_viewing_tenant')
    setImpersonating(null)
    router.refresh()
  }

  return (
    <div style={{ padding: '28px 24px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Impersonation banner */}
      {impersonating && (
        <div style={{ marginBottom: 20, padding: '10px 16px', borderRadius: 8, background: 'color-mix(in srgb, var(--c-danger) 12%, transparent)', border: '1px solid var(--c-danger)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-danger)', fontFamily: "'DM Mono', monospace" }}>
            Viewing as: {tenants.find(t => t.id === impersonating)?.business_name ?? impersonating}
          </span>
          <button onClick={handleExitImpersonation} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 6, background: 'var(--c-danger)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
            <LogOut size={12} /> Exit
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
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

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 28 }}>
        {[
          { label: 'Total Tenants', value: tenants.length },
          { label: 'Active', value: tenants.filter(t => t.status === 'active').length },
          { label: 'Beta', value: tenants.filter(t => t.plan === 'beta').length },
        ].map(stat => (
          <div key={stat.label} style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '16px 20px' }}>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--c-text-1)', fontFamily: "'DM Mono', monospace" }}>{stat.value}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace', letterSpacing: '0.06em', textTransform: 'uppercase" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tenant list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tenants.map(tenant => {
          const memberCount = (tenant.tenant_users as any)?.[0]?.count ?? 0
          return (
            <div
              key={tenant.id}
              style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              {/* Icon */}
              <div style={{ width: 38, height: 38, borderRadius: 8, background: 'var(--c-canvas)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={18} style={{ color: 'var(--c-text-4)' }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {tenant.business_name}
                  </p>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: `color-mix(in srgb, ${STATUS_COLOR[tenant.status] ?? 'var(--c-text-4)'} 15%, transparent)`, color: STATUS_COLOR[tenant.status] ?? 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {tenant.status}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 8, background: 'var(--c-canvas)', color: 'var(--c-text-4)', border: '1px solid var(--c-border)', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {tenant.plan}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
                    {tenant.business_email ?? 'No email'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={10} /> {memberCount}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
                    {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => handleImpersonate(tenant.id, tenant.business_name)}
                title={`View as ${tenant.business_name}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, background: 'transparent', border: '1px solid var(--c-border)', cursor: 'pointer', color: 'var(--c-text-3)', fontSize: 11, fontFamily: "'DM Mono', monospace", transition: 'all 150ms', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-gold)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--c-gold)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-text-3)'; e.currentTarget.style.borderColor = 'var(--c-border)' }}
              >
                <Eye size={12} /> View
              </button>
            </div>
          )
        })}

        {tenants.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            No tenants yet
          </div>
        )}
      </div>
    </div>
  )
}
