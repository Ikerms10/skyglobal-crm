import { cn } from '@/lib/utils'
import { LeadStage, LeadSource, ProjectStatus, PaymentStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-slate-700 text-slate-200',
    success: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    danger: 'bg-red-900/50 text-red-400',
    info: 'bg-sky-900/50 text-sky-400',
    purple: 'bg-purple-900/50 text-purple-400',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

export function StageBadge({ stage }: { stage: LeadStage }) {
  const config: Record<LeadStage, { label: string; variant: BadgeProps['variant'] }> = {
    'New Lead': { label: 'New Lead', variant: 'info' },
    'Estimate Sent': { label: 'Estimate Sent', variant: 'purple' },
    'Follow-up': { label: 'Follow-up', variant: 'warning' },
    'Negotiating': { label: 'Negotiating', variant: 'warning' },
    'Won': { label: 'Won', variant: 'success' },
    'Lost': { label: 'Lost', variant: 'danger' },
    'On Hold': { label: 'On Hold', variant: 'default' },
  }
  const { label, variant } = config[stage] ?? { label: stage, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

export function SourceBadge({ source }: { source: LeadSource }) {
  const colors: Record<LeadSource, string> = {
    Thumbtack: 'bg-orange-900/50 text-orange-400',
    Referral: 'bg-green-900/50 text-green-400',
    Google: 'bg-blue-900/50 text-blue-400',
    Instagram: 'bg-pink-900/50 text-pink-400',
    'Door Knock': 'bg-slate-700 text-slate-300',
    Facebook: 'bg-indigo-900/50 text-indigo-400',
    Yelp: 'bg-red-900/50 text-red-400',
    Other: 'bg-slate-700 text-slate-300',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', colors[source])}>
      {source}
    </span>
  )
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const config: Record<ProjectStatus, BadgeProps['variant']> = {
    Scheduled: 'info',
    'In Progress': 'warning',
    'On Hold': 'default',
    Completed: 'success',
    Cancelled: 'danger',
  }
  return <Badge variant={config[status]}>{status}</Badge>
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const config: Record<PaymentStatus, BadgeProps['variant']> = {
    Unpaid: 'danger',
    Partial: 'warning',
    Paid: 'success',
    Overdue: 'danger',
  }
  return <Badge variant={config[status]}>{status}</Badge>
}
