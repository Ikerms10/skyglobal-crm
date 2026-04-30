import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/ratelimit'

const bodySchema = z.object({
  business_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.skyglobalsvcs.com'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (!rateLimit(`admin-create:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = createServiceClient()
    const { data: adminRow } = await db.from('master_admins').select('user_id').eq('user_id', user.id).single()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
    }

    const { business_name, email, password } = parsed.data

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
      const { PLATFORM } = await import('@/lib/constants')
      await resend.emails.send({
        from: `${PLATFORM.fromName} <${PLATFORM.fromEmail}>`,
        to: [email],
        subject: `Your ${PLATFORM.shortName} account is ready — ${business_name}`,
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:28px;font-weight:900;color:#1d1c17;letter-spacing:-0.02em;margin-bottom:4px;">
        Iker's
      </div>
      <div style="font-size:11px;color:#7a6a5a;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">
        Professional CRM
      </div>
    </div>
    <div style="background:#fffdf7;border:1px solid #e8dcc0;border-radius:14px;padding:36px 32px;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
      <h1 style="font-size:22px;font-weight:800;color:#1d1c17;margin:0 0 12px;">
        Welcome to Iker's, ${business_name}! 🎉
      </h1>
      <p style="font-size:15px;color:#4a3f35;line-height:1.65;margin:0 0 24px;">
        Your account has been set up. Here are your login credentials:
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;background:#faf8f4;border-radius:10px;overflow:hidden;border:1px solid #e8dcc0;">
        <tr>
          <td style="padding:12px 16px;color:#7a6a5a;font-size:13px;border-bottom:1px solid #e8dcc0;">Email</td>
          <td style="padding:12px 16px;font-weight:600;font-size:13px;border-bottom:1px solid #e8dcc0;">${email}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#7a6a5a;font-size:13px;">Temp password</td>
          <td style="padding:12px 16px;font-family:monospace;font-size:14px;font-weight:700;color:#b8891f;">${password}</td>
        </tr>
      </table>
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${APP_URL}/login" style="display:inline-block;padding:14px 32px;background:#e6ab35;color:#1d1c17;text-decoration:none;border-radius:10px;font-weight:800;font-size:15px;">
          Sign In Now →
        </a>
      </div>
      <p style="font-size:12px;color:#7a6a5a;text-align:center;margin:0;">
        We recommend changing your password after your first login.
      </p>
    </div>
    <div style="text-align:center;margin-top:28px;padding-top:16px;border-top:1px solid #e0d5c0;">
      <div style="font-size:11px;color:#7a6a5a;line-height:1.6;">
        ${PLATFORM.fullName}<br/>
        <a href="${PLATFORM.url}" style="color:#b8891f;text-decoration:none;">${PLATFORM.url}</a>
      </div>
    </div>
  </div>
</body>
</html>
        `,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, tenant_id: tenant.id, user_id: userId }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
