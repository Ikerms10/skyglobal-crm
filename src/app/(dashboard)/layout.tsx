import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { GlobalSearch } from '@/components/layout/GlobalSearch'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar userEmail={user.email ?? ''} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-[#2a2d3a] bg-[#0f1117] sticky top-0 z-30 flex-shrink-0">
          <div className="md:hidden">
            <span className="font-bold text-sky-400 text-lg">SkyGlobal</span>
          </div>
          <div className="flex-1">
            <GlobalSearch />
          </div>
          <NotificationBell />
          <div className="h-8 w-8 rounded-full bg-sky-700 flex items-center justify-center text-xs font-bold text-white">
            {(user.email ?? 'U')[0].toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileNav />
      </div>
    </div>
  )
}
