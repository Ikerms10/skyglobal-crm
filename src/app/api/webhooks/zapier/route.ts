import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const description = String(body.description ?? '').trim()
  if (!name || !description) {
    return NextResponse.json({ success: false, error: 'name and description are required' }, { status: 400 })
  }

  const phone = body.phone ? String(body.phone).trim() : null
  const address = body.address ? String(body.address).trim() : null
  const source = body.source ? String(body.source).trim() : 'Thumbtack'

  // user_id can come from the payload or be set once as an env var for single-user setups
  const userId = String(body.user_id ?? process.env.ZAPIER_USER_ID ?? '')
  if (!userId) {
    return NextResponse.json({ success: false, error: 'user_id is required (payload or ZAPIER_USER_ID env var)' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Find existing customer by name
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', name)
      .is('deleted_at', null)
      .maybeSingle()

    let customerId: string

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          name,
          phone,
          address,
          type: 'Residential',
          referred_by: source,
          tags: [source],
        })
        .select('id')
        .single()

      if (custError) throw custError
      customerId = newCustomer.id
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: userId,
        customer_id: customerId,
        title: description.slice(0, 100),
        source: 'Thumbtack',
        stage: 'New Lead',
        notes: description,
      })
      .select('id')
      .single()

    if (leadError) throw leadError

    return NextResponse.json({ success: true, customerId, leadId: lead.id })
  } catch (error) {
    console.error('Zapier webhook error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create lead' }, { status: 500 })
  }
}
