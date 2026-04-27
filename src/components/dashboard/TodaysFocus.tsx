'use client'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Zap, MessageCircle, FileText, Briefcase, DollarSign, RefreshCw, Loader2 } from 'lucide-react'

import { getTodaysFocusItems, FocusItem } from '@/lib/todaysFocus'
import { formatCurrency } from '@/lib/utils'

const TYPE_ICON: Record<FocusItem['type'], React.ElementType> = {
  follow_up: MessageCircle,
  proposal_check: FileText,
  job_starting: Briefcase,
  collect_payment: DollarSign,
}

const PRIORITY_DOT: Record<FocusItem['priority'], string> = {
  high: 'var(--c-danger)',
  medium: 'var(--c-gold)',
  low: 'var(--c-text-4)',
}

export function TodaysFocus() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: items = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['focus'],
    queryFn: getTodaysFocusItems,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  })

  const visible = items.slice(0, 4)
  const hasMore = items.length > 4

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={15} style={{ color: 'var(--c-gold)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
            Today's Focus
          </span>
          {items.length > 0 && (
            <span className="pulse-dot" style={{ fontSize: 10, fontWeight: 700, background: 'var(--c-danger)', color: '#fff', padding: '1px 6px', borderRadius: 10, fontFamily: "'DM Mono', monospace", display: 'inline-block' }}>
              {items.length}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--c-text-3)', padding: 4, display: 'flex', alignItems: 'center' }}
          title="Refresh"
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--c-gold)' }} />
          <span style={{ fontSize: 13, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <p className="float-anim" style={{ margin: 0, fontSize: 28, lineHeight: 1 }}>🎉</p>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--c-sage)', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            You're all caught up
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>
            No immediate actions needed
          </p>
        </div>
      ) : (
        <>
          <div className="today-focus-grid">
            {visible.map((item, idx) => {
              const Icon = TYPE_ICON[item.type]
              return (
                <div
                  key={item.id}
                  className={`animate-fade-up stagger-${Math.min(idx + 1, 6)}`}
                  style={{
                    background: 'var(--c-card)',
                    border: '1px solid var(--c-border)',
                    borderRadius: 10,
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    cursor: 'pointer',
                    transition: 'border-color 150ms, box-shadow 200ms, transform 200ms cubic-bezier(0.34,1.3,0.64,1)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--c-gold-border)'
                    e.currentTarget.style.boxShadow = '0 4px 16px var(--c-gold-shadow)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--c-border)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                  onClick={() => router.push(item.actionRoute)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_DOT[item.priority], flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.title}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", lineHeight: 1.4 }}>
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon size={12} style={{ color: 'var(--c-text-3)' }} />
                      <button
                        onClick={e => { e.stopPropagation(); router.push(item.actionRoute) }}
                        style={{ fontSize: 11, color: 'var(--c-gold)', background: 'none', border: '1px solid var(--c-gold-border)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}
                      >
                        {item.actionLabel}
                      </button>
                    </div>
                    {item.amount != null && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-gold)', fontFamily: "'DM Mono', monospace" }}>
                        {formatCurrency(item.amount)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {hasMore && (
            <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", textAlign: 'right' }}>
              +{items.length - 4} more items
            </p>
          )}
        </>
      )}
    </div>
  )
}
