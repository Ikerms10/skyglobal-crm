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
    follow_up: 'text-[#e6ab35]',
    overdue_payment: 'text-[#ef4444]',
    late_project: 'text-[#ef4444]',
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 text-[#9a9585] hover:text-[#efeae2] transition-colors rounded-lg hover:bg-[#2e2d26]"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-[#e6ab35] rounded-full text-[10px] font-bold text-[#1d1c17] flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-80 bg-[#252419] border border-[#2e2d26] rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2e2d26]">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[#9a9585] text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.map(notif => {
                  const Icon = icons[notif.type]
                  const color = colors[notif.type]
                  return (
                    <Link key={notif.id} href={notif.href} onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#2e2d26] transition-colors border-b border-[#2e2d26] last:border-0">
                      <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', color)} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white">{notif.title}</p>
                        <p className="text-xs text-[#9a9585] truncate">{notif.description}</p>
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
