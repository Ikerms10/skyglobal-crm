import type { Metadata } from 'next'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import '@/styles/tokens.css'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export const metadata: Metadata = {
  title: 'SkyGlobal CRM',
  description: 'CRM for SkyGlobal Renovations painting contractor business',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div aria-hidden="true" className="paper-texture" />
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#FEFCF8',
                border: '1px solid #E0D5C7',
                borderRadius: '12px',
                color: '#1C1209',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '13px',
                boxShadow: '0 20px 60px rgba(28,18,9,0.15), 0 4px 20px rgba(28,18,9,0.08)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
