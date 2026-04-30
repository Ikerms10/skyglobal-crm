import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/debug/fix-tenant?secret=ADMIN_SECRET_KEY
// One-time fix: ensures SkyGlobal tenant exists, Iker is linked, and all data is backfilled.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const adminSecret = process.env.ADMIN_SECRET_KEY ?? 'iker-crm-fix-2026'
  if (secret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const db = createServiceClient()

    const log: string[] = []

    // 1. Find Iker's auth user
    const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 })
    const ikerUser = users?.users?.find(u => u.email === 'ikerms10@gmail.com')
    if (!ikerUser) {
      return NextResponse.json({ ok: false, error: 'ikerms10@gmail.com not found in auth.users' }, { status: 400 })
    }
    const userId = ikerUser.id
    log.push(`Found Iker user: ${userId}`)

    // 2. Ensure master_admin row
    const { error: maErr } = await db
      .from('master_admins')
      .upsert({ user_id: userId }, { onConflict: 'user_id' })
    if (maErr) log.push(`master_admins upsert error: ${maErr.message}`)
    else log.push('✓ master_admins row ensured')

    // 3. Find or create SkyGlobal tenant
    const { data: existingTenant } = await db
      .from('tenants')
      .select('id, business_name')
      .eq('owner_id', userId)
      .limit(1)
      .maybeSingle()

    let tenantId: string

    if (existingTenant) {
      tenantId = existingTenant.id
      log.push(`✓ Found existing tenant: ${existingTenant.business_name} (${tenantId})`)
    } else {
      const { data: newTenant, error: tErr } = await db
        .from('tenants')
        .insert({
          business_name: 'SkyGlobal Renovations LLC',
          business_email: 'skyglobalsvcs@gmail.com',
          business_phone: '352-782-2460',
          business_website: 'skyglobalsvcs.com',
          industry: 'Painting & Renovations',
          status: 'active',
          plan: 'beta',
          owner_id: userId,
        })
        .select('id')
        .single()
      if (tErr) return NextResponse.json({ ok: false, error: tErr.message, log }, { status: 500 })
      tenantId = newTenant.id
      log.push(`✓ Created tenant: ${tenantId}`)
    }

    // 4. Ensure tenant_users row
    const { error: tuErr } = await db
      .from('tenant_users')
      .upsert({ tenant_id: tenantId, user_id: userId, role: 'owner' }, { onConflict: 'tenant_id,user_id' })
    if (tuErr) log.push(`tenant_users upsert error: ${tuErr.message}`)
    else log.push('✓ tenant_users row ensured')

    // 5. Backfill all tables where tenant_id IS NULL
    const tables = [
      'leads', 'customers', 'projects', 'proposals', 'expenses',
      'invoices', 'events', 'business_settings', 'notifications',
      'crew_assignments', 'work_orders', 'audit_log',
    ]

    for (const table of tables) {
      try {
        const { error, count } = await db
          .from(table as any)
          .update({ tenant_id: tenantId })
          .is('tenant_id', null)
          .select('id', { count: 'exact', head: true })
        if (error) log.push(`${table}: update error — ${error.message}`)
        else log.push(`✓ ${table}: backfilled (matched rows with null tenant_id)`)
      } catch (e: any) {
        log.push(`${table}: exception — ${e.message}`)
      }
    }

    // Optional tables
    for (const table of ['daily_notes', 'daily_todos']) {
      try {
        await db.from(table as any).update({ tenant_id: tenantId }).is('tenant_id', null)
        log.push(`✓ ${table}: backfilled`)
      } catch {
        log.push(`${table}: skipped (may not exist)`)
      }
    }

    // 6. Verify
    const { data: leadCount } = await db.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId)
    log.push(`✓ Leads now with tenant_id=${tenantId}: check below`)

    const { count: leadsWithTenant } = await db
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    const { count: leadsNull } = await db
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .is('tenant_id', null)

    return NextResponse.json({
      ok: true,
      tenant_id: tenantId,
      user_id: userId,
      leads_with_tenant: leadsWithTenant,
      leads_null_tenant: leadsNull,
      log,
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
