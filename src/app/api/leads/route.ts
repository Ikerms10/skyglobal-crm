import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/leads — Server-side leads fetcher.
// Uses auth session to identify the user, then uses service role
// to query leads by tenant_id (bypassing any RLS issues).
export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate the user via their session cookie
    const authClient = await createClient()
    const { data: { user }, error: authErr } = await authClient.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Use service role to find their tenant_id
    const db = createServiceClient()
    const { data: tuRow } = await db
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!tuRow?.tenant_id) {
      return NextResponse.json({ leads: [], tenant_id: null })
    }

    const tenantId = tuRow.tenant_id

    // 3. Fetch leads for this tenant (service role — bypasses all RLS)
    const { data: leads, error: leadsErr } = await db
      .from('leads')
      .select('*, customer:customers!leads_customer_id_fkey(id, name, phone, email, type, address, city, state, zip)')
      .is('deleted_at', null)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (leadsErr) {
      console.error('[api/leads] query error:', leadsErr)
      return NextResponse.json({ error: leadsErr.message }, { status: 500 })
    }

    return NextResponse.json({
      leads: leads ?? [],
      tenant_id: tenantId,
      count: leads?.length ?? 0,
    })
  } catch (err: any) {
    console.error('[api/leads] unexpected error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}

// POST /api/leads — Create a new lead (service role bypasses RLS)
export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: authErr } = await authClient.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const db = createServiceClient()

    // Resolve tenant_id
    const { data: tuRow } = await db
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!tuRow?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found for user' }, { status: 400 })
    }

    // Handle optional new customer creation
    let customerId = body.customer_id ?? null
    if (body.new_customer_name) {
      const { data: newCust, error: custErr } = await db
        .from('customers')
        .insert({
          user_id: user.id,
          tenant_id: tuRow.tenant_id,
          name: body.new_customer_name,
          phone: body.new_customer_phone ?? null,
          type: body.new_customer_type ?? 'Residential',
        })
        .select('id')
        .single()
      if (custErr) return NextResponse.json({ error: custErr.message }, { status: 500 })
      customerId = newCust.id
    }

    const { data: lead, error: leadErr } = await db
      .from('leads')
      .insert({
        user_id: user.id,
        tenant_id: tuRow.tenant_id,
        customer_id: customerId,
        title: body.title,
        source: body.source,
        stage: body.stage ?? 'New Lead',
        estimated_value: body.estimated_value ?? null,
        notes: body.notes ?? null,
        follow_up_date: body.follow_up_date ?? null,
      })
      .select('*, customer:customers!leads_customer_id_fkey(id, name, phone, email, type)')
      .single()

    if (leadErr) return NextResponse.json({ error: leadErr.message }, { status: 500 })

    if (customerId) {
      await db.from('activities').insert({
        user_id: user.id,
        customer_id: customerId,
        type: 'Stage Change',
        content: `New lead created: ${body.title}`,
      })
    }

    return NextResponse.json({ lead }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
