'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Target, Users, Briefcase, MoreHorizontal, BarChart2, Receipt, Settings, LogOut, X, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const primaryItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads',     label: 'Leads',     icon: Target },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/projects',  label: 'Projects',  icon: Briefcase },
]

const moreItems = [
  { href: '/invoices', label: 'Invoices', icon: ClipboardList },
  { href: '/expenses', label: 'Expenses', icon: Receipt },
  { href: '/reports',  label: 'Reports',  icon: BarChart2 },
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
      <nav
        className="mobile-nav-bar fixed bottom-0 left-0 right-0 z-40 flex h-16"
        style={{
          background: 'var(--c-sidebar)',
          borderTop: '1px solid var(--c-border)',
        }}
        aria-label="Mobile navigation"
      >
        {primaryItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{
                color: isActive ? 'var(--c-sage)' : 'var(--c-text-4)',
                textShadow: 'none',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em' }}>{label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
          style={{ color: isMoreActive ? 'var(--c-sage)' : 'var(--c-text-4)' }}
          aria-label="More navigation options"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em' }}>More</span>
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(28,18,9,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div
            className="animate-slide-up fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
            style={{
              background: 'var(--c-card)',
              border: '1px solid var(--c-border)',
              borderBottom: 'none',
              paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="More options"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--c-border-mid)' }} />
            </div>

            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--c-border)' }}
            >
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--c-text-1)',
                letterSpacing: '-0.01em',
              }}>
                More
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                style={{ color: 'var(--sg-text-3)', padding: 4 }}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 space-y-1">
              {moreItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                    style={{
                      background: isActive ? 'var(--sg-sky-dim)' : 'transparent',
                      color: isActive ? 'var(--sg-sky)' : 'var(--sg-text-1)',
                      border: isActive ? '1px solid var(--sg-border-bright)' : '1px solid transparent',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
                  </Link>
                )
              })}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                style={{
                  color: 'var(--sg-danger)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-danger-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span style={{ fontSize: 14, fontWeight: 500 }}>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
