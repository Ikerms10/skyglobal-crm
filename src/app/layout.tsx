import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SkyGlobal CRM',
  description: 'CRM for SkyGlobal Renovations painting contractor business',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-theme="dark">
      <body className={`${inter.className} min-h-screen`} style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
