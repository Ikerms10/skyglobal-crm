'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTenant } from '@/contexts/TenantContext'

export function AdminViewHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refetchTenant } = useTenant()

  useEffect(() => {
    const adminView = searchParams.get('admin_view')
    if (!adminView) return

    sessionStorage.setItem('admin_viewing_tenant', adminView)

    // Strip param from URL without reload, then reload tenant context
    const url = new URL(window.location.href)
    url.searchParams.delete('admin_view')
    router.replace(url.pathname + url.search)
    refetchTenant()
  }, [searchParams, router, refetchTenant])

  return null
}
