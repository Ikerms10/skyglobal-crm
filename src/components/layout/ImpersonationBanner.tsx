'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/contexts/TenantContext'
import { LogOut } from 'lucide-react'

export function ImpersonationBanner() {
  const router = useRouter()
  const { tenant } = useTenant()
  const [isImpersonating, setIsImpersonating] = useState(false)

  useEffect(() => {
    setIsImpersonating(!!sessionStorage.getItem('admin_viewing_tenant'))
  }, [])

  if (!isImpersonating) return null

  const handleExit = () => {
    sessionStorage.removeItem('admin_viewing_tenant')
    router.push('/admin')
    router.refresh()
  }

  return (
    <div style={{ background: 'var(--c-gold)', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace", letterSpacing: '0.03em' }}>
        ⚠ Viewing as: {tenant?.business_name ?? '…'}
      </span>
      <button
        onClick={handleExit}
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 5, background: 'rgba(0,0,0,0.2)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}
      >
        <LogOut size={11} /> Exit to Admin
      </button>
    </div>
  )
}
