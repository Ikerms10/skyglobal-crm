import { redirect } from 'next/navigation'

// Tenant administration was removed in the single-tenant simplification
// (2026-06) — the app now serves only SkyGlobal Renovations.
export default function AdminPage() {
  redirect('/dashboard')
}
