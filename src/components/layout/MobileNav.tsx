'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Target, Users, Briefcase, MoreHorizontal, BarChart3, DollarSign, Settings, LogOut, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const primaryItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Target },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/projects', label: 'Projects', icon: Briefcase },
]

const moreItems = [
  { href: '/expenses', label: 'Expenses', icon: DollarSign },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = ['/expenses', '/reports', '/settings'].some(p => pathname.startsWith(p))

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Signed out')
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-[#252419] border-t border-[#2e2d26] z-40 flex h-16 safe-bottom">
        {primaryItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link key={href} href={href}
              className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                isActive ? 'text-[#e6ab35]' : 'text-[#9a9585]')}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn('flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
            isMoreActive ? 'text-[#e6ab35]' : 'text-[#9a9585]')}>
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* More Sheet */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-[#252419] border-t border-[#2e2d26] z-50 rounded-t-2xl pb-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2d26]">
              <span className="text-sm font-semibold text-white">More</span>
              <button onClick={() => setMoreOpen(false)} className="text-[#9a9585] p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {moreItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                    className={cn('flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                      isActive ? 'bg-[#e6ab35]/10 text-[#e6ab35]' : 'text-[#efeae2] hover:bg-[#2e2d26]')}>
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                )
              })}
              <button onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
