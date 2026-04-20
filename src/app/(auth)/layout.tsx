export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--c-canvas)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: '#1C1209' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--c-text-on-dark)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--c-text-1)' }}>SkyGlobal <span style={{ color: 'var(--c-gold)' }}>CRM</span></h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-text-4)' }}>SkyGlobal Renovations</p>
        </div>
        <div className="rounded-2xl p-8" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border-light)', boxShadow: 'var(--s-modal)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
