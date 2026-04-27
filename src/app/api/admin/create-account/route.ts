import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'
import { z } from 'zod'

const bodySchema = z.object({
  business_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.skyglobalsvcs.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }

    const { business_name, email, password } = parsed.data
    const db = createServiceClient()

    // 1. Create auth user with confirmed email (service role skips confirmation flow)
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user.id

    // 2. Create tenant
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert({ business_name, business_email: email, status: 'active', plan: 'beta', owner_id: userId })
      .select('id')
      .single()

    if (tenantError) {
      // Roll back the auth user to keep state consistent
      await db.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: tenantError.message }, { status: 500 })
    }

    // 3. Add as tenant owner
    await db.from('tenant_users').insert({ tenant_id: tenant.id, user_id: userId, role: 'owner' })

    // 4. Send welcome email with credentials
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'SkyGlobal CRM <notifications@skyglobalsvcs.com>',
        to: [email],
        subject: `Your SkyGlobal CRM account is ready — ${business_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #1d1c17; padding: 24px 32px; border-radius: 8px 8px 0 0;">
              <span style="font-size: 22px; font-weight: 700; color: #e6ab35;">SkyGlobal CRM</span>
            </div>
            <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="margin: 0 0 12px; color: #1a1a1a;">Welcome to SkyGlobal CRM</h2>
              <p style="color: #4b5563; margin: 0 0 24px; line-height: 1.6;">
                Your account for <strong>${business_name}</strong> has been created. Here are your login credentials:
              </p>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; background: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 16px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #e5e7eb;">Email</td>
                  <td style="padding: 12px 16px; font-weight: 600; font-size: 13px; border-bottom: 1px solid #e5e7eb;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; color: #6b7280; font-size: 13px;">Temp password</td>
                  <td style="padding: 12px 16px; font-family: monospace; font-size: 14px; font-weight: 700; color: #e6ab35;">${password}</td>
                </tr>
              </table>
              <a href="${APP_URL}/login" style="display: inline-block; background: #e6ab35; color: #1d1c17; font-weight: 700; padding: 14px 28px; border-radius: 7px; text-decoration: none; font-size: 15px;">
                Sign in now →
              </a>
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0;">
                We recommend changing your password after your first login.
              </p>
            </div>
          </div>
        `,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, tenant_id: tenant.id, user_id: userId }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
