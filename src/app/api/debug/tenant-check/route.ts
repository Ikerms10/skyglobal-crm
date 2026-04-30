import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/debug/tenant-check
// Runs as service role — bypasses all RLS to show actual DB state.
// Remove this route after diagnosis is complete.
export async function GET() {
  try {
    const db = createServiceClient()

    const [
      { data: tenants, error: tenantsErr },
      { data: tenantUsers, error: tuErr },
      { data: masterAdmins, error: maErr },
      { data: leads, error: leadsErr },
      { data: ikerUser, error: ikerErr },
    ] = await Promise.all([
      db.from('tenants').select('id, business_name, owner_id, status').limit(10),
      db.from('tenant_users').select('id, tenant_id, user_id, role').limit(20),
      db.from('master_admins').select('id, user_id').limit(10),
      db.from('leads').select('id, tenant_id, user_id, title, stage').limit(20),
      db.from('auth.users' as any).select('id, email').eq('email', 'ikerms10@gmail.com').limit(1),
    ])

    // Count leads per tenant_id bucket
    const { data: leadCounts } = await db
      .from('leads')
      .select('tenant_id')
      .is('deleted_at', null)

    const nullLeads = leadCounts?.filter(l => !l.tenant_id).length ?? 0
    const withTenant = leadCounts?.filter(l => !!l.tenant_id).length ?? 0

    return NextResponse.json({
      ok: true,
      tenants: { data: tenants, error: tenantsErr?.message },
      tenant_users: { data: tenantUsers, error: tuErr?.message },
      master_admins: { data: masterAdmins, error: maErr?.message },
      leads_sample: { data: leads, error: leadsErr?.message },
      lead_counts: {
        total: leadCounts?.length ?? 0,
        with_tenant_id: withTenant,
        without_tenant_id: nullLeads,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
