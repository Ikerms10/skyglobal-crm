'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lead } from '@/types'
import { SourceBadge } from '@/components/ui/Badge'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Calendar, DollarSign, User, GripVertical } from 'lucide-react'
import { format } from 'date-fns'

interface LeadCardProps {
  lead: Lead
  onClick: (lead: Lead) => void
  isDragOverlay?: boolean
}

const STAGE_BORDER_COLORS: Record<string, string> = {
  'New Lead': 'border-l-[#3583b3]',
  'Estimate Sent': 'border-l-[#e6ab35]',
  'Follow-up': 'border-l-[#e6ab35]',
  'Negotiating': 'border-l-[#e6ab35]',
  'Won': 'border-l-[#e6ab35]',
  'Lost': 'border-l-[#ef4444]',
  'On Hold': 'border-l-[#9a9585]',
}

export function LeadCard({ lead, onClick, isDragOverlay = false }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const isOverdue = lead.follow_up_date && lead.follow_up_date < today && !['Won', 'Lost'].includes(lead.stage)
  const isDueToday = lead.follow_up_date && lead.follow_up_date === today
  const customer = lead.customer as { name?: string } | null
  const borderColor = STAGE_BORDER_COLORS[lead.stage] ?? 'border-l-[#9a9585]'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-[#1d1c17] border-l-4 border border-[#2e2d26] rounded-lg p-3 cursor-pointer',
        'hover:border-[#e6ab35]/40 hover:shadow-lg transition-all group',
        borderColor,
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-2xl rotate-2 scale-105 border-[#e6ab35]',
      )}
      onClick={() => onClick(lead)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#efeae2] group-hover:text-[#e6ab35] transition-colors line-clamp-2 flex-1">
          {lead.title}
        </p>
        <div
          {...attributes}
          {...listeners}
          className="text-[#2e2d26] hover:text-[#9a9585] cursor-grab active:cursor-grabbing p-0.5 -mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {customer?.name && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-[#9a9585]" />
            <span className="text-xs text-[#9a9585]">{customer.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <SourceBadge source={lead.source} />
          {(lead.estimated_value ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-[#e6ab35]" />
              <span className="text-xs font-medium text-[#e6ab35]">{formatCurrency(lead.estimated_value ?? 0)}</span>
            </div>
          )}
        </div>

        {lead.follow_up_date && (
          <div className={cn(
            'flex items-center gap-1',
            isOverdue ? 'text-[#ef4444]' : isDueToday ? 'text-[#e6ab35]' : 'text-[#9a9585]',
          )}>
            <Calendar className="h-3 w-3" />
            <span className="text-xs">
              {isOverdue ? 'Overdue: ' : isDueToday ? 'Today: ' : ''}
              {formatDate(lead.follow_up_date)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
