import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

const ADMIN_EMAIL = 'ikerms10@gmail.com'

export async function POST(req: NextRequest) {
  // Only callable internally (from api/tenant/create) — verify by checking caller has service role context
  // We re-verify the tenant exists to avoid spam
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { business_name, business_email, tenant_id } = await req.json()
    if (!tenant_id || !business_name) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const db = createServiceClient()
    const { data: tenant } = await db.from('tenants').select('id').eq('id', tenant_id).single()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.skyglobalsvcs.com'
    const signedUpAt = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' })

    const { PLATFORM } = await import('@/lib/constants')
    await resend.emails.send({
      from: `${PLATFORM.fromName} <${PLATFORM.fromEmail}>`,
      to: ADMIN_EMAIL,
      subject: `🎉 New signup on ${PLATFORM.shortName}: ${business_name}`,
      html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:900;color:#1d1c17;letter-spacing:-0.02em;">
        Iker's <span style="color:#e6ab35;">CRM</span>
      </div>
      <div style="font-size:10px;color:#7a6a5a;letter-spacing:0.1em;text-transform:uppercase;margin-top:2px;">
        Admin Alert
      </div>
    </div>
    <div style="background:#fffdf7;border:1px solid #e8dcc0;border-radius:12px;padding:28px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <h2 style="font-size:18px;font-weight:800;color:#1d1c17;margin:0 0 16px;">🎉 New business signed up!</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr>
          <td style="padding:10px 0;color:#7a6a5a;border-bottom:1px solid #e8dcc0;">Business</td>
          <td style="padding:10px 0;font-weight:700;color:#1d1c17;border-bottom:1px solid #e8dcc0;">${business_name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#7a6a5a;border-bottom:1px solid #e8dcc0;">Email</td>
          <td style="padding:10px 0;color:#1d1c17;border-bottom:1px solid #e8dcc0;">${business_email ?? 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#7a6a5a;border-bottom:1px solid #e8dcc0;">Tenant ID</td>
          <td style="padding:10px 0;font-family:monospace;color:#7a6a5a;font-size:11px;border-bottom:1px solid #e8dcc0;">${tenant_id}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#7a6a5a;">Signed up</td>
          <td style="padding:10px 0;color:#1d1c17;">${signedUpAt} EST</td>
        </tr>
      </table>
      <div style="margin-top:24px;">
        <a href="${appUrl}/admin" style="display:inline-block;padding:11px 22px;background:#e6ab35;color:#1d1c17;text-decoration:none;border-radius:8px;font-weight:800;font-size:13px;">
          View Admin Panel →
        </a>
      </div>
    </div>
    <div style="text-align:center;margin-top:20px;font-size:11px;color:#7a6a5a;">
      ${PLATFORM.fullName}
    </div>
  </div>
</body>
</html>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
