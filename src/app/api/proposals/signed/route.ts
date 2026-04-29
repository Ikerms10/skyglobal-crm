import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const CRM_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://skyglobalsvcs.com'
  let body: { token: string; signatureBase64: string; clientIp?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { token, signatureBase64, clientIp } = body
  if (!token || !signatureBase64) {
    return NextResponse.json({ error: 'token and signatureBase64 required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Load the proposal
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('share_token', token)
    .is('deleted_at', null)
    .single()

  if (error || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }

  if (proposal.signed_at) {
    return NextResponse.json({ error: 'Already signed' }, { status: 409 })
  }

  const signedAt = new Date().toISOString()

  // Save signature
  const { error: updateErr } = await supabase
    .from('proposals')
    .update({
      status: 'Accepted',
      signed_at: signedAt,
      client_signature: signatureBase64,
      client_ip: clientIp ?? req.headers.get('x-forwarded-for') ?? 'unknown',
    })
    .eq('share_token', token)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })
  }

  // Run the full approval automation: customer + project creation + lead Won
  // Only runs if proposal has a tenant_id (multi-tenant flow); older single-tenant proposals skip silently
  if (proposal.tenant_id) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await fetch(`${baseUrl}/api/proposals/process-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId: proposal.id, tenantId: proposal.tenant_id }),
    }).catch(() => {
      // Non-critical — signature is already saved; project creation failure is logged server-side
    })
  } else if (proposal.customer_id) {
    // Legacy single-tenant fallback: update lead stage via customer_id
    await supabase
      .from('leads')
      .update({ stage: 'Won' })
      .eq('customer_id', proposal.customer_id)
      .not('stage', 'in', '("Won","Lost")')
  }

  // Notification for the owner (legacy path — process-approval handles it for tenant flow)
  const ownerId = proposal.user_id
  const amount = proposal.total_investment ?? 0

  if (!proposal.tenant_id) {
    await supabase.from('notifications').insert({
      user_id: ownerId,
      type: 'proposal_signed',
      title: '🎉 Proposal Signed!',
      body: `${proposal.client_name ?? 'Client'} approved the ${amount > 0 ? `$${amount.toLocaleString()}` : ''} proposal`,
      resource_type: 'proposal',
      resource_id: proposal.id,
      action_url: `/proposals/new?template=${proposal.template}&id=${proposal.id}`,
      icon: 'file-check',
    })
  }

  // Send email via Resend
  if (process.env.RESEND_API_KEY) {
    const signedDate = new Date(signedAt).toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
    const proposalLink = `${CRM_URL}/proposals/new?template=${proposal.template}&id=${proposal.id}`
    // Fetch tenant email if available for the notification recipient
    let toAddresses = ['ikerms10@gmail.com', 'skyglobalsvcs@gmail.com']
    if (proposal.tenant_id) {
      const { data: tenantRow } = await supabase
        .from('tenants')
        .select('business_email, business_name')
        .eq('id', proposal.tenant_id)
        .single()
      if (tenantRow?.business_email) toAddresses = [tenantRow.business_email]
    }
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #1d1c17; padding: 24px 32px; border-radius: 8px 8px 0 0;">
          <span style="font-size: 22px; font-weight: 700; color: #e6ab35;">Proposal Signed</span>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="margin: 0 0 8px; color: #1a1a1a;">🎉 Proposal Signed!</h2>
          <p style="color: #4b5563; margin: 0 0 24px;">Great news — ${proposal.client_name ?? 'Your client'} has signed the proposal.</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Client</td>
              <td style="padding: 8px 0; font-weight: 600; font-size: 13px; border-bottom: 1px solid #f3f4f6; text-align: right;">${proposal.client_name ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Address</td>
              <td style="padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; text-align: right;">${proposal.client_address ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Amount</td>
              <td style="padding: 8px 0; font-weight: 700; font-size: 15px; color: #e6ab35; border-bottom: 1px solid #f3f4f6; text-align: right;">$${amount.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 13px;">Signed</td>
              <td style="padding: 8px 0; font-size: 13px; text-align: right;">${signedDate}</td>
            </tr>
          </table>
          <a href="${proposalLink}" style="display: inline-block; background: #e6ab35; color: #1d1c17; font-weight: 700; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px;">View in CRM →</a>
        </div>
      </div>
    `

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'CRM Notifications <notifications@skyglobalsvcs.com>',
      to: toAddresses,
      subject: `🎉 Proposal Signed — ${proposal.client_name ?? 'Client'}`,
      html: emailBody,
    }).catch(() => {
      // Email failure is non-critical — signature is already saved
    })
  }

  return NextResponse.json({ success: true })
}
