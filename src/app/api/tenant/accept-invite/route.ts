import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const bodySchema = z.object({
  invite_id: z.string().uuid(),
  user_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  role: z.enum(['admin', 'member']),
  business_name: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { invite_id, user_id, tenant_id, role, business_name } = parsed.data
    const db = createServiceClient()

    // Verify invite is still valid
    const { data: invite } = await db
      .from('invites')
      .select('id, accepted_at, expires_at')
      .eq('id', invite_id)
      .single()

    if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite expired or already used' }, { status: 400 })
    }

    // Check if tenant is a stub (no owner) — if so, make this user the owner
    const { data: tenant } = await db
      .from('tenants')
      .select('owner_id, business_name')
      .eq('id', tenant_id)
      .single()

    const isStubTenant = !tenant?.owner_id

    // Add user to tenant
    const { error: memberError } = await db
      .from('tenant_users')
      .insert({ tenant_id, user_id, role: isStubTenant ? 'owner' : role })

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // If stub, set this user as the owner and update business_name if provided
    if (isStubTenant) {
      const update: Record<string, any> = { owner_id: user_id, status: 'active' }
      if (business_name) update.business_name = business_name
      await db.from('tenants').update(update).eq('id', tenant_id)
    }

    // Mark invite accepted
    await db.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite_id)

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
