import { redirect } from 'next/navigation'

// Invoices are hidden from navigation (2026-06) — page redirects until the
// feature returns. Components and /invoices/new remain in the codebase.
export default function InvoicesPage() {
  redirect('/dashboard')
}
