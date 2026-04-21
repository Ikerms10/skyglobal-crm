'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Briefcase, BarChart2,
  Settings, LogOut, Target, CalendarCheck, FileText, Receipt,
  Calendar, TrendingUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const mainNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads',     label: 'Leads',     icon: Target },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/projects',  label: 'Projects',  icon: Briefcase },
  { href: '/proposals', label: 'Proposals', icon: FileText },
  { href: '/daily',     label: 'Daily',     icon: CalendarCheck },
]
const businessNav = [
  { href: '/expenses',  label: 'Expenses',  icon: Receipt },
  { href: '/reports',   label: 'Reports',   icon: BarChart2 },
  { href: '/schedule',  label: 'Schedule',  icon: Calendar },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp },
]
const accountNav = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

function NavItem({ href, label, icon: Icon, pathname }: {
  href: string
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
  pathname: string
}) {
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 38,
        padding: isActive ? '0 12px 0 9.5px' : '0 12px',
        margin: '1px 8px',
        borderRadius: 7,
        fontSize: 13.5,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? 'var(--c-text-1)' : 'var(--c-text-sidebar)',
        textDecoration: 'none',
        overflow: 'hidden',
        transition: 'color 150ms',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        borderLeft: isActive ? '2.5px solid var(--c-sage)' : 'none',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--c-sidebar-hover)'
          e.currentTarget.style.color = 'var(--c-text-1)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--c-text-sidebar)'
        }
      }}
    >
      {/* Framer Motion animated active background */}
      {isActive && (
        <motion.div
          layoutId="nav-active-bg"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 7,
            background: 'var(--c-sidebar-active)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}

      <Icon
        size={17}
        strokeWidth={isActive ? 2 : 1.5}
        style={{ color: isActive ? 'var(--c-sage)' : 'var(--c-text-4)', flexShrink: 0, position: 'relative', zIndex: 1 }}
      />
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', position: 'relative', zIndex: 1 }}>
        {label}
      </span>
    </Link>
  )
}

function NavSection({ label, items, pathname }: { label: string; items: typeof mainNav; pathname: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <p style={{
        fontSize: 9,
        fontWeight: 600,
        color: 'var(--c-text-4)',
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        padding: '10px 20px 4px',
        fontFamily: "'DM Mono', monospace",
        margin: 0,
      }}>
        {label}
      </p>
      {items.map(item => (
        <NavItem key={item.href} {...item} pathname={pathname} />
      ))}
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
      background: 'var(--c-sidebar)',
      borderRight: '1px solid var(--c-border)',
      boxShadow: '1px 0 0 var(--c-border-light)',
      position: 'relative',
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 16px 14px',
        borderBottom: '1px solid var(--c-border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* SkyGlobal logo */}
          <div style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: '#FFFFFF',
            borderRadius: 8,
            boxShadow: 'var(--s-sidebar-logo)',
            overflow: 'hidden',
          }}>
            <img src="/skyglobal-logo.svg" width="30" height="30" alt="SkyGlobal" style={{ objectFit: 'contain' }} />
          </div>
          <div>
            <p style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--c-text-1)',
              lineHeight: 1.1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              letterSpacing: '-0.03em',
              margin: 0,
            }}>
              SkyGlobal
            </p>
            <p style={{
              fontSize: 9,
              color: 'var(--c-text-4)',
              lineHeight: 1,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              margin: 0,
            }}>
              CRM
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }} aria-label="Main navigation">
        <NavSection label="Main"     items={mainNav}     pathname={pathname} />
        <NavSection label="Business" items={businessNav} pathname={pathname} />
        <NavSection label="Account"  items={accountNav}  pathname={pathname} />
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--c-border)',
        flexShrink: 0,
      }}>
        {/* User row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          marginBottom: 4,
          borderRadius: 8,
          background: 'var(--c-sidebar-active)',
          border: '1px solid var(--c-border)',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--c-gold), var(--c-gold-mid))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--c-text-on-gold)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 2px 8px var(--c-gold-shadow)',
            }}>
              {initials}
            </div>
            {/* Online indicator */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--c-sage)',
                border: '1.5px solid var(--c-sidebar)',
              }}
              aria-label="Online"
            />
          </div>
          <p style={{
            fontSize: 11,
            color: 'var(--c-text-4)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            margin: 0,
            fontFamily: "'DM Mono', monospace",
          }}>
            {userEmail}
          </p>
        </div>

        <button
          onClick={handleSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '7px',
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--c-danger)',
            fontSize: 11,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'color 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
          aria-label="Sign out"
        >
          <LogOut size={12} aria-hidden="true" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
