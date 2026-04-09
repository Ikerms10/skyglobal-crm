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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 cursor-pointer',
        'hover:border-sky-500/40 hover:shadow-lg transition-all group',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-2xl rotate-2 scale-105 border-sky-500',
      )}
      onClick={() => onClick(lead)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white group-hover:text-sky-400 transition-colors line-clamp-2 flex-1">
          {lead.title}
        </p>
        <div
          {...attributes}
          {...listeners}
          className="text-[#2a2d3a] hover:text-slate-400 cursor-grab active:cursor-grabbing p-0.5 -mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {customer?.name && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-slate-500" />
            <span className="text-xs text-slate-400">{customer.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <SourceBadge source={lead.source} />
          {(lead.estimated_value ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-400" />
              <span className="text-xs font-medium text-green-400">{formatCurrency(lead.estimated_value ?? 0)}</span>
            </div>
          )}
        </div>

        {lead.follow_up_date && (
          <div className={cn(
            'flex items-center gap-1',
            isOverdue ? 'text-red-400' : isDueToday ? 'text-amber-400' : 'text-slate-500',
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
