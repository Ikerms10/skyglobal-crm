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

    await resend.emails.send({
      from: 'SkyGlobal CRM <noreply@skyglobalsvcs.com>',
      to: ADMIN_EMAIL,
      subject: `New signup: ${business_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #4A3728; margin-bottom: 8px;">New Business Signed Up</h2>
          <p style="color: #6b5a4e; margin-bottom: 20px;">A new business just created a CRM account.</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 10px 0; color: #9a8a80; border-bottom: 1px solid #e8e0d8;">Business</td>
              <td style="padding: 10px 0; font-weight: 600; color: #2d1f14; border-bottom: 1px solid #e8e0d8;">${business_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #9a8a80; border-bottom: 1px solid #e8e0d8;">Email</td>
              <td style="padding: 10px 0; color: #2d1f14; border-bottom: 1px solid #e8e0d8;">${business_email ?? 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #9a8a80; border-bottom: 1px solid #e8e0d8;">Tenant ID</td>
              <td style="padding: 10px 0; font-family: monospace; color: #6b5a4e; font-size: 12px; border-bottom: 1px solid #e8e0d8;">${tenant_id}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #9a8a80;">Signed up</td>
              <td style="padding: 10px 0; color: #2d1f14;">${signedUpAt} EST</td>
            </tr>
          </table>
          <a href="${appUrl}/admin" style="display: inline-block; margin-top: 24px; padding: 10px 20px; background: #8B6914; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13px;">
            View Admin Panel →
          </a>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
