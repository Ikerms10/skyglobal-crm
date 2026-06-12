import { redirect } from 'next/navigation'

// Public signup created new tenants — removed in the single-tenant
// simplification (2026-06). Accounts are managed in the Supabase dashboard.
export default function SignupPage() {
  redirect('/login')
}
