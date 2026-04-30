import { NextRequest, NextResponse } from 'next/server'

// GET /api/debug/check-policies?secret=iker-crm-fix-2026
// Queries the production DB for the actual RLS policies on the leads table
// Uses raw SQL via the Supabase Management API
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== (process.env.ADMIN_SECRET_KEY ?? 'iker-crm-fix-2026')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Query pg_catalog.pg_policies via PostgREST by creating a database function
  // Actually, we can use the SQL endpoint of the Supabase Management API
  // But that requires a different auth. Let's try a different approach:
  // Use the PostgREST "rpc" to call a one-off function.
  
  // Approach: Query information_schema instead
  const query = encodeURIComponent(`
    SELECT policyname, tablename, cmd, permissive, qual, with_check 
    FROM pg_catalog.pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('leads', 'customers', 'projects')
    ORDER BY tablename, policyname;
  `.trim())

  // Use the Supabase REST endpoint for RPC
  // We can't run raw SQL via PostgREST, but we CAN create a function
  // Let's try a simpler check: call get_my_tenant_id and query with anon key

  // Instead, let's try a workaround: query the leads table with service key
  // to verify what we can see, and then create a function to expose policies.
  
  // Simplest: create a pg function via the service role that returns policies
  const createFnRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rls_policies`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  
  const fnResult = await createFnRes.text()
  
  // If function doesn't exist, we need to create it first
  // The Supabase SQL editor is the only way to run raw SQL remotely
  // unless we have direct DB access or use supabase-js SQL functions
  
  return NextResponse.json({ 
    ok: true,
    rpc_check_result: fnResult,
    rpc_status: createFnRes.status,
    note: "If rpc returns 404, the function doesn't exist. Use Supabase SQL editor to check policies.",
    manual_check: {
      instructions: "Run this in Supabase SQL editor (dashboard.supabase.com):",
      sql: "SELECT policyname, tablename, cmd, permissive, qual, with_check FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename = 'leads';"
    }
  })
}
