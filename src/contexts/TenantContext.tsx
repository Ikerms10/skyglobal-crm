'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  isMasterAdmin: boolean
  /** True when user is a master admin with no tenant of their own (pure platform admin) */
  isAdminOnly: boolean
  updateTenant: (patch: Partial<Tenant>) => void
  refetchTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  tenantId: null,
  isLoading: true,
  isMasterAdmin: false,
  isAdminOnly: false,
  updateTenant: () => {},
  refetchTenant: async () => {},
})

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)
  const [isAdminOnly, setIsAdminOnly] = useState(false)

  const fetchTenant = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Check for admin impersonation
    const impersonatingId = typeof window !== 'undefined'
      ? sessionStorage.getItem('admin_viewing_tenant')
      : null

    if (impersonatingId) {
      // Admin is viewing a specific tenant — fetch directly by id
      const [{ data: tenantData }, { data: adminRow }] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', impersonatingId).single(),
        user
          ? supabase.from('master_admins').select('user_id').eq('user_id', user.id).single()
          : Promise.resolve({ data: null }),
      ])
      setTenant(tenantData ?? null)
      setIsMasterAdmin(adminRow !== null)
      setIsLoading(false)
      return
    }

    if (!user) {
      setTenant(null)
      setIsLoading(false)
      return
    }

    // Resolve tenant via tenant_users (same logic as get_my_tenant_id()).
    // Using .maybeSingle() on the oldest membership row so multiple tenant_users
    // rows (e.g. from duplicate tenant migrations) never cause a .single() throw.
    const [{ data: tuRow }, { data: adminRow }] = await Promise.all([
      supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('master_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single(),
    ])

    if (!tuRow?.tenant_id) {
      setTenant(null)
      setIsMasterAdmin(adminRow !== null)
      setIsAdminOnly(adminRow !== null)
      setIsLoading(false)
      return
    }

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tuRow.tenant_id)
      .single()

    setTenant(tenantData ?? null)
    setIsMasterAdmin(adminRow !== null)
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
      isMasterAdmin,
      isAdminOnly,
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
