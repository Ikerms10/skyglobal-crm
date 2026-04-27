import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AdminPanel } from './AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify master admin via service role (bypasses RLS)
  const db = createServiceClient()
  const { data: adminRow } = await db
    .from('master_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!adminRow) redirect('/dashboard')

  // Load all tenants with stats
  const { data: tenants } = await db
    .from('tenants')
    .select(`
      id, business_name, business_email, status, plan, created_at,
      tenant_users(count),
      owner:owner_id(email)
    `)
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AdminPanel tenants={(tenants ?? []) as any[]} currentUserId={user.id} />
}
