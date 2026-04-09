import { redirect } from 'next/navigation'

// Registration is disabled — accounts are created via Supabase dashboard only
export default function RegisterPage() {
  redirect('/login')
}
