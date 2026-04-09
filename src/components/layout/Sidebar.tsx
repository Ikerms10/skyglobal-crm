'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Briefcase, DollarSign, BarChart3, Settings, LogOut, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Target },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/expenses', label: 'Expenses', icon: DollarSign },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 flex flex-col bg-[#1a1d27] border-r border-[#2a2d3a] h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#2a2d3a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white">SkyGlobal</p>
            <p className="text-xs text-slate-500">Renovations CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-[#2a2d3a]'
              )}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-sky-400' : 'text-slate-500')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User / Sign out */}
      <div className="px-3 py-4 border-t border-[#2a2d3a]">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-slate-500 truncate">{userEmail}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-[#2a2d3a] transition-colors w-full"
        >
          <LogOut className="h-5 w-5 text-slate-500" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
