import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/debug/leads-raw?secret=iker-crm-fix-2026
// Shows EXACTLY what the /api/leads route would return, with full error detail
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== (process.env.ADMIN_SECRET_KEY ?? 'iker-crm-fix-2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const diagnostics: Record<string, any> = {}

  try {
    // Check env vars
    diagnostics.env = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...',
    }

    const db = createServiceClient()

    // 1. Find Iker's tenant
    const { data: tuRows, error: tuErr } = await db
      .from('tenant_users')
      .select('tenant_id, user_id, role')
    diagnostics.tenant_users = { data: tuRows, error: tuErr?.message }

    if (tuRows && tuRows.length > 0) {
      const tenantId = tuRows[0].tenant_id

      // 2. Query leads for this tenant
      const { data: leads, error: leadsErr } = await db
        .from('leads')
        .select('id, title, stage, tenant_id, user_id, created_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      diagnostics.leads = { count: leads?.length, error: leadsErr?.message, sample: leads?.slice(0, 3) }

      // 3. Also try WITHOUT tenant filter
      const { data: allLeads, error: allErr } = await db
        .from('leads')
        .select('id, title, tenant_id')
        .is('deleted_at', null)
      diagnostics.all_leads_no_filter = { count: allLeads?.length, error: allErr?.message }
    }

    // 4. Test the server createClient (cookie-based auth)
    // This simulates what /api/leads does to get the user
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const authClient = await createClient()
      const { data: { user }, error: authErr } = await authClient.auth.getUser()
      diagnostics.server_auth = {
        user_id: user?.id,
        email: user?.email,
        error: authErr?.message,
        note: 'This is what /api/leads uses - if user is null, it returns 401 and the fetch gets empty array'
      }
    } catch (e: any) {
      diagnostics.server_auth = { error: e.message, note: 'createClient from server.ts failed' }
    }

    return NextResponse.json({ ok: true, ...diagnostics })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message, stack: err.stack, diagnostics }, { status: 500 })
  }
}
