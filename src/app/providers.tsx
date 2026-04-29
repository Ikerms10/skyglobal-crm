'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LanguageProvider } from '@/contexts/LanguageContext'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      // refetchOnWindowFocus disabled globally — Supabase Realtime already
      // invalidates affected keys on any row change, so window-focus refetches
      // only add redundant round-trips on every tab switch.
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    },
  }))
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
