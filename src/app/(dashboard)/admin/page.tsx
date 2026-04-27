import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AdminPanel } from './AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()
  const { data: adminRow } = await db
    .from('master_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!adminRow) redirect('/dashboard')

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [
    { data: tenants },
    { data: leadRows },
    { data: projectRows },
    { data: invoiceRows },
  ] = await Promise.all([
    db
      .from('tenants')
      .select('id, business_name, business_email, business_logo_url, status, plan, created_at, owner:owner_id(email)')
      .order('created_at', { ascending: false }),
    db.from('leads').select('tenant_id').is('deleted_at', null),
    db.from('projects').select('tenant_id').is('deleted_at', null),
    db
      .from('invoices')
      .select('tenant_id, total, status')
      .gte('created_at', startOfMonth.toISOString())
      .is('deleted_at', null),
  ])

  const leadCounts: Record<string, number> = {}
  for (const row of leadRows ?? []) {
    leadCounts[row.tenant_id] = (leadCounts[row.tenant_id] ?? 0) + 1
  }

  const projectCounts: Record<string, number> = {}
  for (const row of projectRows ?? []) {
    projectCounts[row.tenant_id] = (projectCounts[row.tenant_id] ?? 0) + 1
  }

  const revenueThisMonth: Record<string, number> = {}
  for (const row of invoiceRows ?? []) {
    if (row.status === 'paid') {
      revenueThisMonth[row.tenant_id] = (revenueThisMonth[row.tenant_id] ?? 0) + (row.total ?? 0)
    }
  }

  const tenantsWithStats = (tenants ?? []).map(t => ({
    ...t,
    leadCount: leadCounts[t.id] ?? 0,
    projectCount: projectCounts[t.id] ?? 0,
    revenueThisMonth: revenueThisMonth[t.id] ?? 0,
  }))

  return <AdminPanel tenants={tenantsWithStats as any[]} />
}
