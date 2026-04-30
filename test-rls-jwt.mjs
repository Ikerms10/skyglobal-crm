// Test RLS with a REAL user JWT
// Run with: node --env-file=.env.local test-rls-jwt.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Get Iker's user to generate a session
const IKER_ID = '7c66b7dc-22cf-44f8-af2f-40a4792a4d4b'

// Use admin.generateLink to get a token
const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
  type: 'magiclink',
  email: 'ikerms10@gmail.com',
})

if (linkError) {
  console.error('Failed to generate link:', linkError)
  process.exit(1)
}

// The link data contains the user info and properties
console.log('Generated magic link. Properties:', Object.keys(linkData.properties))

// The magic link needs to be "verified" to get a session
// Instead, let's try a direct approach: create a user client and
// use the admin API to get the user's current sessions

// Actually, let's use the admin API to directly get the JWT
// by calling the token endpoint with the magic link token

// Simpler approach: query with service role but SET the role to 'authenticated'
// and set the JWT claims to simulate Iker

// Actually, the SIMPLEST test: use the admin API to generate a session
const tokenUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`

// We don't know Iker's password, so let's just test the RLS function directly:
// If get_my_tenant_id() returns null for Iker, the RLS policy fails
console.log('\n--- Testing get_my_tenant_id() for Iker ---')

// Run as postgres via the service role
const { data: testTenant, error: testErr } = await adminClient.rpc('get_my_tenant_id')
console.log('get_my_tenant_id (service role):', testTenant, testErr?.message)

// The service role bypasses RLS but when it calls get_my_tenant_id(),
// auth.uid() returns NULL because the service role doesn't have a user context.
// This means the function always returns NULL for service role.

// For the BROWSER CLIENT, auth.uid() returns the user's actual ID
// because the JWT token contains the user ID.
// Let's verify the tenant_users table has the right row:
const { data: tuRows } = await adminClient
  .from('tenant_users')
  .select('*')
  .eq('user_id', IKER_ID)
console.log('tenant_users for Iker:', tuRows)

// And verify leads have the right tenant_id:
const { data: sampleLeads } = await adminClient
  .from('leads')
  .select('id, tenant_id, user_id')
  .is('deleted_at', null)
  .limit(3)
console.log('Sample leads:', sampleLeads)

// Now let's do the ULTIMATE test:
// Create an anonymous client with the ANON key and manually set the auth
// to use Iker's JWT. We can get Iker's JWT by using the admin API.

// Generate a new JWT for Iker via the admin API
const { data: userData, error: userErr } = await adminClient.auth.admin.getUserById(IKER_ID)
if (userErr) {
  console.error('Failed to get user:', userErr)
  process.exit(1)
}
console.log('\nIker user data:', userData.user.email, userData.user.role)

// Actually, we can create a proper session by using admin.generateLink
// and then verify the token. But that's complex. 
// The most reliable test: check if the RLS function works when called 
// with auth.uid() set to Iker's ID.
const checkSql = `
  SELECT get_my_tenant_id() as tenant_id
  FROM (SELECT set_config('request.jwt.claims', '{"sub": "${IKER_ID}"}', true)) _config
`
console.log('\nTo test RLS manually, run in Supabase SQL editor:')
console.log(`SET request.jwt.claims = '{"sub": "${IKER_ID}"}';`)
console.log(`SET role = 'authenticated';`)
console.log(`SELECT get_my_tenant_id();`)
console.log(`SELECT count(*) FROM leads WHERE deleted_at IS NULL;`)
console.log(`RESET role; RESET request.jwt.claims;`)
