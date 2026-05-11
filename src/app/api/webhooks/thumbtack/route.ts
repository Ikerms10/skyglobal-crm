import { NextResponse } from 'next/server'

// NOTE: This endpoint is deprecated. It used the service role client without a user session,
// so auto_set_tenant_id() returned NULL and all inserts were invisible to tenants.
// Use /api/webhooks/leads/[tenantId] instead — it accepts an explicit tenant_id in the URL.
export function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/webhooks/leads/{tenantId} instead.' },
    { status: 410 }
  )
}
