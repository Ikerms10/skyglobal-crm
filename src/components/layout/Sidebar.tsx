'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Briefcase, DollarSign, BarChart3,
  Settings, LogOut, Target, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/daily', label: 'Daily', icon: CalendarDays },
  { href: '/leads', label: 'Leads', icon: Target },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/projects', label: 'Projects', icon: Briefcase },
]
const businessNav = [
  { href: '/expenses', label: 'Expenses', icon: DollarSign },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]
const accountNav = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

function NavSection({ label, items, pathname }: { label: string; items: typeof mainNav; pathname: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 12px 4px' }}>
        {label}
      </p>
      {items.map(({ href, label: itemLabel, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
        return (
          <Link key={href} href={href}
            className={cn('flex items-center gap-2.5 mx-1 rounded-xl transition-all duration-100', isActive ? '' : 'hover:bg-[var(--bg-elevated)]')}
            style={{
              padding: '8px 12px',
              fontSize: 14,
              fontWeight: isActive ? 600 : 450,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--bg-surface)' : 'transparent',
              marginBottom: 1,
            }}>
            <Icon size={16} strokeWidth={isActive ? 2 : 1.5} style={{ color: isActive ? 'var(--gold)' : 'var(--text-tertiary)', flexShrink: 0 }} />
            {itemLabel}
          </Link>
        )
      })}
    </div>
  )
}

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

  const initials = (userEmail[0] ?? 'U').toUpperCase()

  return (
    <aside style={{
      width: 240,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border-subtle)',
    }}>
      {/* Logo */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="SkyGlobal"
            width={36}
            height={36}
            style={{ objectFit: 'contain', flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>SkyGlobal</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1 }}>CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <NavSection label="Main" items={mainNav} pathname={pathname} />
        <NavSection label="Business" items={businessNav} pathname={pathname} />
        <NavSection label="Account" items={accountNav} pathname={pathname} />
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)' }}>
        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', marginBottom: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#1d1c17', flexShrink: 0,
          }}>
            {initials}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </p>
        </div>

        <button onClick={handleSignOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, padding: '7px', borderRadius: 10,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--error)', fontSize: 12,
          }}
          className="hover:bg-[var(--error-light)] transition-colors">
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
