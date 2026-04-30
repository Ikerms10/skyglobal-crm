'use client'
import { useTenant } from '@/contexts/TenantContext'

// Shows the TENANT's business name in the mobile top bar.
// Falls back to the PLATFORM short name while loading.
export function MobileBusinessName() {
  const { tenant } = useTenant()
  return (
    <span
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        fontSize: 17,
        color: 'var(--c-text-1)',
        letterSpacing: '-0.03em',
      }}
    >
      {tenant?.business_name ?? (
        <>Iker's <span style={{ color: 'var(--c-gold)' }}>CRM</span></>
      )}
    </span>
  )
}
