'use client'
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lead } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { format, isToday, isPast, parseISO, differenceInDays } from 'date-fns'
import { Phone } from 'lucide-react'

interface LeadCardProps {
  lead: Lead
  onClick: (lead: Lead) => void
  isDragOverlay?: boolean
  proposalValue?: number | null
  lastActivity?: string | null
}

const VALUE_TIER = (v: number) => {
  if (v >= 20000) return { color: '#8B6914', glow: 'rgba(139,105,20,0.20)', pulse: true }
  if (v >= 5000)  return { color: '#8B6914', glow: 'rgba(139,105,20,0.10)', pulse: false }
  return { color: '#7A9E7E', glow: 'rgba(122,158,126,0.12)', pulse: false }
}

const SOURCE_STYLES: Record<string, { bg: string; text: string }> = {
  Thumbtack:    { bg: 'rgba(212,168,83,0.15)',   text: '#D4A853' },
  Referral:     { bg: 'rgba(74,103,65,0.12)',    text: '#4A6741' },
  Google:       { bg: 'rgba(122,158,126,0.12)',  text: '#7A9E7E' },
  Instagram:    { bg: 'rgba(160,120,80,0.12)',   text: '#A07850' },
  Facebook:     { bg: 'rgba(122,158,126,0.12)',  text: '#7A9E7E' },
  'Door Knock': { bg: 'rgba(139,105,20,0.12)',   text: '#8B6914' },
  Yelp:         { bg: 'rgba(185,74,58,0.12)',    text: '#B94A3A' },
  Other:        { bg: 'rgba(160,120,80,0.10)',   text: '#A07850' },
}

function DaysInStagePill({ updatedAt, stage }: { updatedAt: string; stage: string }) {
  if (['Won', 'Lost'].includes(stage)) return null
  const days = differenceInDays(new Date(), new Date(updatedAt))

  let bg = 'rgba(122,158,126,0.12)'
  let color = '#7A9E7E'
  let suffix = ''

  if (days >= 15) {
    bg = 'rgba(185,74,58,0.12)'
    color = '#B94A3A'
    suffix = ' !'
  } else if (days >= 8) {
    bg = 'rgba(212,168,83,0.15)'
    color = '#D4A853'
    suffix = ' \u26A0'
  }

  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: 4,
      background: bg,
      color,
      fontFamily: "'DM Mono', monospace",
      border: `1px solid ${color}30`,
    }}>
      {days}d{suffix}
    </span>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#B94A3A', fontFamily: "'DM Mono', monospace" }}>
        <span style={{ fontSize: 8, letterSpacing: '0.1em' }}>OVERDUE</span>
        <span>{formatted}</span>
      </div>
    )
  }
  if (today) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#8B6914', fontFamily: "'DM Mono', monospace" }}>
        <span>Today</span>
      </div>
    )
  }
  return (
    <div style={{ fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
      {formatted}
    </div>
  )
}

export function LeadCard({ lead, onClick, isDragOverlay = false, proposalValue, lastActivity }: LeadCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  })

  const customer = lead.customer as { name?: string; phone?: string; type?: string } | null
  const srcStyle = SOURCE_STYLES[lead.source] ?? SOURCE_STYLES.Other
  const value = lead.estimated_value ?? 0
  const tier = VALUE_TIER(value)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeft: isHovered && !isDragging ? '3px solid #e6ab35' : `3px solid ${tier.color}`,
    boxShadow: isDragOverlay
      ? `0 12px 48px rgba(28,18,9,0.25), 0 0 20px ${tier.glow}`
      : 'none',
  }

  const cardStyle: React.CSSProperties = {
    background: isDragging ? 'var(--c-card-hover)' : 'var(--c-card)',
    border: '1px solid var(--c-border-light)',
    borderRadius: 10,
    padding: '12px 14px',
    cursor: 'pointer',
    opacity: isDragging ? 0.5 : 1,
    transform: isDragOverlay ? 'scale(1.02)' : undefined,
    transition: 'border-color 150ms, box-shadow 150ms, transform 150ms, background 150ms',
    boxShadow: 'var(--s-card)',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('group', isDragOverlay && 'shadow-lg')}
      {...attributes}
      {...listeners}
    >
      <div
        style={cardStyle}
        onClick={() => onClick(lead)}
        onMouseEnter={e => {
          if (isDragging || isDragOverlay) return
          setIsHovered(true)
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--c-border-mid)'
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = `var(--s-card-hover), 0 0 12px ${tier.glow}`
        }}
        onMouseLeave={e => {
          setIsHovered(false)
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'var(--c-border-light)'
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'var(--s-card)'
        }}
      >
        {/* Row 1: Title */}
        {customer?.name && (
          <p style={{
            color: 'var(--c-text-1)',
            fontSize: 14,
            fontWeight: 700,
            marginBottom: 2,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '-0.01em',
          }}>
            {customer.name}
          </p>
        )}
        <p style={{
          color: 'var(--c-text-4)',
          fontSize: 11,
          marginBottom: 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          {lead.title}
        </p>

        {/* Row 2: Value + Source */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
          {value > 0 ? (
            <span
              className={tier.pulse ? 'pulse-dot' : ''}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: tier.color,
                fontFamily: "'DM Mono', monospace",
                padding: '2px 8px',
                background: tier.glow,
                borderRadius: 6,
                border: `1px solid ${tier.color}30`,
              }}
            >
              {formatCurrency(value)}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>—</span>
          )}
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            background: srcStyle.bg,
            color: srcStyle.text,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            {lead.source}
          </span>
        </div>

        {/* Row 3: Phone */}
        {customer?.phone && (
          <a
            href={`tel:${customer.phone}`}
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              color: 'var(--c-text-3)',
              fontSize: 12,
              marginBottom: 8,
              textDecoration: 'none',
              fontFamily: "'DM Mono', monospace",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-sage-soft)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-text-3)' }}
          >
            <Phone size={11} aria-hidden="true" />
            {customer.phone}
          </a>
        )}

        {/* Row 3b: Proposal value + Last activity */}
        {(proposalValue !== undefined || lastActivity) && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
            {proposalValue !== undefined && (
              <span style={{ fontSize: 11, color: proposalValue ? 'var(--c-sage)' : 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
                {proposalValue ? `Proposal: ${formatCurrency(proposalValue)}` : 'No estimate'}
              </span>
            )}
            {lastActivity && (
              <span style={{ fontSize: 10, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}>
                Last: {lastActivity}
              </span>
            )}
          </div>
        )}

        {/* Row 4: Customer type + Days in stage */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(160,120,80,0.08)',
            color: 'var(--c-text-4)',
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {customer?.type ?? 'Residential'}
          </span>
          <DaysInStagePill updatedAt={lead.updated_at} stage={lead.stage} />
        </div>

        {/* Row 5: Follow-up date */}
        {lead.follow_up_date && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--c-border-light)' }}>
            <FollowUpRow date={lead.follow_up_date} stage={lead.stage} />
          </div>
        )}
      </div>
    </div>
  )
}
