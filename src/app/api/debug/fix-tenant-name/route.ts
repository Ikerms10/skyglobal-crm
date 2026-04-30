import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/debug/fix-tenant-name?secret=iker-crm-fix-2026
// Updates the SkyGlobal tenant to have the correct full name.
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== (process.env.ADMIN_SECRET_KEY ?? 'iker-crm-fix-2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const db = createServiceClient()

  // Fix tenant name
  const { error } = await db
    .from('tenants')
    .update({
      business_name: 'SkyGlobal Renovations LLC',
      business_email: 'skyglobalsvcs@gmail.com',
      business_phone: '352-782-2460',
      business_website: 'skyglobalsvcs.com',
      industry: 'Painting & Renovations',
      status: 'active',
    })
    .eq('id', 'd63ee8ae-1daf-4e95-8e7e-8beed1d4d324')

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // Delete the two "Pending Setup" stub tenants (no owner, no data)
  const { error: delErr } = await db
    .from('tenants')
    .delete()
    .is('owner_id', null)
    .eq('status', 'trial')
    .eq('business_name', 'Pending Setup')

  return NextResponse.json({
    ok: true,
    tenant_name_updated: 'SkyGlobal Renovations LLC',
    pending_stubs_cleaned: !delErr,
  })
}
