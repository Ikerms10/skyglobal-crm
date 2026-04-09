import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Thumbtack → Zapier → this webhook
// Creates a customer + lead from the Thumbtack lead payload
// Required header: x-webhook-secret: <THUMBTACK_WEBHOOK_SECRET>

export async function POST(request: NextRequest) {
  // Validate webhook secret
  const secret = request.headers.get('x-webhook-secret')
  if (secret !== process.env.THUMBTACK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Extract fields from Thumbtack/Zapier payload
  // Thumbtack typically sends: name, phone, email, request_title, zip_code, city, request_details
  // Adjust field names based on your actual Zapier mapping
  const name = String(body.name ?? body.customer_name ?? 'Unknown Customer')
  const phone = String(body.phone ?? body.phone_number ?? '')
  const email = String(body.email ?? '')
  const jobTitle = String(body.request_title ?? body.title ?? body.job_type ?? 'Thumbtack Lead')
  const city = String(body.city ?? '')
  const zip = String(body.zip_code ?? body.zip ?? '')
  const notes = String(body.request_details ?? body.description ?? body.notes ?? '')
  const userId = String(body.user_id ?? '') // Pass the Supabase user_id in the Zapier payload

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required in payload' }, { status: 400 })
  }

  // Use service role key to bypass RLS for webhook inserts
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Create or find customer
    let customerId: string

    // Try to find existing customer by phone or email
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .or(`phone.eq.${phone},email.eq.${email}`)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          name,
          phone: phone || null,
          email: email || null,
          city: city || null,
          zip: zip || null,
          type: 'Residential',
          referred_by: 'Thumbtack',
          tags: ['Thumbtack'],
        })
        .select('id')
        .single()

      if (custError) throw custError
      customerId = newCustomer.id
    }

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        user_id: userId,
        customer_id: customerId,
        title: jobTitle,
        source: 'Thumbtack',
        stage: 'New Lead',
        notes: notes || null,
      })
      .select('id')
      .single()

    if (leadError) throw leadError

    // Log activity
    await supabase.from('activities').insert({
      user_id: userId,
      customer_id: customerId,
      lead_id: lead.id,
      type: 'Note',
      content: `Lead imported from Thumbtack: ${jobTitle}`,
    })

    return NextResponse.json({ success: true, customer_id: customerId, lead_id: lead.id })
  } catch (error) {
    console.error('Thumbtack webhook error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
