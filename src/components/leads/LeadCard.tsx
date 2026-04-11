'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lead } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { format, isToday, isPast, parseISO, differenceInDays } from 'date-fns'

interface LeadCardProps {
  lead: Lead
  onClick: (lead: Lead) => void
  isDragOverlay?: boolean
}

const STAGE_BORDER: Record<string, string> = {
  'New Lead':      '#3583b3',
  'Estimate Sent': '#e6ab35',
  'Follow-up':     '#bf5af2',
  'Won':           '#30d158',
  'Lost':          '#ff453a',
  'On Hold':       '#6e6e73',
}

const SOURCE_STYLES: Record<string, { bg: string; text: string }> = {
  Thumbtack:    { bg: '#3583b3', text: '#fff' },
  Referral:     { bg: '#10b981', text: '#fff' },
  Google:       { bg: '#e6ab35', text: '#1d1c17' },
  Instagram:    { bg: '#8b5cf6', text: '#fff' },
  Facebook:     { bg: '#1877f2', text: '#fff' },
  'Door Knock': { bg: '#f97316', text: '#fff' },
  Yelp:         { bg: '#ef4444', text: '#fff' },
  Other:        { bg: '#9a9585', text: '#fff' },
}

function DaysInStageBadge({ updatedAt }: { updatedAt: string }) {
  const days = differenceInDays(new Date(), new Date(updatedAt))
  const color = days > 7 ? '#ef4444' : days >= 3 ? '#e6ab35' : '#9a9585'
  return (
    <span style={{ color, fontSize: 11, fontWeight: 600 }}>{days}d</span>
  )
}

function FollowUpRow({ date, stage }: { date: string; stage: string }) {
  if (['Won', 'Lost'].includes(stage)) return null
  const parsed = parseISO(date)
  const past = isPast(parsed) && !isToday(parsed)
  const today = isToday(parsed)
  const formatted = format(parsed, 'MMM d')

  if (past) {
    return (
      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#ef4444]">
        <span>📅</span>
        <span>OVERDUE · {formatted}</span>
      </div>
    )
  }
  if (today) {
    return (
      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#e6ab35]">
        <span>📅</span>
        <span>Today</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 text-[11px] text-[#9a9585]">
      <span>📅</span>
      <span>{formatted}</span>
    </div>
  )
}

export function LeadCard({ lead, onClick, isDragOverlay = false }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: `3px solid ${STAGE_BORDER[lead.stage] ?? '#9a9585'}`,
  }

  const customer = lead.customer as { name?: string; phone?: string } | null
  const srcStyle = SOURCE_STYLES[lead.source] ?? SOURCE_STYLES.Other

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-[#252419] border border-[#2e2d26] rounded-lg p-3 cursor-pointer transition-all',
        'hover:bg-[#2a2920] hover:shadow-lg',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-2xl rotate-1 scale-105',
      )}
      onClick={() => onClick(lead)}
      {...attributes}
      {...listeners}
    >
      {/* Row 1: Source badge + Value */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span style={{
          backgroundColor: srcStyle.bg,
          color: srcStyle.text,
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 4,
          lineHeight: '16px',
          whiteSpace: 'nowrap',
        }}>
          {lead.source}
        </span>
        {(lead.estimated_value ?? 0) > 0 ? (
          <span style={{ color: '#e6ab35', fontWeight: 700, fontSize: 13 }}>
            {formatCurrency(lead.estimated_value ?? 0)}
          </span>
        ) : (
          <span style={{ color: '#9a9585', fontSize: 11 }}>No estimate</span>
        )}
      </div>

      {/* Row 2: Customer name */}
      {customer?.name && (
        <p style={{ color: '#ffffff', fontSize: 15, fontWeight: 700, marginBottom: 2, lineHeight: '1.2' }}>
          {customer.name}
        </p>
      )}

      {/* Row 3: Job title */}
      <p style={{ color: '#9a9585', fontSize: 12, marginBottom: 4 }} className="truncate">
        {lead.title}
      </p>

      {/* Row 4: Phone */}
      {customer?.phone && (
        <a
          href={`tel:${customer.phone}`}
          onClick={e => e.stopPropagation()}
          style={{ color: '#efeae2', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}
        >
          <span>📞</span>
          <span>{customer.phone}</span>
        </a>
      )}

      {/* Row 5: Job type + Days in stage */}
      <div className="flex items-center justify-between mt-1">
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 4,
          backgroundColor: lead.stage === 'Won' ? '#10b981' : '#3583b3',
          color: '#fff',
        }}>
          {(lead as any).customer?.type ?? 'Residential'}
        </span>
        <DaysInStageBadge updatedAt={lead.updated_at} />
      </div>

      {/* Row 6: Follow-up date */}
      {lead.follow_up_date && (
        <div className="mt-1.5">
          <FollowUpRow date={lead.follow_up_date} stage={lead.stage} />
        </div>
      )}
    </div>
  )
}
