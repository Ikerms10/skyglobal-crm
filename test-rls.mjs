// Quick test: simulate what the browser Supabase client does
// Run with: node --env-file=.env.local test-rls.mjs

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Step 1: Generate a JWT for Iker using admin API  
const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'magiclink',
    email: 'ikerms10@gmail.com',
  }),
})
const adminData = await adminRes.json()
console.log('Admin generate link status:', adminRes.status)

// Step 2: Try to sign in with email/password to get a session
// But we don't have the password, so let's use a different approach.
// Let's use the admin API to get the user ID and create a custom JWT
const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=10`, {
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  },
})
const listData = await listRes.json()
const iker = listData.users?.find(u => u.email === 'ikerms10@gmail.com')
console.log('Iker user ID:', iker?.id)
console.log('Iker role:', iker?.role)

// Step 3: Query leads with anon key (no user JWT)
console.log('\n--- Query with ANON key (no JWT) ---')
const anonRes = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=id,title&deleted_at=is.null&limit=3`, {
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
  },
})
console.log('Status:', anonRes.status)
const anonData = await anonRes.json()
console.log('Result:', JSON.stringify(anonData).substring(0, 200))

// Step 4: Query leads with SERVICE ROLE key
console.log('\n--- Query with SERVICE_ROLE key ---')
const svcRes = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=id,title&deleted_at=is.null&limit=3`, {
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  },
})
console.log('Status:', svcRes.status)
const svcData = await svcRes.json()
console.log('Result:', JSON.stringify(svcData).substring(0, 200))

// Step 5: Check if RLS is actually enabled
console.log('\n--- RLS enabled check ---')
const rlsRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_tenant_id`, {
  method: 'POST',
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: '{}',
})
console.log('get_my_tenant_id with ANON key:', await rlsRes.text())

// Step 6: Check Iker's session
// The browser uses createBrowserClient which stores tokens in cookies/localStorage
// When getUser() is called, it sends the access_token as Bearer
// That access_token IS the user JWT, which Postgres uses for auth.uid()
// If the token is expired, getUser() refreshes it via the refresh_token

console.log('\n=== DIAGNOSIS ===')
console.log('If anon key returns [] and service_role returns leads,')
console.log('then RLS is working but the user JWT is not being sent.')
console.log('The browser client SHOULD automatically include the JWT.')
console.log('Check: does the browser console show "[Leads] No authenticated user found"?')
console.log('If yes, the auth session in the browser is invalid/expired.')
console.log('If the console shows "[Leads] Loaded 0 leads", then auth works but RLS blocks.')
