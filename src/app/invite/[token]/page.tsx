import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { InviteSignupForm } from './InviteSignupForm'

interface Props {
  params: { token: string }
}

export default async function InvitePage({ params }: Props) {
  const db = createServiceClient()
  const { data: invite } = await db
    .from('invites')
    .select('id, email, tenant_id, role, expires_at, accepted_at, tenants(business_name)')
    .eq('token', params.token)
    .single()

  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    redirect('/login?error=invite_invalid')
  }

  const businessName = (invite.tenants as any)?.business_name ?? ''
  const isNewBusiness = !businessName || businessName === 'Pending Setup'

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--c-canvas)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      {/* Brand */}
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.04em', margin: 0 }}>
          SkyGlobal CRM
        </p>
        <p style={{ fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", margin: '5px 0 0' }}>
          {isNewBusiness
            ? "You've been invited — set up your account below"
            : <>You've been invited to join <strong style={{ color: 'var(--c-gold)' }}>{businessName}</strong></>
          }
        </p>
      </div>

      <InviteSignupForm
        inviteId={invite.id}
        tenantId={invite.tenant_id}
        prefillEmail={invite.email}
        role={invite.role}
      />
    </div>
  )
}
