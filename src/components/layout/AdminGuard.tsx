'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/contexts/TenantContext'

/**
 * Mounted inside the dashboard layout. If the current user is a pure
 * platform admin (no tenant, not impersonating), redirects them to /admin.
 * Admins who ARE impersonating a tenant have a non-null tenantId from
 * TenantContext (loaded via sessionStorage), so this guard won't fire.
 */
export function AdminGuard() {
  const { isAdminOnly, isLoading } = useTenant()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAdminOnly) {
      router.replace('/admin')
    }
  }, [isAdminOnly, isLoading, router])

  return null
}
