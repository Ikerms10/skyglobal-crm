import { cn } from '@/lib/utils'
import { LeadStage, LeadSource, ProjectStatus, PaymentStatus } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-[#2e2d26] text-[#efeae2]',
    success: 'bg-[#e6ab35] text-[#1d1c17]',
    warning: 'bg-[#e6ab35]/20 text-[#e6ab35]',
    danger: 'bg-[#ef4444]/20 text-[#ef4444]',
    info: 'bg-[#3583b3] text-white',
    purple: 'bg-[#3583b3]/20 text-[#3583b3]',
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
    'Estimate Sent': { label: 'Estimate Sent', variant: 'warning' },
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
    Thumbtack: 'bg-orange-900/30 text-orange-400',
    Referral: 'bg-[#e6ab35]/20 text-[#e6ab35]',
    Google: 'bg-[#3583b3]/20 text-[#3583b3]',
    Instagram: 'bg-pink-900/30 text-pink-400',
    'Door Knock': 'bg-[#2e2d26] text-[#efeae2]',
    Facebook: 'bg-[#3583b3]/20 text-[#3583b3]',
    Yelp: 'bg-[#ef4444]/20 text-[#ef4444]',
    Other: 'bg-[#2e2d26] text-[#efeae2]',
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
