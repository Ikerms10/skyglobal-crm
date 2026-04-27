'use client'
import { useTenant } from '@/contexts/TenantContext'
import { addDays, differenceInDays, parseISO } from 'date-fns'

export function TrialBanner() {
  const { tenant, isLoading } = useTenant()

  if (isLoading || !tenant || tenant.status !== 'trial') return null

  const trialEnd = tenant.trial_ends_at
    ? parseISO(tenant.trial_ends_at)
    : tenant.created_at
      ? addDays(parseISO(tenant.created_at), 14)
      : null

  if (!trialEnd) return null

  const daysLeft = differenceInDays(trialEnd, new Date())
  const isExpired = daysLeft < 0
  const isUrgent = daysLeft <= 3

  const bg = isExpired || isUrgent ? '#B94A3A' : '#8B6914'
  const msg = isExpired
    ? 'Your trial has expired. Upgrade to continue using your CRM.'
    : daysLeft === 0
      ? 'Your trial expires today. Upgrade now to avoid losing access.'
      : `Trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Upgrade to keep full access.`

  return (
    <div style={{
      background: bg,
      color: '#fff',
      fontSize: 13,
      fontWeight: 600,
      textAlign: 'center',
      padding: '8px 16px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {msg}
    </div>
  )
}
