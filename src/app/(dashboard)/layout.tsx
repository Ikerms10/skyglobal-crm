import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { RealtimeSync } from '@/components/layout/RealtimeSync'
import { TenantProvider } from '@/contexts/TenantContext'
import { MobileBusinessName } from '@/components/layout/MobileBusinessName'
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { TrialBanner } from '@/components/layout/TrialBanner'
import { SuspendedGuard } from '@/components/layout/SuspendedGuard'
import { AdminGuard } from '@/components/layout/AdminGuard'
import { AdminViewHandler } from '@/components/layout/AdminViewHandler'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <TenantProvider>
    <div
      className="flex overflow-hidden"
      style={{ height: '100dvh', background: 'var(--c-canvas)', position: 'relative' }}
    >
      {/* Desktop Sidebar */}
      <div className="hidden md:flex" style={{ position: 'relative', zIndex: 10 }}>
        <Sidebar userEmail={user.email ?? ''} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0" style={{ position: 'relative', zIndex: 10 }}>
        <ImpersonationBanner />
        <TrialBanner />
        {/* Top header */}
        <header
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 16px',
            background: 'var(--c-topnav)',
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            borderBottom: '1px solid var(--c-border)',
            boxShadow: 'var(--s-topnav)',
            position: 'sticky',
            top: 0,
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          <div className="md:hidden">
            <MobileBusinessName />
          </div>
          <div className="flex-1">
            <GlobalSearch />
          </div>
          <NotificationBell />
          <div
            style={{
              height: 32,
              width: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--c-gold), var(--c-gold-mid))',
              border: '1px solid var(--c-gold-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--c-text-on-gold)',
              flexShrink: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 2px 8px var(--c-gold-shadow)',
            }}
          >
            {(user.email ?? 'U')[0].toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto md:pb-0"
          style={{
            paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <AdminGuard />
          <Suspense fallback={null}><AdminViewHandler /></Suspense>
          <RealtimeSync />
          <SuspendedGuard>{children}</SuspendedGuard>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileNav />
      </div>

      {/* Floating action button */}
      <FloatingActionButton />
    </div>
    </TenantProvider>
  )
}

