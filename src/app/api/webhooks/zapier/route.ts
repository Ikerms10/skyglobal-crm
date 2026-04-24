import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getClientIp } from '@/lib/ratelimit'
import { logAuditEvent } from '@/lib/audit'
import { ZapierWebhookSchema } from '@/lib/validations'

// Zapier fires from their servers, CORS needed for their health-check GET
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
}

// 30 lead ingestions per minute per IP
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60 * 1000

export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: CORS_HEADERS })
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(request)
  if (!rateLimit(`zapier:${ip}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests.' },
      { status: 429, headers: CORS_HEADERS }
    )
  }

  // ── Webhook secret validation ──────────────────────────────────────────────
  // Set ZAPIER_WEBHOOK_SECRET in Vercel env and in your Zapier zap headers.
  const webhookSecret = process.env.ZAPIER_WEBHOOK_SECRET
  if (webhookSecret) {
    const provided = request.headers.get('x-webhook-secret')
    if (provided !== webhookSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      )
    }
  }

  // ── Parse & validate body ──────────────────────────────────────────────────
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const parsed = ZapierWebhookSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422, headers: CORS_HEADERS }
    )
  }

  const { name, description, phone, address, source } = parsed.data

  // user_id comes exclusively from env var — never from untrusted payload
  const userId = process.env.ZAPIER_USER_ID
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration: ZAPIER_USER_ID not set' },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Deduplicate by name (case-insensitive)
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
          phone: phone ?? null,
          address: address ?? null,
          type: 'Residential',
          referred_by: source ?? 'Thumbtack',
          tags: [source ?? 'Thumbtack'],
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

    await logAuditEvent(supabase, {
      userId,
      action: 'CREATE',
      resourceType: 'lead',
      resourceId: lead.id,
      newValues: { source: 'zapier', customer_id: customerId, title: description.slice(0, 100) },
      request,
    })

    return NextResponse.json(
      { success: true, customerId, leadId: lead.id },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('Zapier webhook error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create lead' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
