import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '@/lib/ratelimit'
import { logAuditEvent } from '@/lib/audit'
import { ThumbtackWebhookSchema } from '@/lib/validations'

// Thumbtack → Zapier → this webhook
// Creates a customer + lead from the Thumbtack lead payload
// Required header: x-webhook-secret: <THUMBTACK_WEBHOOK_SECRET>

// 30 lead ingestions per minute per IP
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60 * 1000

export async function POST(request: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(request)
  if (!rateLimit(`thumbtack:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  // ── Webhook secret validation ──────────────────────────────────────────────
  const secret = request.headers.get('x-webhook-secret')
  if (secret !== process.env.THUMBTACK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse & validate body ──────────────────────────────────────────────────
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ThumbtackWebhookSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const body = parsed.data

  // Extract fields from Thumbtack/Zapier payload
  const name = (body.name ?? body.customer_name ?? 'Unknown Customer').trim()
  const phone = (body.phone ?? body.phone_number ?? '').trim() || null
  const email = (body.email ?? '').trim() || null
  const jobTitle = (body.request_title ?? body.title ?? body.job_type ?? 'Thumbtack Lead').trim()
  const city = (body.city ?? '').trim() || null
  const zip = (body.zip_code ?? body.zip ?? '').trim() || null
  const notes = (body.request_details ?? body.description ?? body.notes ?? '').trim() || null

  // user_id from env var only — never trusted from payload
  const userId = process.env.THUMBTACK_USER_ID ?? process.env.ZAPIER_USER_ID
  if (!userId) {
    return NextResponse.json(
      { error: 'Server misconfiguration: THUMBTACK_USER_ID not set' },
      { status: 500 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Deduplicate by phone or email
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .or(
        [phone ? `phone.eq.${phone}` : null, email ? `email.eq.${email}` : null]
          .filter(Boolean)
          .join(',') || 'id.is.null'
      )
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
          email,
          city,
          zip,
          type: 'Residential',
          referred_by: 'Thumbtack',
          tags: ['Thumbtack'],
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
        title: jobTitle,
        source: 'Thumbtack',
        stage: 'New Lead',
        notes,
      })
      .select('id')
      .single()

    if (leadError) throw leadError

    await supabase.from('activities').insert({
      user_id: userId,
      customer_id: customerId,
      lead_id: lead.id,
      type: 'Note',
      content: `Lead imported from Thumbtack: ${jobTitle}`,
    })

    await logAuditEvent(supabase, {
      userId,
      action: 'CREATE',
      resourceType: 'lead',
      resourceId: lead.id,
      newValues: { source: 'thumbtack', customer_id: customerId, title: jobTitle },
      request,
    })

    return NextResponse.json({ success: true, customer_id: customerId, lead_id: lead.id })
  } catch (error) {
    console.error('Thumbtack webhook error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
