import { NextResponse } from 'next/server'

// NOTE: This endpoint is deprecated. It used the service role client without a user session,
// so auto_set_tenant_id() returned NULL and all inserts were invisible to tenants.
// Use /api/webhooks/leads/[tenantId] instead — it accepts an explicit tenant_id in the URL.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
}

export function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/webhooks/leads/{tenantId} instead.' },
    { status: 410, headers: CORS_HEADERS }
  )
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export function POST() {
  return NextResponse.json(
    { success: false, error: 'This endpoint is deprecated. Use /api/webhooks/leads/{tenantId} instead.' },
    { status: 410, headers: CORS_HEADERS }
  )
}
