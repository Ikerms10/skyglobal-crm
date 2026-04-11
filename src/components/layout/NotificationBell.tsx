'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'

const SEEN_KEY = 'sg_seen_notifications'

function getSeenIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')) } catch { return new Set() }
}

function saveSeenIds(ids: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...ids])) } catch {}
}

interface NotifData {
  followUps: { id: string; title: string; follow_up_date: string; customerName: string }[]
  payments: { id: string; title: string; balance: number; payment_status: string; customer_id: string }[]
  pastDue: { id: string; title: string; end_date: string; customer_id: string; customerName: string }[]
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

  // Close on outside click
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
    const next = new Set([...seen, ...allIds])
    setSeen(next)
    saveSeenIds(next)
  }

  const handleNavigate = (href: string, id: string) => {
    const next = new Set([...seen, id])
    setSeen(next)
    saveSeenIds(next)
    router.push(href)
    setOpen(false)
  }

  const isEmpty = allIds.length === 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-[#9a9585] hover:text-[#efeae2] transition-colors rounded-lg hover:bg-[#2e2d26]"
      >
        <Bell className="h-5 w-5" />
        {unseenCount > 0 && (
          <span
            className="absolute top-1 right-1 h-4 w-4 bg-[#ef4444] rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ animation: 'notif-pulse 2s ease-in-out infinite' }}
          >
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      <style>{`
        @keyframes notif-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 bg-[#1d1c17] border border-[#2e2d26] rounded-xl z-50 overflow-hidden"
          style={{ width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2e2d26]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {unseenCount > 0 && (
                <span className="bg-[#ef4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unseenCount}</span>
              )}
            </div>
            {allIds.length > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#9a9585] hover:text-[#efeae2] transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="h-12 w-12 rounded-full bg-[#10b981]/15 flex items-center justify-center">
                  <Check className="h-6 w-6 text-[#10b981]" />
                </div>
                <p className="text-sm font-semibold text-[#efeae2]">You&apos;re all caught up!</p>
                <p className="text-xs text-[#9a9585]">No overdue items right now</p>
              </div>
            ) : (
              <>
                {/* Overdue follow-ups */}
                {data.followUps.length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#9a9585] font-semibold px-4 py-2 uppercase tracking-wider bg-[#252419]">
                      📅 Overdue Follow-ups
                    </p>
                    {data.followUps.map(item => {
                      const days = differenceInDays(new Date(), parseISO(item.follow_up_date))
                      const isSeen = seen.has(item.id)
                      return (
                        <button key={item.id} onClick={() => handleNavigate('/leads', item.id)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#252419] transition-colors border-b border-[#2e2d26] last:border-0 ${isSeen ? 'opacity-50' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#efeae2] truncate">{item.title}</p>
                            <p className="text-xs text-[#9a9585] truncate">{item.customerName}</p>
                            <p className="text-xs text-[#ef4444] mt-0.5">{days}d overdue</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Payment issues */}
                {data.payments.length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#9a9585] font-semibold px-4 py-2 uppercase tracking-wider bg-[#252419]">
                      💰 Payment Due
                    </p>
                    {data.payments.map(item => {
                      const isSeen = seen.has(item.id)
                      return (
                        <button key={item.id} onClick={() => handleNavigate(`/customers/${item.customer_id}`, item.id)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#252419] transition-colors border-b border-[#2e2d26] last:border-0 ${isSeen ? 'opacity-50' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#efeae2] truncate">{item.title}</p>
                            <p className="text-xs text-[#e6ab35] mt-0.5">Balance: {formatCurrency(item.balance)}</p>
                            <span className="text-[10px] bg-[#ef4444]/15 text-[#ef4444] px-1.5 py-0.5 rounded font-medium">{item.payment_status}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Past due projects */}
                {data.pastDue.length > 0 && (
                  <div>
                    <p className="text-[10px] text-[#9a9585] font-semibold px-4 py-2 uppercase tracking-wider bg-[#252419]">
                      ⚠️ Past End Date
                    </p>
                    {data.pastDue.map(item => {
                      const days = differenceInDays(new Date(), parseISO(item.end_date))
                      const isSeen = seen.has(item.id)
                      return (
                        <button key={item.id} onClick={() => handleNavigate(`/customers/${item.customer_id}`, item.id)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#252419] transition-colors border-b border-[#2e2d26] last:border-0 ${isSeen ? 'opacity-50' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#efeae2] truncate">{item.title}</p>
                            <p className="text-xs text-[#9a9585] truncate">{item.customerName}</p>
                            <p className="text-xs text-[#ef4444] mt-0.5">{days}d past due</p>
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
