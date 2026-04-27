'use client'
import { useRealtimeSync } from '@/lib/hooks/useRealtimeSync'

// Mounts the global Supabase Realtime sync inside the dashboard layout.
// Renders nothing — exists only to run the sync hook at the layout level
// so it's active on every dashboard page.
export function RealtimeSync() {
  useRealtimeSync()
  return null
}
