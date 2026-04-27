import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest, { params }: { params: { tenantId: string } }) {
  const { tenantId } = params

  // Verify webhook secret
  const secret = req.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.THUMBTACK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const db = createServiceClient()

    // Verify tenant exists and is active
    const { data: tenant } = await db
      .from('tenants')
      .select('id, status')
      .eq('id', tenantId)
      .single()

    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    if (tenant.status === 'suspended' || tenant.status === 'cancelled') {
      return NextResponse.json({ error: 'Tenant inactive' }, { status: 403 })
    }

    // Extract lead fields from webhook payload — handles Thumbtack and generic shapes
    const customerName =
      body.customer?.name ||
      body.lead?.name ||
      body.name ||
      'Webhook Lead'

    const phone =
      body.customer?.phone ||
      body.lead?.phone ||
      body.phone ||
      null

    const email =
      body.customer?.email ||
      body.lead?.email ||
      body.email ||
      null

    const notes = JSON.stringify(body, null, 2)

    // Insert customer if we have enough info
    let customerId: string | null = null
    if (customerName !== 'Webhook Lead' || phone || email) {
      const { data: customer } = await db.from('customers').insert({
        tenant_id: tenantId,
        name: customerName,
        phone: phone ?? null,
        email: email ?? null,
        type: 'Residential',
      }).select('id').single()
      customerId = customer?.id ?? null
    }

    // Insert lead
    const { error: leadError } = await db.from('leads').insert({
      tenant_id: tenantId,
      title: `${customerName} — Thumbtack`,
      source: 'Thumbtack',
      stage: 'New Lead',
      customer_id: customerId,
      notes,
    })

    if (leadError) throw leadError

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
