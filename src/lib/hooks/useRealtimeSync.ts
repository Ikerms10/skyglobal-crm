'use client'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getKeysForTable } from '@/lib/queryKeys'

const WATCHED_TABLES = [
  'leads',
  'projects',
  'expenses',
  'project_expenses',
  'invoices',
  'proposals',
  'customers',
  'schedule_events',
] as const

// Subscribes to Supabase Realtime postgres_changes for every core table and
// invalidates all dependent React Query caches whenever a row is inserted,
// updated, or deleted — on any device or browser tab.
//
// NOTE: Each table must be added to the Supabase realtime publication.
// Run the migration at supabase/migrations/20260427_enable_realtime.sql.
export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase.channel('crm-global-sync')

    for (const table of WATCHED_TABLES) {
      channel.on(
        'postgres_changes' as Parameters<typeof channel.on>[0],
        { event: '*', schema: 'public', table },
        () => {
          for (const key of getKeysForTable(table)) {
            queryClient.invalidateQueries({ queryKey: key })
          }
        },
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
