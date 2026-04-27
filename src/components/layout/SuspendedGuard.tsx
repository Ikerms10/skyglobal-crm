'use client'
import { useTenant } from '@/contexts/TenantContext'
import { AlertTriangle } from 'lucide-react'

export function SuspendedGuard({ children }: { children: React.ReactNode }) {
  const { tenant, isLoading } = useTenant()

  if (isLoading) return <>{children}</>

  if (tenant?.status === 'suspended') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 16,
        padding: '40px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'rgba(185,74,58,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertTriangle size={28} style={{ color: '#B94A3A' }} />
        </div>
        <div>
          <h2 style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--c-text-1)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            margin: '0 0 8px',
          }}>
            Account Suspended
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--c-text-3)',
            maxWidth: 380,
            lineHeight: 1.6,
            margin: 0,
          }}>
            Your account has been suspended. Please contact support to resolve this issue and restore access.
          </p>
        </div>
        <a
          href="mailto:support@skyglobalsvcs.com"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'var(--c-gold)',
            color: 'var(--c-text-on-dark)',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Contact Support
        </a>
      </div>
    )
  }

  return <>{children}</>
}
