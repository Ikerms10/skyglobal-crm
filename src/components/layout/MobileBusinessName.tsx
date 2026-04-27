'use client'
import { useTenant } from '@/contexts/TenantContext'

export function MobileBusinessName() {
  const { tenant } = useTenant()
  return (
    <span
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700,
        fontSize: 17,
        color: 'var(--c-text-1)',
        letterSpacing: '-0.03em',
      }}
    >
      {tenant?.business_name ?? 'SkyGlobal'}
    </span>
  )
}
