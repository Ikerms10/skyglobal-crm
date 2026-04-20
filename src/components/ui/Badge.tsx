import { cn } from '@/lib/utils'
import { LeadStage, LeadSource, ProjectStatus, PaymentStatus } from '@/types'

const variantStyles: Record<string, string> = {
  success: 'bg-[var(--c-sage-bg)] text-[var(--c-sage)] border border-[var(--c-sage-border)]',
  info:    'bg-[rgba(122,158,126,0.10)] text-[var(--c-sage-soft)] border border-[rgba(122,158,126,0.20)]',
  warning: 'bg-[var(--c-warning-bg)] text-[var(--c-gold)] border border-[var(--c-warning-border)]',
  error:   'bg-[var(--c-danger-bg)] text-[var(--c-danger)] border border-[var(--c-danger-border)]',
  danger:  'bg-[var(--c-danger-bg)] text-[var(--c-danger)] border border-[var(--c-danger-border)]',
  purple:  'bg-[rgba(160,120,80,0.12)] text-[var(--c-text-4)] border border-[rgba(160,120,80,0.20)]',
  muted:   'bg-[var(--c-nested)] text-[var(--c-text-4)] border border-[var(--c-border)]',
  gold:    'bg-[var(--c-gold-bg)] text-[var(--c-gold)] border border-[var(--c-gold-border)]',
  // Legacy alias
  default: 'bg-[var(--c-nested)] text-[var(--c-text-4)] border border-[var(--c-border)]',
}

function statusToVariant(status: string): string {
  const s = status.toLowerCase()
  if (['completed', 'won', 'paid', 'active'].some(x => s.includes(x)))              return 'success'
  if (['in progress', 'scheduled', 'partial', 'estimate sent'].some(x => s.includes(x))) return 'warning'
  if (['overdue', 'lost', 'cancelled', 'failed'].some(x => s.includes(x)))          return 'error'
  if (['on hold', 'inactive'].some(x => s.includes(x)))                              return 'muted'
  if (['new lead', 'follow-up', 'unpaid'].some(x => s.includes(x)))                 return 'info'
  return 'muted'
}

interface BadgeProps {
  variant?: keyof typeof variantStyles
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-[10px] py-[3px] text-[11px]',
        variantStyles[variant] ?? variantStyles.muted,
        className,
      )}
      style={{ fontFamily: "'DM Mono', monospace" }}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={statusToVariant(status) as keyof typeof variantStyles} className={className}>
      {status}
    </Badge>
  )
}

export function PaymentBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant={statusToVariant(status) as keyof typeof variantStyles} className={className}>
      {status}
    </Badge>
  )
}

// ── Preserved specialized badges — callers import these directly ──────────

export function StageBadge({ stage }: { stage: LeadStage }) {
  const stageVariant: Record<LeadStage, keyof typeof variantStyles> = {
    'New Lead':      'info',
    'Estimate Sent': 'warning',
    'Follow-up':     'purple',
    'Won':           'success',
    'Lost':          'error',
    'On Hold':       'muted',
  }
  return <Badge variant={stageVariant[stage] ?? 'muted'}>{stage}</Badge>
}

export function SourceBadge({ source }: { source: LeadSource }) {
  const sourceVariant: Record<LeadSource, keyof typeof variantStyles> = {
    Thumbtack:    'warning',
    Referral:     'success',
    Google:       'info',
    Instagram:    'purple',
    'Door Knock': 'gold',
    Facebook:     'info',
    Yelp:         'error',
    Other:        'muted',
  }
  return <Badge variant={sourceVariant[source] ?? 'muted'}>{source}</Badge>
}

function projectStatusVariant(s: ProjectStatus): keyof typeof variantStyles {
  const map: Record<ProjectStatus, keyof typeof variantStyles> = {
    Scheduled:     'info',
    'In Progress': 'warning',
    'On Hold':     'muted',
    Completed:     'success',
    Cancelled:     'error',
  }
  return map[s] ?? 'muted'
}

function paymentStatusVariant(s: PaymentStatus): keyof typeof variantStyles {
  const map: Record<PaymentStatus, keyof typeof variantStyles> = {
    Unpaid:  'error',
    Partial: 'warning',
    Paid:    'success',
    Overdue: 'error',
  }
  return map[s] ?? 'muted'
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={projectStatusVariant(status)}>{status}</Badge>
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={paymentStatusVariant(status)}>{status}</Badge>
}
