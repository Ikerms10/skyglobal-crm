'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Target, Users, Briefcase, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Target },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#252419] border-t border-[#2e2d26] z-40 flex">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link key={href} href={href} className={cn('flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors', isActive ? 'text-[#e6ab35]' : 'text-[#9a9585]')}>
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
