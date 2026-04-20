'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'

const SEEN_KEY = 'sg_seen_notifications'

function getSeenIds(): Set<string> {
  try { return new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')) } catch { return new Set<string>() }
}

function saveSeenIds(ids: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(ids))) } catch {}
}

interface NotifData {
  followUps: { id: string; title: string; follow_up_date: string; customerName: string }[]
  payments: { id: string; title: string; balance: number; payment_status: string; customer_id: string }[]
  pastDue: { id: string; title: string; end_date: string; customer_id: string; customerName: string }[]
}

const sectionHeader: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--c-text-3)',
  padding: '8px 16px 4px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontFamily: "'DM Mono', monospace",
  background: 'var(--c-nested)',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotifData>({ followUps: [], payments: [], pastDue: [] })
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date().toISOString().split('T')[0]

      const [fu, pay, pd] = await Promise.all([
        supabase.from('leads')
          .select('id, title, follow_up_date, customers(name)')
          .eq('user_id', user.id)
          .lt('follow_up_date', today)
          .not('stage', 'in', '("Won","Lost")')
          .is('deleted_at', null)
          .order('follow_up_date', { ascending: true })
          .limit(10),
        supabase.from('projects')
          .select('id, title, contract_value, amount_paid, payment_status, customer_id, customers(name)')
          .eq('user_id', user.id)
          .or('payment_status.eq.Overdue')
          .is('deleted_at', null)
          .limit(10),
        supabase.from('projects')
          .select('id, title, end_date, customer_id, customers(name)')
          .eq('user_id', user.id)
          .lt('end_date', today)
          .not('status', 'in', '("Completed","Cancelled")')
          .is('deleted_at', null)
          .limit(10),
      ])

      setData({
        followUps: (fu.data ?? []).map((l: any) => ({
          id: `fu-${l.id}`, title: l.title, follow_up_date: l.follow_up_date,
          customerName: l.customers?.name ?? '',
        })),
        payments: (pay.data ?? []).map((p: any) => ({
          id: `pay-${p.id}`, title: p.title,
          balance: (p.contract_value ?? 0) - (p.amount_paid ?? 0),
          payment_status: p.payment_status, customer_id: p.customer_id,
        })),
        pastDue: (pd.data ?? []).map((p: any) => ({
          id: `pd-${p.id}`, title: p.title, end_date: p.end_date,
          customer_id: p.customer_id, customerName: p.customers?.name ?? '',
        })),
      })
    } catch {}
  }

  useEffect(() => {
    setSeen(getSeenIds())
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allIds = [
    ...data.followUps.map(x => x.id),
    ...data.payments.map(x => x.id),
    ...data.pastDue.map(x => x.id),
  ]
  const unseenCount = allIds.filter(id => !seen.has(id)).length

  const markAllRead = () => {
    const next = new Set<string>(Array.from(seen).concat(allIds))
    setSeen(next)
    saveSeenIds(next)
  }

  const handleNavigate = (href: string, id: string) => {
    const next = new Set<string>(Array.from(seen).concat([id]))
    setSeen(next)
    saveSeenIds(next)
    router.push(href)
    setOpen(false)
  }

  const isEmpty = allIds.length === 0

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'relative',
          padding: 8,
          color: 'var(--c-text-3)',
          background: 'var(--c-nested)',
          border: '1px solid var(--c-border)',
          cursor: 'pointer',
          borderRadius: 'var(--r-sm)',
          transition: 'background 150ms, border-color 150ms, color 150ms',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-sidebar-hover)'; e.currentTarget.style.borderColor = 'var(--c-border-mid)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-nested)'; e.currentTarget.style.borderColor = 'var(--c-border)' }}
        aria-label={`Notifications${unseenCount > 0 ? `, ${unseenCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell size={18} aria-hidden="true" />
        {unseenCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              height: 16,
              width: 16,
              background: 'var(--c-danger)',
              borderRadius: '50%',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'DM Mono', monospace",
              animation: 'notif-pulse 2s ease-in-out infinite',
              border: '2px solid var(--c-card)',
            }}
            aria-hidden="true"
          >
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 360,
            background: 'var(--c-card)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-md)',
            zIndex: 50,
            overflow: 'hidden',
            boxShadow: 'var(--s-modal)',
          }}
        >
          {/* Top accent */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, var(--c-sage-soft), transparent)' }} aria-hidden="true" />

          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--c-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--c-text-1)',
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: '-0.01em',
              }}>
                Notifications
              </h3>
              {unseenCount > 0 && (
                <span style={{
                  background: 'var(--c-danger)',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 10,
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {unseenCount}
                </span>
              )}
            </div>
            {allIds.length > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontSize: 11,
                  color: 'var(--c-sage)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: '0.04em',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {isEmpty ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', gap: 8 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(74,103,65,0.12)',
                  border: '1px solid rgba(74,103,65,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={22} style={{ color: 'var(--c-sage)' }} aria-hidden="true" />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-1)', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  All clear
                </p>
                <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: 0, fontFamily: "'DM Mono', monospace" }}>No overdue items</p>
              </div>
            ) : (
              <>
                {data.followUps.length > 0 && (
                  <div>
                    <span style={sectionHeader}>Overdue Follow-ups</span>
                    {data.followUps.map(item => {
                      const days = differenceInDays(new Date(), parseISO(item.follow_up_date))
                      const isSeen = seen.has(item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate('/leads', item.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '10px 16px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--c-border)',
                            cursor: 'pointer',
                            opacity: isSeen ? 0.45 : 1,
                            transition: 'background 100ms, opacity 100ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-nested)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: '1px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.customerName}</p>
                            <p style={{ fontSize: 10, color: 'var(--c-danger)', marginTop: 2, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{days}d overdue</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {data.payments.length > 0 && (
                  <div>
                    <span style={sectionHeader}>Payment Due</span>
                    {data.payments.map(item => {
                      const isSeen = seen.has(item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(`/customers/${item.customer_id}`, item.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '10px 16px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--c-border)',
                            cursor: 'pointer',
                            opacity: isSeen ? 0.45 : 1,
                            transition: 'background 100ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-nested)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--c-gold)', marginTop: 1, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                              Balance: {formatCurrency(item.balance)}
                            </p>
                            <span style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: 'rgba(185,74,58,0.12)',
                              color: 'var(--c-danger)',
                              fontFamily: "'DM Mono', monospace",
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                            }}>
                              {item.payment_status}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {data.pastDue.length > 0 && (
                  <div>
                    <span style={sectionHeader}>Past End Date</span>
                    {data.pastDue.map(item => {
                      const days = differenceInDays(new Date(), parseISO(item.end_date))
                      const isSeen = seen.has(item.id)
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(`/customers/${item.customer_id}`, item.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '10px 16px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: '1px solid var(--c-border)',
                            cursor: 'pointer',
                            opacity: isSeen ? 0.45 : 1,
                            transition: 'background 100ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-nested)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--c-text-3)', margin: '1px 0 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{item.customerName}</p>
                            <p style={{ fontSize: 10, color: 'var(--c-danger)', marginTop: 2, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{days}d past due</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
