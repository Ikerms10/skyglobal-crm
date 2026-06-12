import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/supabase'

// Service role client — bypasses RLS. Only use in server-side API routes.
// Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
