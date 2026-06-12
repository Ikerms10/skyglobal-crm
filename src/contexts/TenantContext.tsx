'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Single-tenant since 2026-06: the app serves only SkyGlobal Renovations.
// This context resolves the signed-in user's business row automatically
// (branding for sidebar, settings, proposals) — there is no tenant
// selection, switching, or impersonation.
export interface Tenant {
  id: string
  business_name: string
  business_email: string | null
  business_phone: string | null
  business_address: string | null
  business_website: string | null
  business_logo_url: string | null
  business_logo_path: string | null
  industry: string | null
  status: string
  plan: string
  trial_ends_at: string | null
  created_at: string | null
}

interface TenantContextValue {
  tenant: Tenant | null
  tenantId: string | null
  isLoading: boolean
  updateTenant: (patch: Partial<Tenant>) => void
  refetchTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  tenantId: null,
  isLoading: true,
  updateTenant: () => {},
  refetchTenant: async () => {},
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTenant = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setTenant(null)
      setIsLoading(false)
      return
    }

    // Resolve the business via tenant_users (same logic as get_my_tenant_id()).
    // Using .maybeSingle() on the oldest membership row so multiple tenant_users
    // rows (e.g. from duplicate tenant migrations) never cause a .single() throw.
    const { data: tuRow } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!tuRow?.tenant_id) {
      setTenant(null)
      setIsLoading(false)
      return
    }

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tuRow.tenant_id)
      .single()

    setTenant(tenantData ?? null)
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchTenant() }, [fetchTenant])

  const updateTenant = useCallback((patch: Partial<Tenant>) => {
    setTenant(prev => prev ? { ...prev, ...patch } : prev)
  }, [])

  return (
    <TenantContext.Provider value={{
      tenant,
      tenantId: tenant?.id ?? null,
      isLoading,
      updateTenant,
      refetchTenant: fetchTenant,
    }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  return useContext(TenantContext)
}
