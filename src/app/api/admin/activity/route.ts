import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data: adminRow } = await db
      .from('master_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 50)

    // Pull recent activity across all tenants in parallel
    const [leadsRes, projectsRes, invoicesRes, tenantsRes, loginLogRes] = await Promise.all([
      db.from('leads')
        .select('id, title, stage, created_at, tenant_id, tenants(business_name)')
        .order('created_at', { ascending: false })
        .limit(limit),

      db.from('projects')
        .select('id, title, status, created_at, tenant_id, tenants(business_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit),

      db.from('invoices')
        .select('id, total, status, created_at, tenant_id, tenants(business_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit),

      db.from('tenants')
        .select('id, business_name, status, plan, created_at')
        .order('created_at', { ascending: false })
        .limit(20),

      db.from('tenant_login_log')
        .select('tenant_id, user_id, logged_in_at, tenants(business_name)')
        .order('logged_in_at', { ascending: false })
        .limit(limit),
    ])

    // Merge and sort into a unified feed
    const feed: Array<{
      id: string
      type: 'lead' | 'project' | 'invoice' | 'tenant_signup' | 'login'
      label: string
      business: string
      created_at: string
    }> = []

    leadsRes.data?.forEach(l => feed.push({
      id: `lead-${l.id}`,
      type: 'lead',
      label: `New lead: ${l.title}`,
      business: (l.tenants as any)?.business_name ?? 'Unknown',
      created_at: l.created_at,
    }))

    projectsRes.data?.forEach(p => feed.push({
      id: `project-${p.id}`,
      type: 'project',
      label: `Project created: ${p.title}`,
      business: (p.tenants as any)?.business_name ?? 'Unknown',
      created_at: p.created_at,
    }))

    invoicesRes.data?.forEach(i => feed.push({
      id: `invoice-${i.id}`,
      type: 'invoice',
      label: `Invoice $${i.total?.toLocaleString() ?? '0'} (${i.status})`,
      business: (i.tenants as any)?.business_name ?? 'Unknown',
      created_at: i.created_at,
    }))

    tenantsRes.data?.forEach(t => feed.push({
      id: `tenant-${t.id}`,
      type: 'tenant_signup',
      label: `New tenant: ${t.business_name} [${t.plan}]`,
      business: t.business_name,
      created_at: t.created_at,
    }))

    loginLogRes.data?.forEach(l => feed.push({
      id: `login-${l.tenant_id}-${l.logged_in_at}`,
      type: 'login',
      label: 'User logged in',
      business: (l.tenants as any)?.business_name ?? 'Unknown',
      created_at: l.logged_in_at,
    }))

    feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ feed: feed.slice(0, limit) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
