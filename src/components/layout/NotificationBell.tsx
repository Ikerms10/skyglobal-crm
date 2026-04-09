'use client'
import { useState } from 'react'
import { Bell, AlertCircle, Clock, CreditCard } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useNotifications()
  const count = notifications.length

  const icons = {
    follow_up: Clock,
    overdue_payment: CreditCard,
    late_project: AlertCircle,
  }

  const colors = {
    follow_up: 'text-yellow-400',
    overdue_payment: 'text-red-400',
    late_project: 'text-orange-400',
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-[#2a2d3a]"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-80 bg-[#1a1d27] border border-[#2a2d3a] rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2d3a]">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-slate-400 text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map(notif => {
                  const Icon = icons[notif.type]
                  const color = colors[notif.type]
                  return (
                    <Link key={notif.id} href={notif.href} onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#2a2d3a] transition-colors border-b border-[#2a2d3a] last:border-0">
                      <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', color)} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white">{notif.title}</p>
                        <p className="text-xs text-slate-400 truncate">{notif.description}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
