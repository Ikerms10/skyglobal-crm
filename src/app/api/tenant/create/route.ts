import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'

const bodySchema = z.object({
  user_id: z.string().uuid(),
  business_name: z.string().min(1),
  business_email: z.string().email().nullable().optional(),
  business_phone: z.string().nullable().optional(),
  business_address: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  business_logo_url: z.string().url().nullable().optional(),
  business_logo_path: z.string().nullable().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { user_id, business_name, business_email, business_phone, business_address, industry, business_logo_url, business_logo_path } = parsed.data

    // Service role bypasses RLS — safe to call right after signUp before session is established
    const db = createServiceClient()

    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert({
        business_name,
        business_email: business_email ?? null,
        business_phone: business_phone ?? null,
        business_address: business_address ?? null,
        industry: industry ?? null,
        business_logo_url: business_logo_url ?? null,
        business_logo_path: business_logo_path ?? null,
        status: 'active',
        plan: 'beta',
        owner_id: user_id,
      })
      .select('id')
      .single()

    if (tenantError) {
      return NextResponse.json({ error: tenantError.message }, { status: 500 })
    }

    const { error: memberError } = await db
      .from('tenant_users')
      .insert({ tenant_id: tenant.id, user_id, role: 'owner' })

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // Notify master admin — fire-and-forget, non-critical
    try {
      const { data: adminRow } = await db.from('master_admins').select('user_id').single()
      if (adminRow) {
        const { data: adminTenantUser } = await db
          .from('tenant_users')
          .select('tenant_id')
          .eq('user_id', adminRow.user_id)
          .single()

        if (adminTenantUser) {
          await db.from('notifications').insert({
            tenant_id: adminTenantUser.tenant_id,
            user_id: adminRow.user_id,
            title: 'New Business Signed Up',
            body: `${business_name} just created an account.`,
            type: 'info',
          })
        }
      }
    } catch {}

    // Send admin email — fire-and-forget
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    if (appUrl) {
      fetch(`${appUrl}/api/emails/admin-new-tenant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name, business_email, tenant_id: tenant.id }),
      }).catch(() => {})
    }

    return NextResponse.json({ tenant_id: tenant.id }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
