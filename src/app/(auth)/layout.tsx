import { PLATFORM } from '@/lib/constants';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--c-canvas)' }}>
      <div className="w-full max-w-md">

        {/* Platform header — "Iker's CRM & Business Dashboard" */}
        <div className="text-center mb-8">
          {/* Icon mark */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: '#1C1209' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--c-gold)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>

          {/* Platform name: "Iker's CRM" */}
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: 'var(--c-text-1)',
              letterSpacing: '-0.025em',
              margin: 0,
              lineHeight: 1.1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Iker's{' '}
            <span style={{ color: 'var(--c-gold)' }}>CRM</span>
          </h1>

          {/* Subtitle: "& Business Dashboard" */}
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--c-text-4)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginTop: 4,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            &amp; Business Dashboard
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'var(--c-card)',
            border: '1px solid var(--c-border-light)',
            boxShadow: 'var(--s-modal)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
