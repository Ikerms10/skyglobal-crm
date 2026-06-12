import { redirect } from 'next/navigation'

// Proposals are hidden from navigation (2026-06) — page redirects until the
// feature returns. /proposals/new still works (linked from leads & projects).
export default function ProposalsPage() {
  redirect('/dashboard')
}
