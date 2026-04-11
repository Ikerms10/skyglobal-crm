import { cn } from '@/lib/utils'
import { LeadStage, LeadSource, ProjectStatus, PaymentStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gold'
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, React.CSSProperties> = {
  default:  { background: 'var(--bg-elevated, #3a3a3c)', color: 'var(--text-secondary)' },
  success:  { background: 'var(--success-light)', color: 'var(--success)' },
  warning:  { background: 'var(--warning-light)', color: 'var(--warning)' },
  danger:   { background: 'var(--error-light)', color: 'var(--error)' },
  info:     { background: 'var(--blue-light)', color: 'var(--blue)' },
  gold:     { background: 'var(--gold-light)', color: 'var(--gold)' },
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center', className)}
      style={{
        ...variantStyles[variant],
        borderRadius: 6,
        padding: '3px 8px',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

export function StageBadge({ stage }: { stage: LeadStage }) {
  const stageStyles: Record<LeadStage, React.CSSProperties> = {
    'New Lead':      { background: 'rgba(53,131,179,0.15)',  color: '#3583b3' },
    'Estimate Sent': { background: 'rgba(230,171,53,0.15)',  color: '#e6ab35' },
    'Follow-up':     { background: 'rgba(191,90,242,0.15)',  color: '#bf5af2' },
    'Won':           { background: 'rgba(48,209,88,0.15)',   color: '#30d158' },
    'Lost':          { background: 'rgba(255,69,58,0.15)',   color: '#ff453a' },
    'On Hold':       { background: 'rgba(239,234,226,0.10)', color: '#9a9585' },
  }
  const style = stageStyles[stage] ?? stageStyles['On Hold']
  return (
    <span style={{ ...style, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {stage}
    </span>
  )
}

export function SourceBadge({ source }: { source: LeadSource }) {
  const styles: Record<LeadSource, React.CSSProperties> = {
    Thumbtack:   { background: 'rgba(234,88,12,0.12)', color: '#ea580c' },
    Referral:    { background: 'var(--gold-light)', color: 'var(--gold)' },
    Google:      { background: 'var(--blue-light)', color: 'var(--blue)' },
    Instagram:   { background: 'rgba(219,39,119,0.10)', color: '#db2777' },
    'Door Knock':{ background: 'var(--bg-elevated, #3a3a3c)', color: 'var(--text-secondary)' },
    Facebook:    { background: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    Yelp:        { background: 'var(--error-light)', color: 'var(--error)' },
    Other:       { background: 'var(--bg-elevated, #3a3a3c)', color: 'var(--text-secondary)' },
  }
  return (
    <span style={{ ...styles[source] ?? styles.Other, borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
      {source}
    </span>
  )
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, BadgeProps['variant']> = {
    Scheduled:    'info',
    'In Progress': 'warning',
    'On Hold':    'default',
    Completed:    'success',
    Cancelled:    'danger',
  }
  return <Badge variant={config[status]}>{status}</Badge>
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config: Record<PaymentStatus, BadgeProps['variant']> = {
    Unpaid:  'danger',
    Partial: 'warning',
    Paid:    'success',
    Overdue: 'danger',
  }
  return <Badge variant={config[status]}>{status}</Badge>
}
