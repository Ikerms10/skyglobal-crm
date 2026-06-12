import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Module-level singleton — createBrowserClient sets up auth state listeners and
// a Realtime connection, so creating a new instance on every call wastes
// connections and memory across 127+ call sites.
// NOTE: annotated as SupabaseClient, not ReturnType<typeof createBrowserClient> —
// ReturnType of the uninstantiated generic collapses to a degenerate client type
// that breaks result inference (TS7006) at every query call site.
let client: SupabaseClient | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}
